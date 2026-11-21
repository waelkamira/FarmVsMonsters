import test from "node:test";
import assert from "node:assert/strict";
import { imageDimensions } from "../scripts/asset-image-dimensions.mjs";

test("SVG fallback dimensions preserve distinct width and height attributes", () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320px" height="180px"><rect width="320" height="180"/></svg>');
  assert.deepEqual(imageDimensions(svg, ".svg"), { width: 320, height: 180 });
});

test("SVG viewBox dimensions take precedence over display dimensions", () => {
  const svg = Buffer.from('<svg width="640" height="360" viewBox="0 0 320 180"></svg>');
  assert.deepEqual(imageDimensions(svg, ".svg"), { width: 320, height: 180 });
});

test("SVG metadata ignores dimensions found only in unrelated attributes", () => {
  const svg = Buffer.from('<svg stroke-width="4"><path d="M0 0"/></svg>');
  assert.equal(imageDimensions(svg, ".svg"), null);
});
