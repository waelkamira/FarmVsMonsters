import { safeAssetPath } from "./assetReadiness.mjs";

function snapshotsFor(asset) {
  return [asset, ...(Array.isArray(asset?.versions) ? asset.versions : [])];
}

function manifestEntries(manifest) {
  if (Array.isArray(manifest?.assets)) return manifest.assets;
  return Object.values(manifest?.groups || {}).flatMap((items) => Array.isArray(items) ? items : []);
}

export function assetOwnedPaths(asset) {
  return [...new Set(snapshotsFor(asset).flatMap((snapshot) => [
    snapshot?.path,
    snapshot?.atlasMetadataPath,
    snapshot?.atlas?.jsonPath,
    snapshot?.audio?.path,
    snapshot?.combat?.projectile?.path
  ]).filter((value) => typeof value === "string" && safeAssetPath(value)))];
}

export function assetPathStillUsed(assets, assetPath) {
  return (Array.isArray(assets) ? assets : []).some((asset) =>
    snapshotsFor(asset).some((snapshot) => [
      snapshot?.path,
      snapshot?.atlasMetadataPath,
      snapshot?.atlas?.jsonPath,
      snapshot?.audio?.path,
      snapshot?.combat?.projectile?.path
    ].includes(assetPath))
  );
}

export function removeManifestAssetReferences(manifest, assetPaths) {
  const removed = new Set(assetPaths);
  if (Array.isArray(manifest.assets)) {
    manifest.assets = manifest.assets.filter((item) => !removed.has(item?.url));
  }
  if (manifest.groups && typeof manifest.groups === "object") {
    for (const [group, items] of Object.entries(manifest.groups)) {
      if (Array.isArray(items)) manifest.groups[group] = items.filter((item) => !removed.has(item?.url));
    }
  }
  const all = manifestEntries(manifest);
  manifest.assetCount = all.length;
  manifest.totalBytes = all.reduce((total, item) => total + (Number(item?.bytes) || 0), 0);
  manifest.generatedAt = new Date().toISOString();
  return manifest;
}

export function synchronizeAssetAudit(audit, manifest) {
  const all = manifestEntries(manifest);
  const liveUrls = new Set(all.map((item) => item.url));
  audit.assetCount = all.length;
  audit.totalBytes = all.reduce((total, item) => total + (Number(item?.bytes) || 0), 0);
  const groupTotals = new Map();
  for (const item of all) {
    const name = item.group || "misc";
    const current = groupTotals.get(name) || { assetCount: 0, totalBytes: 0 };
    current.assetCount += 1;
    current.totalBytes += Number(item.bytes) || 0;
    groupTotals.set(name, current);
  }
  audit.groups = Object.fromEntries(groupTotals);
  audit.largeFiles = (audit.largeFiles || []).filter((item) => liveUrls.has(item.url));
  audit.spritesheets = (audit.spritesheets || []).filter((item) => liveUrls.has(item.url));
  audit.exactDuplicates = (audit.exactDuplicates || []).filter((item) =>
    liveUrls.has("/assets/" + item.file) && liveUrls.has("/assets/" + item.identicalTo)
  );
  audit.generatedAt = manifest.generatedAt || new Date().toISOString();
  return audit;
}
