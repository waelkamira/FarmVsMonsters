import test from "node:test";
import assert from "node:assert/strict";
import { suggestRigTemplateRetarget } from "../game/studio/rigTemplateRetarget.mjs";

const template = {
  source: { assetId: "plant-template" },
  canvas: { width: 100, height: 100 },
  parts: [
    { id: "stem", role: "stem", bounds: { x: 40, y: 20, width: 20, height: 70 }, pivot: { x: 50, y: 88 }, drawOrder: 1 },
    { id: "leaf-left", role: "leaf", side: "left", bounds: { x: 10, y: 35, width: 30, height: 20 }, pivot: { x: 35, y: 48 }, parentPartId: "stem", drawOrder: 2 },
    { id: "leaf-right", role: "leaf", side: "right", bounds: { x: 60, y: 35, width: 30, height: 20 }, pivot: { x: 65, y: 48 }, parentPartId: "stem", drawOrder: 3 }
  ]
};

test("retargets semantic roles one-to-one and transfers normalized pivots and hierarchy", () => {
  const targets = [
    { id: "new-stem", role: "stem", bounds: { x: 80, y: 40, width: 40, height: 140 } },
    { id: "new-left", role: "leaf", side: "left", bounds: { x: 20, y: 70, width: 60, height: 40 } },
    { id: "new-right", role: "leaf", side: "right", bounds: { x: 120, y: 70, width: 60, height: 40 } }
  ];
  const result = suggestRigTemplateRetarget(template, targets, { width: 200, height: 200 });
  assert.equal(result.matches.length, 3);
  const left = result.matches.find((match) => match.targetPartId === "new-left");
  assert.equal(left.update.parentPartId, "new-stem");
  assert.deepEqual(left.update.pivot, { x: 70, y: 96 });
  assert.equal(left.reviewRequired, true);
  assert.equal(result.requiresAuthorReview, true);
  assert.deepEqual(result.unmatchedTemplatePartIds, []);
  assert.deepEqual(result.unmatchedTargetPartIds, []);
});

test("does not cross-map explicit left and right semantic sides", () => {
  const result = suggestRigTemplateRetarget(template, [
    { id: "right-only", role: "leaf", side: "right", bounds: { x: 10, y: 35, width: 30, height: 20 } }
  ], { width: 100, height: 100 });
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].templatePartId, "leaf-right");
  assert.deepEqual(result.unmatchedTemplatePartIds, ["stem", "leaf-left"]);
});

test("reports unmatched template parents without inventing a hierarchy", () => {
  const result = suggestRigTemplateRetarget(template, [
    { id: "left", role: "leaf", side: "left", bounds: { x: 10, y: 35, width: 30, height: 20 } }
  ], { width: 100, height: 100 });
  assert.equal(result.matches[0].update.parentPartId, null);
  assert.match(result.matches[0].parentWarning, /automatic parent selection/);
});

test("rejects invalid dimensions, malformed bounds, and duplicate IDs", () => {
  assert.throws(() => suggestRigTemplateRetarget(template, [], { width: 100, height: 100 }), /1 and 63/);
  assert.throws(() => suggestRigTemplateRetarget(template, [{ id: "x", role: "body", bounds: { x: -1, y: 0, width: 2, height: 2 } }], { width: 100, height: 100 }), /fit inside/);
  assert.throws(() => suggestRigTemplateRetarget({ ...template, parts: [template.parts[0], template.parts[0]] }, [{ id: "x", role: "stem", bounds: { x: 0, y: 0, width: 10, height: 10 } }], { width: 100, height: 100 }), /unique/);
});


test("uses a global minimum-cost assignment for repeated semantic roles", () => {
  const repeatedTemplate = {
    canvas: { width: 100, height: 100 },
    parts: [
      { id: "leaf-a", role: "leaf", bounds: { x: 10, y: 10, width: 10, height: 10 } },
      { id: "leaf-b", role: "leaf", bounds: { x: 30, y: 10, width: 10, height: 10 } }
    ]
  };
  const repeatedTargets = [
    { id: "target-a", role: "leaf", bounds: { x: 20, y: 10, width: 10, height: 10 } },
    { id: "target-b", role: "leaf", bounds: { x: 5, y: 10, width: 10, height: 10 } }
  ];
  const result = suggestRigTemplateRetarget(repeatedTemplate, repeatedTargets, { width: 100, height: 100 });
  const pairs = new Map(result.matches.map((match) => [match.templatePartId, match.targetPartId]));
  assert.equal(pairs.get("leaf-a"), "target-b");
  assert.equal(pairs.get("leaf-b"), "target-a");
});
