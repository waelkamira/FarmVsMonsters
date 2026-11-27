import test from "node:test";
import assert from "node:assert/strict";
import {
  assetOwnedPaths,
  assetPathStillUsed,
  removeManifestAssetReferences,
  synchronizeAssetAudit
} from "../game/studio/assetDeletion.mjs";

test("owned paths include current files, atlas metadata, audio, projectiles, and historical versions", () => {
  const asset = {
    path: "/assets/plants/current.png",
    atlasMetadataPath: "/assets/plants/current.json",
    audio: { path: "/assets/audio/current.ogg" },
    combat: { projectile: { path: "/assets/projectiles/current.png" } },
    versions: [{
      path: "/assets/plants/old.png",
      atlasMetadataPath: "/assets/plants/old.json",
      combat: { projectile: { path: "/assets/projectiles/old.png" } }
    }]
  };
  assert.deepEqual(assetOwnedPaths(asset), [
    "/assets/plants/current.png",
    "/assets/plants/current.json",
    "/assets/audio/current.ogg",
    "/assets/projectiles/current.png",
    "/assets/plants/old.png",
    "/assets/plants/old.json",
    "/assets/projectiles/old.png"
  ]);
});

test("a file remains protected while any current or historical asset revision uses it", () => {
  const remaining = [{
    id: "other",
    path: "/assets/plants/other.png",
    versions: [{
      path: "/assets/plants/shared-old.png",
      atlasMetadataPath: "/assets/plants/shared-atlas.json"
    }]
  }];
  assert.equal(assetPathStillUsed(remaining, "/assets/plants/shared-old.png"), true);
  assert.equal(assetPathStillUsed(remaining, "/assets/plants/shared-atlas.json"), true);
  assert.equal(assetPathStillUsed(remaining, "/assets/plants/not-used.png"), false);
});

test("manifest cleanup removes references from both canonical assets and groups and recalculates totals", () => {
  const manifest = {
    assets: [
      { key: "plant-a", url: "/assets/plants/a.png", group: "plants", bytes: 100 },
      { key: "plant-b", url: "/assets/plants/b.png", group: "plants", bytes: 200 },
      { key: "sound", url: "/assets/audio/hit.ogg", group: "audio", bytes: 50 }
    ],
    groups: {
      plants: [
        { key: "plant-a", url: "/assets/plants/a.png", group: "plants", bytes: 100 },
        { key: "plant-b", url: "/assets/plants/b.png", group: "plants", bytes: 200 }
      ],
      audio: [{ key: "sound", url: "/assets/audio/hit.ogg", group: "audio", bytes: 50 }]
    }
  };
  const result = removeManifestAssetReferences(manifest, ["/assets/plants/a.png"]);
  assert.deepEqual(result.assets.map((item) => item.url), ["/assets/plants/b.png", "/assets/audio/hit.ogg"]);
  assert.deepEqual(result.groups.plants.map((item) => item.url), ["/assets/plants/b.png"]);
  assert.equal(result.assetCount, 2);
  assert.equal(result.totalBytes, 250);
  assert.ok(Number.isFinite(Date.parse(result.generatedAt)));
});

test("asset audit is rebuilt from the canonical manifest rather than stale group totals", () => {
  const manifest = {
    generatedAt: "2026-11-25T00:00:00.000Z",
    assets: [
      { url: "/assets/plants/b.png", group: "plants", bytes: 200 },
      { url: "/assets/audio/hit.ogg", group: "audio", bytes: 50 }
    ],
    groups: {
      plants: [{ url: "/assets/plants/b.png" }],
      audio: [{ url: "/assets/audio/hit.ogg" }]
    }
  };
  const audit = synchronizeAssetAudit({
    assetCount: 99,
    totalBytes: 9999,
    groups: { plants: { assetCount: 99, totalBytes: 9999 } },
    largeFiles: [{ url: "/assets/plants/deleted.png" }, { url: "/assets/plants/b.png" }],
    spritesheets: [{ url: "/assets/plants/deleted.png" }],
    exactDuplicates: [{ file: "plants/deleted.png", identicalTo: "plants/b.png" }]
  }, manifest);
  assert.equal(audit.assetCount, 2);
  assert.equal(audit.totalBytes, 250);
  assert.deepEqual(audit.groups, {
    plants: { assetCount: 1, totalBytes: 200 },
    audio: { assetCount: 1, totalBytes: 50 }
  });
  assert.deepEqual(audit.largeFiles.map((item) => item.url), ["/assets/plants/b.png"]);
  assert.equal(audit.spritesheets.length, 0);
  assert.equal(audit.exactDuplicates.length, 0);
});

test("manifest cleanup removes stale atlas metadata links without removing the live sprite image", () => {
  const manifest = {
    assets: [{
      key: "atlas-plant",
      url: "/assets/plants/atlas.png",
      atlasMetadataPath: "/assets/plants/atlas.json",
      atlas: { jsonPath: "/assets/plants/atlas-extra.json", frameCount: 24 },
      group: "plants",
      bytes: 1200
    }],
    groups: {
      plants: [{
        key: "atlas-plant",
        url: "/assets/plants/atlas.png",
        atlasMetadataPath: "/assets/plants/atlas.json",
        atlas: { jsonPath: "/assets/plants/atlas-extra.json", frameCount: 24 },
        group: "plants",
        bytes: 1200
      }]
    }
  };

  const result = removeManifestAssetReferences(manifest, [
    "/assets/plants/atlas.json",
    "/assets/plants/atlas-extra.json"
  ]);

  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].url, "/assets/plants/atlas.png");
  assert.equal("atlasMetadataPath" in result.assets[0], false);
  assert.equal("jsonPath" in result.assets[0].atlas, false);
  assert.equal(result.groups.plants[0].url, "/assets/plants/atlas.png");
  assert.equal("atlasMetadataPath" in result.groups.plants[0], false);
  assert.equal("jsonPath" in result.groups.plants[0].atlas, false);
  assert.equal(result.assetCount, 1);
  assert.equal(result.totalBytes, 1200);
});
