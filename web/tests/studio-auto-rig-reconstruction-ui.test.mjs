import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panel = await readFile(new URL("../app/studio/AutoRigBuilderPanel.jsx", import.meta.url), "utf8");

test("Studio supports author-marked hidden targets and visible donor polygons", () => {
  assert.match(panel, /function beginOcclusionMask\(partId\)/);
  assert.match(panel, /function beginDonorPolygon\(partId\)/);
  assert.match(panel, /function commitDonorPolygon\(\)/);
  assert.match(panel, /donorMask: \{ kind: "polygon", points: donorPoints \}/);
  assert.match(panel, /targetPolygon: part\.occlusionMask\.points/);
  assert.match(panel, /sourcePolygon: part\.donorMask\.points/);
});

test("reconstructed pixels are previewed, reviewed separately, and composited into the saved cutout", () => {
  assert.match(panel, /task: "visible-donor-reconstruction"/);
  assert.match(panel, /reconstructionPatch: \{ dataUrl: data\.patchDataUrl, targetBounds: data\.targetBounds \}/);
  assert.match(panel, /راجعْت بكسلات الجزء المنقول|راجعت بكسلات الجزء المنقول/);
  assert.match(panel, /reconstruction: \{ method: data\.provenance\.method/);
  assert.match(panel, /context\.drawImage\(reconstructedImage/);
  assert.match(panel, /pixels: "reconstructed"/);
});

test("Studio blocks rig generation while donor or hidden-region polygons are being authored", () => {
  assert.match(panel, /generated \|\| occlusionMode \|\| donorMode/);
  assert.match(panel, /occlusionMode \|\| donorMode \|\| !image/);
});
