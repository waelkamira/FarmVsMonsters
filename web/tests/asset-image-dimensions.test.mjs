import test from "node:test";
import assert from "node:assert/strict";
import { svgImageDimensions } from "../scripts/asset-image-dimensions.mjs";

test("SVG viewBox supplies independent width and height dimensions", () => {
  assert.deepEqual(svgImageDimensions(Buffer.from('<svg viewBox="0 0 96 48"></svg>')), {
    width: 96,
    height: 48
  });
});

test("SVG explicit width and height are not confused", () => {
  assert.deepEqual(svgImageDimensions(Buffer.from('<svg width="64" height="32" xmlns="http://www.w3.org/2000/svg"></svg>')), {
    width: 64,
    height: 32
  });
});

test("SVG dimension parser rejects missing, zero, and invalid dimensions", () => {
  assert.equal(svgImageDimensions(Buffer.from("<svg></svg>")), null);
  assert.equal(svgImageDimensions(Buffer.from('<svg width="64" height="0"></svg>')), null);
  assert.equal(svgImageDimensions("<svg width='64' height='32'></svg>"), null);
});
