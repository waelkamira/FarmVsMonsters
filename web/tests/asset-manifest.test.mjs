import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(here, "../public");
const manifestPath = resolve(publicRoot, "assets/asset-manifest.json");
const auditPath = resolve(publicRoot, "assets/asset-audit.json");

function readGeneratedJson(path) {
  assert.ok(existsSync(path), `generated asset report is missing: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

test("asset manifest inventories existing files with stable unique keys and hashes", () => {
  const manifest = readGeneratedJson(manifestPath);
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.assets) && manifest.assets.length > 0);
  assert.equal(manifest.assetCount, manifest.assets.length);
  assert.equal(new Set(manifest.assets.map((asset) => asset.key)).size, manifest.assets.length);
  assert.equal(manifest.totalBytes, manifest.assets.reduce((sum, asset) => sum + asset.bytes, 0));

  for (const asset of manifest.assets) {
    assert.match(asset.key, /^[a-z0-9_-]+$/);
    assert.match(asset.url, /^\/assets\//);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes > 0);
    const localPath = resolve(publicRoot, asset.url.slice(1));
    assert.ok(existsSync(localPath), `missing asset file: ${asset.url}`);
    assert.equal(statSync(localPath).size, asset.bytes, `size mismatch: ${asset.url}`);
    assert.ok(Array.isArray(manifest.groups[asset.group]));
    assert.ok(manifest.groups[asset.group].some((entry) => entry.key === asset.key));
    if (asset.type === "spritesheet") {
      assert.ok(asset.frameConfig);
      assert.ok(Number.isInteger(asset.frameConfig.frameWidth) && asset.frameConfig.frameWidth > 0);
      assert.ok(Number.isInteger(asset.frameConfig.frameHeight) && asset.frameConfig.frameHeight > 0);
    }
  }
});

test("asset groups and audit summary match the generated inventory", () => {
  const manifest = readGeneratedJson(manifestPath);
  const audit = readGeneratedJson(auditPath);
  assert.equal(audit.schemaVersion, manifest.schemaVersion);
  assert.equal(audit.assetCount, manifest.assetCount);
  assert.equal(audit.totalBytes, manifest.totalBytes);
  assert.ok(Number.isFinite(Date.parse(audit.generatedAt)));

  for (const [groupName, entries] of Object.entries(manifest.groups)) {
    const sourceAssets = manifest.assets.filter((asset) => asset.group === groupName);
    assert.equal(entries.length, sourceAssets.length, `group count mismatch: ${groupName}`);
    assert.equal(audit.groups[groupName].assetCount, entries.length);
    assert.equal(audit.groups[groupName].totalBytes, sourceAssets.reduce((sum, asset) => sum + asset.bytes, 0));
  }

  const keys = new Set(manifest.assets.map((asset) => asset.key));
  for (const largeFile of audit.largeFiles) assert.ok(keys.has(largeFile.key));
  for (const sheet of audit.spritesheets) {
    assert.ok(keys.has(sheet.key));
    assert.ok(sheet.frameConfig);
  }
});
