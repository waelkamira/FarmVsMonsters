import test from "node:test";
import assert from "node:assert/strict";
import { createPhaserSkeletalRig } from "../game/studio/phaserSkeletalRig.mjs";

function createFakeScene(availableTextures = ["head-image"]) {
  const makeContainer = (x, y) => ({
    x, y, rotation: 0, scaleX: 1, scaleY: 1, children: [],
    add(child) { this.children.push(child); child.parent = this; return this; },
    setPosition(nextX, nextY) { this.x = nextX; this.y = nextY; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setScale(xScale, yScale) { this.scaleX = xScale; this.scaleY = yScale; return this; },
    setVisible(value) { this.visible = value; return this; },
    destroy(recursive) {
      this.destroyed = true;
      if (recursive) for (const child of this.children) child.destroy?.(true);
    }
  });
  const scene = {
    containersCreated: 0,
    add: {
      container(x, y) { scene.containersCreated += 1; return makeContainer(x, y); },
      image(x, y, key, frame) {
        return { x, y, key, frame, setOrigin(originX, originY) { this.origin = { x: originX, y: originY }; return this; } };
      }
    },
    textures: {
      exists(key) { return availableTextures.includes(key); },
      get(key) {
        if (!availableTextures.includes(key)) return null;
        return { get(frame) { return frame === 0 ? { width: 100, height: 80 } : null; } };
      }
    }
  };
  return scene;
}

function rigProfile() {
  return {
    version: 1,
    canvas: { width: 200, height: 200 },
    bones: [
      { id: "root", parentId: null, x: 0, y: 0 },
      { id: "head", parentId: "root", x: 20, y: 10, pivot: { x: 50, y: 40 }, part: { assetId: "head-part", frame: 0 } }
    ],
    attachments: [{ id: "muzzle", boneId: "head", x: 10, y: 0 }],
    hitboxes: [{ id: "bite", boneId: "head", x: 5, y: 0, width: 20, height: 10 }],
    clips: [{
      id: "attack", durationMs: 1000, loop: false,
      tracks: [{ boneId: "head", keyframes: [{ timeMs: 0, rotation: 0 }, { timeMs: 1000, rotation: 90 }] }]
    }]
  };
}

test("builds a nested Phaser container rig and applies evaluated local transforms", () => {
  const scene = createFakeScene();
  const rig = createPhaserSkeletalRig(scene, rigProfile(), { "head-part": "head-image" }, { x: 100, y: 50 });
  const pose = rig.play("attack", 500);
  assert.equal(pose.localBones.head.rotation, 45);
  const rootBone = rig.root.children[0];
  const headBone = rootBone.children[0];
  assert.ok(Math.abs(headBone.rotation - Math.PI / 4) < 0.001);
  assert.deepEqual(headBone.children[0].origin, { x: 0.5, y: 0.5 });
});

test("returns world-space muzzle and hitbox transforms from the rendered pose", () => {
  const rig = createPhaserSkeletalRig(createFakeScene(), rigProfile(), { "head-part": "head-image" }, { x: 100, y: 50 });
  rig.play("attack", 500);
  const muzzle = rig.getAttachment("muzzle");
  assert.ok(Math.abs(muzzle.x - (100 + 20 + 10 * Math.SQRT1_2)) < 0.001);
  assert.ok(Math.abs(muzzle.y - (50 + 10 + 10 * Math.SQRT1_2)) < 0.001);
  const hitbox = rig.getHitbox("bite");
  assert.equal(hitbox.width, 20);
  assert.equal(hitbox.kind, "attack");
});

test("rejects missing part textures before allocating Phaser containers", () => {
  const scene = createFakeScene([]);
  assert.throws(() => createPhaserSkeletalRig(scene, rigProfile()), /Missing loaded texture/);
  assert.equal(scene.containersCreated, 0);
});

test("requires an evaluated pose before resolving attachments and destroys safely", () => {
  const rig = createPhaserSkeletalRig(createFakeScene(), rigProfile(), { "head-part": "head-image" });
  assert.throws(() => rig.getAttachment("muzzle"), /Play or apply/);
  rig.play("attack", 0);
  rig.destroy();
  assert.equal(rig.root.destroyed, true);
  assert.throws(() => rig.play("attack", 100), /destroyed/);
});
