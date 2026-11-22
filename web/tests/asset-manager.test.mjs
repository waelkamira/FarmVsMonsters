import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PhaserAssetManager } from "../game/services/assetManager.mjs";

function createScene(game = {}, sharedTextures = null, options = {}) {
  const loader = new EventEmitter();
  loader.queue = [];
  loader.failKeys = new Set(options.failKeys || []);
  loader.startCount = 0;
  loader.isLoading = () => false;
  loader.image = (key, url) => loader.queue.push({ key, url, type: "image" });
  loader.audio = (key, url) => loader.queue.push({ key, url, type: "audio" });
  loader.spritesheet = (key, url, frameConfig) => loader.queue.push({ key, url, type: "spritesheet", frameConfig });
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
  loader.start = () => {
    loader.startCount += 1;
    const complete = () => {
      for (const file of loader.queue.splice(0)) {
        if (loader.failKeys.has(file.key)) {
          loader.emit("loaderror", { key: file.key });
          continue;
        }
        scene.textures.keys.add(file.key);
        loader.emit("filecomplete", file.key);
      }
      loader.emit("progress", 1);
      loader.emit("complete");
    };
    if (options.deferStart) loader.completePending = complete;
    else complete();
  };
  return scene;
}

test("loads a manifest group once and skips already cached textures", async () => {
  const scene = createScene();
  const manager = new PhaserAssetManager(scene, {
    manifest: { groups: { plants: [{ key: "radish", url: "/assets/plants/radish.png", type: "image" }] } }
  });

  const first = await manager.loadGroup("plants");
  const second = await manager.loadGroup("plants");

  assert.deepEqual(first, { group: "plants", loaded: 1, skipped: 0 });
  assert.deepEqual(second, { group: "plants", loaded: 0, skipped: 1 });
  assert.equal(scene.textures.exists("radish"), true);
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

 
test("destroy removes loader observers and is safe to call more than once", () => {
  const scene = createScene();
  const manager = new PhaserAssetManager(scene);
  for (const event of ["progress", "filecomplete", "loaderror", "complete"]) {
    assert.equal(scene.load.listenerCount(event), 1);
  }

  manager.destroy();
  for (const event of ["progress", "filecomplete", "loaderror", "complete"]) {
    assert.equal(scene.load.listenerCount(event), 0);
  }
  manager.destroy();
  assert.equal(scene.load.listenerCount("progress"), 0);
});


test("rolls back successful siblings after a partial group failure and allows retry", async () => {
  const scene = createScene({}, null, { failKeys: ["broken"] });
  const manager = new PhaserAssetManager(scene, {
    manifest: {
      groups: {
        optional: [
          { key: "good", url: "/assets/good.png", type: "image" },
          { key: "broken", url: "/assets/broken.png", type: "image" }
        ]
      }
    }
  });

  await assert.rejects(manager.loadGroup("optional"), (error) => {
    assert.match(error.message, /broken/);
    assert.deepEqual(error.failedKeys, ["broken"]);
    return true;
  });
  assert.equal(scene.textures.exists("good"), false);
  assert.equal(scene.textures.exists("broken"), false);
  assert.deepEqual(manager.getStats().activeGroups, []);
  assert.equal(manager.getStats().referencedAssets, 0);

  scene.load.failKeys.clear();
  const retry = await manager.loadGroup("optional");
  assert.deepEqual(retry, { group: "optional", loaded: 2, skipped: 0 });
  assert.equal(scene.textures.exists("good"), true);
  assert.equal(scene.textures.exists("broken"), true);
  manager.destroy();
});

test("serializes concurrent managers that share a Phaser Game cache", async () => {
  const game = {};
  const textures = {
    keys: new Set(),
    exists(key) { return this.keys.has(key); },
    remove(key) { this.keys.delete(key); }
  };
  const manifest = {
    groups: { shared: [{ key: "shared-ui", url: "/assets/shared-ui.png", type: "image" }] }
  };
  const firstScene = createScene(game, textures);
  const secondScene = createScene(game, textures);
  const firstManager = new PhaserAssetManager(firstScene, { manifest });
  const secondManager = new PhaserAssetManager(secondScene, { manifest });

  const results = await Promise.all([
    firstManager.loadGroup("shared"),
    secondManager.loadGroup("shared")
  ]);
  assert.equal(results[0].loaded + results[1].loaded, 1);
  assert.equal(firstScene.load.startCount + secondScene.load.startCount, 1);

  firstManager.releaseGroup("shared");
  assert.equal(textures.exists("shared-ui"), true);
  secondManager.releaseGroup("shared");
  assert.equal(textures.exists("shared-ui"), false);
  firstManager.destroy();
  secondManager.destroy();
});

test("destroy during a load waits for completion and rolls back newly loaded assets", async () => {
  const scene = createScene({}, null, { deferStart: true });
  const manager = new PhaserAssetManager(scene, {
    manifest: {
      groups: {
        pending: [{ key: "late-texture", url: "/assets/late.png", type: "image" }]
      }
    }
  });

  const pendingLoad = manager.loadGroup("pending");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof scene.load.completePending, "function");

  manager.destroy();
  scene.load.completePending();
  await assert.rejects(pendingLoad, /Asset manager has been destroyed/);
  assert.equal(scene.textures.exists("late-texture"), false);
  assert.equal(manager.getStats().referencedAssets, 0);
  assert.equal(manager.scene, null);
});
