const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUFFIX = /^[a-f0-9]{8}$/;

export function createStudioReleaseBranchName(plantId, suffix) {
  if (!SLUG.test(String(plantId || "")) || !SUFFIX.test(String(suffix || ""))) {
    throw new TypeError("Invalid Studio release branch identity.");
  }
  return "studio/release/" + plantId + "-" + suffix;
}

export function resolveStudioReleaseAsset(asset, pullRequest) {
  if (!asset?.releaseRequest?.number) return asset;
  if (asset.releaseRequest.operation === "delete") {
    if (pullRequest?.merged) return { ...asset, status: "archived", archivedAt: pullRequest.mergedAt || asset.archivedAt || new Date().toISOString(), releaseRequest: { ...asset.releaseRequest, state: "merged", mergedAt: pullRequest.mergedAt || null } };
    if (pullRequest?.state === "open") return { ...asset, status: "approved", releaseRequest: { ...asset.releaseRequest, state: "open" } };
    return { ...asset, status: "published", releaseRequest: null };
  }
  if (!pullRequest) return { ...asset, status: "testing", releaseRequest: null };
  if (pullRequest.merged) {
    return { ...asset, status: "published", publishedAt: pullRequest.mergedAt || asset.publishedAt, releaseRequest: { ...asset.releaseRequest, state: "merged" } };
  }
  if (pullRequest.state === "open") {
    return { ...asset, status: "approved", releaseRequest: { ...asset.releaseRequest, state: "open" } };
  }
  return { ...asset, status: "testing", releaseRequest: null };
}

export function applyProductionDeletionTombstones(assets, tombstones) {
  const deleted = new Map((Array.isArray(tombstones) ? tombstones : [])
    .map((entry) => typeof entry === "string" ? [entry, { id: entry }] : [entry?.id, entry])
    .filter(([id]) => Boolean(id)));
  return (Array.isArray(assets) ? assets : []).map((asset) => {
    const tombstone = deleted.get(asset?.id);
    if (!tombstone) return asset;
    return {
      ...asset,
      status: "archived",
      archivedAt: tombstone.deletedAt || asset.archivedAt || null,
      releaseRequest: (tombstone.releaseRequest || asset.releaseRequest) ? { ...(tombstone.releaseRequest || asset.releaseRequest), operation: "delete", state: "merged" } : null
    };
  });
}

export function findAssetDeletionTombstone(registry, assetId) {
  const entry = (Array.isArray(registry?.deletedAssetIds) ? registry.deletedAssetIds : [])
    .find((item) => typeof item === "string" ? item === assetId : item?.id === assetId);
  return typeof entry === "string" ? { id: entry } : entry || null;
}

export function transitionStudioAssetStatus(asset, operation, timestamp = new Date().toISOString()) {
  if (operation === "archive") {
    if (asset.status === "archived") return asset;
    if (asset.status === "published" || asset.status === "approved" || (asset.releaseRequest?.number && asset.releaseRequest.state !== "merged")) {
      throw new Error("لا يمكن أرشفة أصل منشور أو له طلب مراجعة مفتوح. أزل النشر عبر طلب إصدار مخصص أولاً.");
    }
    if (asset.status !== "draft" && asset.status !== "testing") {
      throw new Error("لا يمكن أرشفة الأصل من حالته الحالية.");
    }
    return { ...asset, status: "archived", archivedAt: timestamp, updatedAt: timestamp, releaseRequest: null };
  }
  if (operation === "restore") {
    if (asset.status !== "archived") throw new Error("لا يمكن استعادة أصل غير مؤرشف.");
    return { ...asset, status: "draft", archivedAt: null, updatedAt: timestamp, releaseRequest: null };
  }
  throw new Error("Unsupported Studio asset lifecycle action.");
}
