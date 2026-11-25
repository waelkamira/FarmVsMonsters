import test from "node:test";
import assert from "node:assert/strict";
import { buildAtlasMetadata } from "../scripts/asset-atlas-metadata.mjs";

test("Phaser Atlas parser preserves clips, frame geometry and image bounds", () => {
  const frames = {};
  for (let index = 0; index < 24; index += 1) {
    const clip = index < 8 ? "idle" : index < 18 ? "attack" : "hurt";
    const clipIndex = index < 8 ? index : index < 18 ? index - 8 : index - 18;
    frames[`${clip}_${String(clipIndex).padStart(2, "0")}`] = {
      frame: { x: index * 150, y: 0, w: 150, h: 150 }
    };
  }
  const metadata = buildAtlasMetadata("plants/corn_monster.png", { frames }, { width: 3600, height: 150 });
  assert.equal(metadata.type, "spritesheet");
  assert.equal(metadata.frameCount, 24);
  assert.equal(metadata.rows, 1);
  assert.equal(metadata.columns, 24);
  assert.deepEqual(metadata.frameConfig, { frameWidth: 150, frameHeight: 150, margin: 0, spacing: 0 });
  assert.equal(metadata.atlasMetadataPath, "/assets/plants/corn_monster.json");
  assert.deepEqual(metadata.atlasClips, {
    idle: { startFrame: 0, endFrame: 7 },
    attack: { startFrame: 8, endFrame: 17 },
    hurt: { startFrame: 18, endFrame: 23 }
  });
  assert.throws(() => buildAtlasMetadata("plants/corn_monster.png", { frames }, { width: 1000, height: 150 }), /exceeds image bounds/);
});

test("Phaser Atlas parser rejects malformed frame geometry", () => {
  assert.throws(
    () => buildAtlasMetadata("bad.png", { frames: { idle_00: { frame: { x: -1, y: 0, w: 10, h: 10 } } } }, { width: 10, height: 10 }),
    /Invalid Phaser Atlas frame/
  );
});

test("non-uniform Phaser Atlas frames do not get an unsafe grid frameConfig", () => {
  const metadata = buildAtlasMetadata("parts.png", {
    frames: {
      part_00: { frame: { x: 0, y: 0, w: 20, h: 20 } },
      part_01: { frame: { x: 20, y: 0, w: 24, h: 20 } }
    }
  }, { width: 44, height: 20 });
  assert.equal(metadata.frameCount, 2);
  assert.equal(metadata.frameConfig, undefined);
});
