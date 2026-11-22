function copyJson(value) {
  return value === undefined || value === null ? value : JSON.parse(JSON.stringify(value));
}

function copyCombat(combat) {
  return combat ? copyJson(combat) : null;
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
    atlas: copyJson(asset.atlas),
    combat: copyCombat(asset.combat),
    animationProfile: copyJson(asset.animationProfile),
    rigProfile: copyJson(asset.rigProfile),
    monsterProfile: copyJson(asset.monsterProfile),
    dependencies: copyJson(asset.dependencies)
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
    atlas: copyJson(target.atlas),
    combat: copyCombat(target.combat),
    animationProfile: copyJson(target.animationProfile),
    rigProfile: copyJson(target.rigProfile),
    monsterProfile: copyJson(target.monsterProfile),
    dependencies: copyJson(target.dependencies),
    revision: currentRevision + 1,
    versions: [...versions, currentSnapshot],
    status: "draft",
    releaseRequest: null,
    publishedAt: null,
    testingAt: null,
    archivedAt: null,
    restoredFromVersion: target.versionNumber,
    updatedAt: timestamp
  };
}

export function cloneStudioAsset(asset, newId, newName, timestamp = new Date().toISOString()) {
  const id = String(newId || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64) {
    throw new TypeError("معرّف النسخة يجب أن يكون أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط.");
  }
  if (!asset?.path || !asset?.type) throw new TypeError("لا يمكن نسخ أصل غير مكتمل.");
  return {
    ...asset,
    combat: copyCombat(asset.combat),
    animationProfile: copyJson(asset.animationProfile),
    atlas: copyJson(asset.atlas),
    rigProfile: copyJson(asset.rigProfile),
    monsterProfile: copyJson(asset.monsterProfile),
    dependencies: copyJson(asset.dependencies),
    id,
    name: String(newName || `${asset.name || asset.id} (نسخة)`).trim().slice(0, 80) || id,
    revision: 1,
    versions: [],
    status: "draft",
    releaseRequest: null,
    archivedAt: null,
    publishedAt: null,
    testingAt: null,
    restoredFromVersion: null,
    clonedFrom: asset.id,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
