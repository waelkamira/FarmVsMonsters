import test from "node:test";
import assert from "node:assert/strict";
import { suggestAutoRigSemanticRoles } from "../game/studio/semanticRoleClassifier.mjs";

test("suggests a central body and side leaves for a plant without approving them", () => {
  const result = suggestAutoRigSemanticRoles([
    { id: "body", bounds: { x: 35, y: 30, width: 30, height: 55 } },
    { id: "leaf-left", bounds: { x: 5, y: 42, width: 25, height: 16 } },
    { id: "leaf-right", bounds: { x: 70, y: 42, width: 25, height: 16 } }
  ], { width: 100, height: 100 }, "plant");
  assert.equal(result.find((item) => item.proposalId === "body").role, "body");
  assert.equal(result.find((item) => item.proposalId === "leaf-left").role, "leaf.left");
  assert.equal(result.find((item) => item.proposalId === "leaf-right").role, "leaf.right");
  assert.ok(result.every((item) => item.confidence < 0.7));
});

test("suggests a head and lateral arms for a monster", () => {
  const result = suggestAutoRigSemanticRoles([
    { id: "body", bounds: { x: 30, y: 30, width: 40, height: 60 } },
    { id: "head", bounds: { x: 38, y: 5, width: 24, height: 20 } },
    { id: "arm", bounds: { x: 2, y: 42, width: 22, height: 18 } }
  ], { width: 100, height: 100 }, "monster");
  assert.equal(result.find((item) => item.proposalId === "head").role, "head");
  assert.equal(result.find((item) => item.proposalId === "arm").role, "arm.left");
});

test("rejects invalid canvas and out-of-bounds proposals", () => {
  assert.throws(() => suggestAutoRigSemanticRoles([], { width: 0, height: 10 }), /dimensions/);
  assert.throws(() => suggestAutoRigSemanticRoles([{ id: "bad", bounds: { x: -1, y: 0, width: 2, height: 2 } }], { width: 10, height: 10 }), /invalid source bounds/);
});
