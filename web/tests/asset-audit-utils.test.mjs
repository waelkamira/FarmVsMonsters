import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssetAudit,
  classifyLargeAssets,
  DEFAULT_ASSET_AUDIT_THRESHOLDS,
  summarizeAssetGroups
} from "../scripts/asset-audit-utils.mjs";

test("large asset classification uses strict image and audio thresholds", () => {
  const assets = [
    { key: "small", url: "/assets/small.png", type: "image", bytes: 100 },
    { key: "image-limit", url: "/assets/limit.png", type: "image", bytes: DEFAULT_ASSET_AUDIT_THRESHOLDS.imageBytes },
    { key: "large-image", url: "/assets/large.png", type: "image", bytes: DEFAULT_ASSET_AUDIT_THRESHOLDS.imageBytes + 1 },
    { key: "large-audio", url: "/assets/music.ogg", type: "audio", bytes: DEFAULT_ASSET_AUDIT_THRESHOLDS.audioBytes + 1 }
  ];

  assert.deepEqual(classifyLargeAssets(assets), [
    {
      key: "large-image",
      url: "/assets/large.png",
      type: "image",
      bytes: DEFAULT_ASSET_AUDIT_THRESHOLDS.imageBytes + 1,
      thresholdBytes: DEFAULT_ASSET_AUDIT_THRESHOLDS.imageBytes
    },
    {
      key: "large-audio",
      url: "/assets/music.ogg",
      type: "audio",
      bytes: DEFAULT_ASSET_AUDIT_THRESHOLDS.audioBytes + 1,
      thresholdBytes: DEFAULT_ASSET_AUDIT_THRESHOLDS.audioBytes
    }
  ]);
});

test("asset group summaries include counts and byte totals in stable order", () => {
  const assets = [
    { group: "plants", bytes: 100 },
    { group: "ui", bytes: 40 },
    { group: "plants", bytes: 200 },
    { bytes: 5 }
  ];

  assert.deepEqual(summarizeAssetGroups(assets), {
    plants: { assetCount: 2, totalBytes: 300 },
    ui: { assetCount: 1, totalBytes: 40 },
    ungrouped: { assetCount: 1, totalBytes: 5 }
  });
});

test("audit report preserves totals, thresholds, duplicate candidates, and sprite sheet metadata", () => {
  const assets = [
    { key: "plant", url: "/assets/plants/plant.png", type: "image", group: "plants", bytes: 100 }
  ];
  const duplicates = [{ file: "copy.png", identicalTo: "plant.png", bytes: 100 }];
  const spritesheets = [{ key: "plant-run", url: "/assets/plants/plant-run.png", frameConfig: { frameWidth: 150, frameHeight: 150 } }];
  const audit = buildAssetAudit({
    generatedAt: "2026-11-20T00:00:00.000Z",
    assets,
    duplicates,
    spritesheets
  });

  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.assetCount, 1);
  assert.equal(audit.totalBytes, 100);
  assert.equal(audit.generatedAt, "2026-11-20T00:00:00.000Z");
  assert.deepEqual(audit.largeFiles, []);
  assert.deepEqual(audit.groups, { plants: { assetCount: 1, totalBytes: 100 } });
  assert.deepEqual(audit.exactDuplicates, duplicates);
  assert.deepEqual(audit.spritesheets, spritesheets);
});
