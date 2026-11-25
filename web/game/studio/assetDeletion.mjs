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

function cleanManifestEntry(item, removed) {
  if (!item || typeof item !== "object") return item;
  if (removed.has(item.url)) return null;
  const next = { ...item };
  if (removed.has(next.atlasMetadataPath)) delete next.atlasMetadataPath;
  if (next.atlas && typeof next.atlas === "object" && removed.has(next.atlas.jsonPath)) {
    next.atlas = { ...next.atlas };
    delete next.atlas.jsonPath;
  }
  return next;
}

function cleanManifestList(items, removed) {
  return items.map((item) => cleanManifestEntry(item, removed)).filter(Boolean);
}

export function removeManifestAssetReferences(manifest, assetPaths) {
  const removed = new Set(assetPaths);
  if (Array.isArray(manifest.assets)) {
    manifest.assets = cleanManifestList(manifest.assets, removed);
  }
  if (manifest.groups && typeof manifest.groups === "object") {
    for (const [group, items] of Object.entries(manifest.groups)) {
      if (Array.isArray(items)) manifest.groups[group] = cleanManifestList(items, removed);
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
