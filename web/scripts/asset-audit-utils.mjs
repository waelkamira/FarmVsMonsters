export const DEFAULT_ASSET_AUDIT_THRESHOLDS = Object.freeze({
  imageBytes: Math.floor(1.5 * 1024 * 1024),
  audioBytes: 3 * 1024 * 1024
});

export function classifyLargeAssets(assets, thresholds = DEFAULT_ASSET_AUDIT_THRESHOLDS) {
  if (!Array.isArray(assets)) throw new TypeError("assets must be an array");
  return assets.flatMap((asset) => {
    const thresholdBytes = asset.type === "audio"
      ? thresholds.audioBytes
      : thresholds.imageBytes;
    if (!Number.isFinite(asset.bytes) || asset.bytes <= thresholdBytes) return [];
    return [{
      key: asset.key,
      path: String(asset.url || "").replace(/^\/assets\//, ""),
      type: asset.type || "image",
      bytes: asset.bytes,
      thresholdBytes
    }];
  });
}

export function summarizeAssetGroups(assets) {
  if (!Array.isArray(assets)) throw new TypeError("assets must be an array");
  const groups = {};
  for (const asset of assets) {
    const name = asset.group || "ungrouped";
    const summary = groups[name] || (groups[name] = { count: 0, totalBytes: 0 });
    summary.count += 1;
    summary.totalBytes += Number.isFinite(asset.bytes) ? asset.bytes : 0;
  }
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  );
}

export function buildAssetAudit({
  generatedAt,
  assets,
  duplicates = [],
  thresholds = DEFAULT_ASSET_AUDIT_THRESHOLDS
}) {
  if (!Array.isArray(assets)) throw new TypeError("assets must be an array");
  return {
    schemaVersion: 1,
    generatedAt,
    assetCount: assets.length,
    totalBytes: assets.reduce((total, asset) => total + (Number.isFinite(asset.bytes) ? asset.bytes : 0), 0),
    thresholds,
    largeFiles: classifyLargeAssets(assets, thresholds),
    groups: summarizeAssetGroups(assets),
    exactDuplicates: [...duplicates]
  };
}
