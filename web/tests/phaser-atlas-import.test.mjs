import test from "node:test";
import assert from "node:assert/strict";
import { readPngDimensions, validatePhaserAtlasDocument } from "../game/studio/phaserAtlas.mjs";

const sample = {
  frames: {
    "idle_00": { frame: { x: 0, y: 0, w: 150, h: 150 }, rotated: false, trimmed: false },
    "idle_01": { frame: { x: 150, y: 0, w: 150, h: 150 }, rotated: false, trimmed: false },
    "attack_00": { frame: { x: 300, y: 0, w: 150, h: 150 }, rotated: false, trimmed: false },
    "hurt_00": { frame: { x: 450, y: 0, w: 150, h: 150 }, rotated: false, trimmed: false }
  },
  meta: { image: "hero.png", size: { w: 600, h: 150 }, scale: "1" }
};

test("validates Phaser hash atlases and groups named animation frames", () => {
  const result = validatePhaserAtlasDocument(sample);
  assert.equal(result.valid, true);
  assert.equal(result.frameCount, 4);
  assert.deepEqual(result.clips, { idle: ["idle_00", "idle_01"], attack: ["attack_00"], hurt: ["hurt_00"] });
});

test("accepts Phaser array atlases and frame names", () => {
  const result = validatePhaserAtlasDocument({
    frames: [{ filename: "walk_00", frame: { x: 0, y: 0, w: 20, h: 20 } }],
    meta: { image: "hero.png" }
  });
  assert.equal(result.valid, true);
  assert.equal(result.format, "array");
  assert.deepEqual(result.frameNames, ["walk_00"]);
});

test("rejects malformed JSON, missing frames, duplicate names, and unsafe rectangles", () => {
  assert.equal(validatePhaserAtlasDocument("{").valid, false);
  assert.equal(validatePhaserAtlasDocument({ frames: {}, meta: {} }).valid, false);
  const invalid = validatePhaserAtlasDocument({
    frames: {
      "bad/name_00": { frame: { x: -1, y: 0, w: 0, h: 10 } }
    },
    meta: { image: "../outside.png" }
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 2);
});

test("rejects atlas files that exceed the frame limit", () => {
  const frames = Object.fromEntries(Array.from({ length: 513 }, (_, i) => ["frame_" + i, { frame: { x: 0, y: 0, w: 1, h: 1 } }]));
  assert.ok(validatePhaserAtlasDocument({ frames, meta: {} }).errors.some(message => message.includes("512")));
});

test("checks atlas frame bounds and meta dimensions against the PNG header", () => {
  const png = new Uint8Array(24);
  png.set([0x89, 0x50, 0x4e, 0x47], 0);
  new DataView(png.buffer).setUint32(16, 600, false);
  new DataView(png.buffer).setUint32(20, 150, false);
  assert.deepEqual(readPngDimensions(png), { width: 600, height: 150 });
  assert.equal(validatePhaserAtlasDocument(sample, { width: 600, height: 150 }).valid, true);
  assert.equal(validatePhaserAtlasDocument(sample, { width: 300, height: 150 }).valid, false);
  const outside = { frames: { edge: { frame: { x: 590, y: 0, w: 20, h: 10 } } }, meta: { size: { w: 600, h: 150 } } };
  assert.ok(validatePhaserAtlasDocument(outside).errors.some(message => message.includes("يتجاوز حدود")));
});

test("accepts Phaser JSONHash atlases when the optional meta block is absent", () => {
  const result = validatePhaserAtlasDocument({
    frames: {
      "idle_00": { frame: { x: 0, y: 0, w: 150, h: 150 } },
      "idle_01": { frame: { x: 150, y: 0, w: 150, h: 150 } }
    }
  }, { width: 300, height: 150 });
  assert.equal(result.valid, true);
  assert.deepEqual(result.clips, { idle: ["idle_00", "idle_01"] });
});
