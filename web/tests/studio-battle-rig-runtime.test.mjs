import test from "node:test";
import assert from "node:assert/strict";
import { createPhaserSkeletalRig } from "../game/studio/phaserSkeletalRig.mjs";
import { transformRigHitboxToWorld, transformRigPointToWorld } from "../game/studio/skeletalWorldTransform.mjs";
import { circleIntersectsConvexPolygon, convexPolygonsOverlap } from "../game/studio/skeletalCollision.mjs";

class FakeContainer {
  constructor(x = 0, y = 0) {
    this.x = x; this.y = y; this.rotation = 0; this.scaleX = 1; this.scaleY = 1;
    this.active = true; this.children = []; this.listeners = new Map();
  }
  add(child) { this.children.push(child); return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setRotation(value) { this.rotation = value; return this; }
  setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
  setVisible(value) { this.visible = value; return this; }
  once(event, callback) { this.listeners.set(event, callback); return this; }
}
class FakeImage {
  constructor(key, frame) { this.key = key; this.frame = frame; }
  setOrigin(x, y) { this.originX = x; this.originY = y; return this; }
}
function makeScene() {
  return {
    add: {
      container: (x, y) => new FakeContainer(x, y),
      image: (x, y, key, frame) => new FakeImage(key, frame)
    },
    textures: {
      exists: () => true,
      get: () => ({ get: () => ({ width: 64, height: 64 }) })
    }
  };
}
function makeRig(scene) {
  const profile = {
    version: 1,
    canvas: { width: 128, height: 128 },
    bones: [
      { id: "body", name: "Body", parentId: null, x: 0, y: 0, pivot: { x: 32, y: 32 }, part: { assetId: "body", frame: 0 } },
      { id: "arm", name: "Arm", parentId: "body", x: 20, y: 0, pivot: { x: 8, y: 8 }, part: { assetId: "arm", frame: 0 } }
    ],
    attachments: [{ id: "muzzle", name: "Muzzle", boneId: "arm", x: 24, y: 0 }],
    hitboxes: [
      { id: "attack", boneId: "arm", x: 16, y: 0, width: 20, height: 12, kind: "attack" },
      { id: "hurt", boneId: "body", x: 0, y: 0, width: 40, height: 40, kind: "hurt" }
    ],
    clips: [
      { id: "idle", name: "Idle", durationMs: 1000, fps: 24, loop: true, tracks: [
        { boneId: "arm", keyframes: [{ timeMs: 0, x: 20, y: 0, rotation: 0 }, { timeMs: 1000, x: 20, y: 0, rotation: 0 }] }
      ] },
      { id: "attack", name: "Attack", durationMs: 500, fps: 24, loop: false, tracks: [
        { boneId: "arm", keyframes: [{ timeMs: 0, x: 20, y: 0, rotation: 0 }, { timeMs: 500, x: 20, y: 0, rotation: 60 }] }
      ] }
    ]
  };
  const rig = createPhaserSkeletalRig(scene, profile, { body: "body-texture", arm: "arm-texture" });
  rig.play("idle", 0);
  return rig;
}

test("real Phaser skeletal rig adapter builds part containers and moves attachments with animation poses", () => {
  const rig = makeRig(makeScene());
  assert.equal(rig.root.children.length, 1);
  assert.equal(rig.root.children[0].children[0].key, "body-texture");
  const idleMuzzle = rig.getAttachment("muzzle");
  rig.play("attack", 250);
  const attackMuzzle = rig.getAttachment("muzzle");
  assert.notDeepEqual(
    { x: attackMuzzle.x, y: attackMuzzle.y },
    { x: idleMuzzle.x, y: idleMuzzle.y },
    "animated arm pose must move the muzzle attachment"
  );
});

test("plant attack hitboxes, monster hurtboxes, and projectile circles collide in world space", () => {
  const scene = makeScene();
  const plantRig = makeRig(scene);
  const monsterRig = makeRig(scene);
  const plantView = { x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, active: true };
  const monsterView = { x: 140, y: 100, rotation: 0, scaleX: 1, scaleY: 1, active: true };
  const attack = transformRigHitboxToWorld(plantRig.getHitbox("attack"), plantView);
  const hurt = transformRigHitboxToWorld(monsterRig.getHitbox("hurt"), monsterView);
  assert.equal(convexPolygonsOverlap(attack.points, hurt.points), true);
  assert.equal(circleIntersectsConvexPolygon({ x: 140, y: 100, radius: 5 }, hurt.points), true);
  assert.equal(circleIntersectsConvexPolygon({ x: 220, y: 100, radius: 5 }, hurt.points), false);
});

test("muzzle attachment is transformed through the Phaser parent view before projectile launch", () => {
  const rig = makeRig(makeScene());
  const parentView = { x: 100, y: 200, rotation: 0, scaleX: 1.5, scaleY: 1.5, active: true };
  const worldPoint = transformRigPointToWorld(rig.getAttachment("muzzle"), parentView);
  assert.ok(Number.isFinite(worldPoint.x) && Number.isFinite(worldPoint.y));
  assert.ok(worldPoint.x > parentView.x);
  assert.equal(worldPoint.y, parentView.y);
});
