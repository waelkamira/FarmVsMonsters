import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PhaserAssetManager } from "../game/services/assetManager.mjs";

function createScene(game = {}, sharedTextures = null) {
  const loader = new EventEmitter();
  loader.queue = [];
  loader.isLoading = () => false;
  loader.image = (key, url) => loader.queue.push({ key, url, type: "image" });
  loader.audio = (key, url) => loader.queue.push({ key, url, type: "audio" });
  loader.spritesheet = (key, url, frameConfig) => loader.queue.push({ key, url, type: "spritesheet", frameConfig });
  loader.start = () => {
    for (const file of loader.queue.splice(0)) {
      scene.textures.keys.add(file.key);
      loader.emit("filecomplete", file.key);
    }
    loader.emit("progress", 1);
    loader.emit("complete");
  };
  const textures = sharedTextures || {
    keys: new Set(),
    exists(key) { return this.keys.has(key); },
    remove(key) { this.keys.delete(key); }
  };
  const scene = {
    game,
    load: loader,
    textures,
    cache: { audio: { exists: () => false, remove() {} } }
  };
  return scene;
}

test("loads a manifest group once and skips already cached textures", async () => {
  const scene = createScene();
  const manager = new PhaserAssetManager(scene, {
    manifest: { groups: { plants: [{ key: "radish-level-1", url: "/assets/plants/radish-level-1.png", type: "image" }] } }
  });

  const first = await manager.loadGroup("plants");
  const second = await manager.loadGroup("plants");

  assert.deepEqual(first, { group: "plants", loaded: 1, skipped: 0 });
  assert.deepEqual(second, { group: "plants", loaded: 0, skipped: 1 });
  assert.equal(scene.textures.exists("radish-level-1"), true);
  assert.equal(manager.getStats().referencedAssets, 1);
  manager.destroy();
});

test("releaseGroup removes only manager-owned textures after final release", async () => {
  const scene = createScene();
  const manager = new PhaserAssetManager(scene, {
    manifest: { groups: { ui: [{ key: "pause", url: "/assets/ui/pause.png", type: "image" }] } }
  });

  await manager.loadGroup("ui");
  manager.releaseGroup("ui");

  assert.equal(scene.textures.exists("pause"), false);
  assert.equal(manager.getStats().referencedAssets, 0);
  manager.destroy();
});

test("does not remove textures that were already present before manager loading", async () => {
  const scene = createScene();
  scene.textures.keys.add("shared");
  const manager = new PhaserAssetManager(scene, {
    manifest: { groups: { shared: [{ key: "shared", url: "/assets/shared.png", type: "image" }] } }
  });

  await manager.loadGroup("shared");
  manager.releaseGroup("shared");

  assert.equal(scene.textures.exists("shared"), true);
  manager.destroy();
});

test("requires frame metadata for spritesheets", async () => {
  const scene = createScene();
  const manager = new PhaserAssetManager(scene, {
    manifest: { groups: { animations: [{ key: "run", url: "/assets/run.png", type: "spritesheet" }] } }
  });

  await assert.rejects(manager.loadGroup("animations"), /has no frameConfig/);
  manager.destroy();
});

test("keeps a texture alive while another scene manager still references it", async () => {
  const game = {};
  const textures = {
    keys: new Set(),
    exists(key) { return this.keys.has(key); },
    remove(key) { this.keys.delete(key); }
  };
  const manifest = { groups: { shared: [{ key: "farm-ui", url: "/assets/ui/farm.png", type: "image" }] } };
  const firstScene = createScene(game, textures);
  const secondScene = createScene(game, textures);
  const firstManager = new PhaserAssetManager(firstScene, { manifest });
  const secondManager = new PhaserAssetManager(secondScene, { manifest });

  await firstManager.loadGroup("shared");
  await secondManager.loadGroup("shared");
  firstManager.releaseGroup("shared");
  assert.equal(textures.exists("farm-ui"), true);
  secondManager.releaseGroup("shared");
  assert.equal(textures.exists("farm-ui"), false);

  firstManager.destroy();
  secondManager.destroy();
});
