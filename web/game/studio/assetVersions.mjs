function copyCombat(combat) {
  return combat ? JSON.parse(JSON.stringify(combat)) : null;
}

export function snapshotStudioAsset(asset, versionNumber) {
  return {
    versionNumber,
    savedAt: asset.updatedAt || asset.createdAt || new Date().toISOString(),
    id: asset.id,
    type: asset.type,
    name: asset.name,
    filename: asset.filename,
    path: asset.path,
    rows: asset.rows,
    columns: asset.columns,
    spriteSheet: asset.spriteSheet,
    combat: copyCombat(asset.combat)
  };
}

export function createStudioAssetRevision(existing, nextRecord) {
  if (!existing) return { ...nextRecord, revision: 1, versions: [] };
  const currentRevision = Number.isInteger(existing.revision) && existing.revision > 0 ? existing.revision : 1;
  const versions = Array.isArray(existing.versions) ? existing.versions : [];
  return {
    ...nextRecord,
    revision: currentRevision + 1,
    versions: [...versions, snapshotStudioAsset(existing, currentRevision)]
  };
}

export function restoreStudioAssetRevision(asset, versionNumber, timestamp = new Date().toISOString()) {
  const target = (Array.isArray(asset.versions) ? asset.versions : []).find(version => version.versionNumber === Number(versionNumber));
  if (!target) throw new Error("الإصدار المطلوب غير موجود في سجل هذا الأصل.");
  const currentRevision = Number.isInteger(asset.revision) && asset.revision > 0 ? asset.revision : 1;
  const versions = Array.isArray(asset.versions) ? asset.versions : [];
  const currentSnapshot = snapshotStudioAsset(asset, currentRevision);
  return {
    ...asset,
    name: target.name,
    filename: target.filename,
    path: target.path,
    rows: target.rows,
    columns: target.columns,
    spriteSheet: target.spriteSheet,
    combat: copyCombat(target.combat),
    revision: currentRevision + 1,
    versions: [...versions, currentSnapshot],
    status: "draft",
    releaseRequest: null,
    archivedAt: null,
    restoredFromVersion: target.versionNumber,
    updatedAt: timestamp
  };
}
