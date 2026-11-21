function asList(value) { return Array.isArray(value) ? value : []; }
function normalizePath(value) { return typeof value === "string" ? value.trim() : ""; }
function declaredDependencies(asset, byId) {
  const dependencies = [];
  const projectile = asset?.combat?.projectile;
  if (projectile && (projectile.id || projectile.path)) {
    const projectileId = projectile.id ? String(projectile.id) : "";
    const target = projectileId ? byId.get(projectileId) : null;
    if (projectile.managed === true) {
      dependencies.push(target && target.id !== asset.id
        ? { kind: "asset", relation: "projectile", targetId: target.id, targetName: target.name || target.id, targetType: target.type, path: normalizePath(projectile.path || target.path), resolved: true }
        : { kind: "asset", relation: "projectile", targetId: projectileId, targetName: projectileId || projectile.filename || "قذيفة مُدارة", targetType: "plantProjectile", path: normalizePath(projectile.path), resolved: false });
    } else if (projectile.managed === false) {
      dependencies.push({ kind: "embedded-file", relation: "projectile", targetId: null, targetName: projectile.filename || projectileId || "ملف القذيفة", targetType: "plantProjectile", path: normalizePath(projectile.path), resolved: Boolean(projectile.path), managedWithOwner: true });
    } else {
      dependencies.push(target && target.id !== asset.id
        ? { kind: "asset", relation: "projectile", targetId: target.id, targetName: target.name || target.id, targetType: target.type, path: normalizePath(projectile.path || target.path), resolved: true }
        : { kind: "embedded-file", relation: "projectile", targetId: null, targetName: projectile.filename || projectileId || "ملف القذيفة", targetType: "plantProjectile", path: normalizePath(projectile.path), resolved: Boolean(projectile.path), managedWithOwner: true });
    }
  }
  for (const reference of asList(asset?.dependencies)) {
    const id = typeof reference === "string" ? reference : reference?.id;
    if (!id) continue;
    const target = byId.get(String(id));
    dependencies.push({ kind: "asset", relation: typeof reference === "object" && reference.relation ? String(reference.relation) : "reference", targetId: String(id), targetName: target?.name || String(id), targetType: target?.type || null, path: target?.path || "", resolved: Boolean(target) });
  }
  return dependencies;
}
function collectFileUses(assets) {
  const uses = new Map();
  const add = (asset, role, path) => {
    const normalized = normalizePath(path);
    if (!normalized) return;
    if (!uses.has(normalized)) uses.set(normalized, []);
    uses.get(normalized).push({ assetId: asset.id, assetName: asset.name || asset.id, role });
  };
  for (const asset of assets) { add(asset, "primary", asset.path); add(asset, "projectile", asset.combat?.projectile?.path); }
  return uses;
}
export function buildAssetDependencyReport(assets, assetId) {
  const list = asList(assets);
  const asset = list.find((item) => item?.id === assetId);
  if (!asset) return null;
  const byId = new Map(list.filter((item) => item?.id).map((item) => [String(item.id), item]));
  const graph = new Map(list.filter((item) => item?.id).map((item) => [String(item.id), declaredDependencies(item, byId)]));
  const dependencies = graph.get(String(assetId)) || [];
  const dependents = [];
  for (const candidate of list) {
    if (candidate.id === assetId) continue;
    for (const dependency of graph.get(String(candidate.id)) || []) {
      if (dependency.kind === "asset" && dependency.targetId === assetId) dependents.push({ assetId: candidate.id, assetName: candidate.name || candidate.id, assetType: candidate.type, relation: dependency.relation });
    }
  }
  const fileUses = collectFileUses(list), sharedFiles = [];
  for (const [path, references] of fileUses) {
    const otherReferences = references.filter((reference) => reference.assetId !== assetId);
    const ownReferences = references.filter((reference) => reference.assetId === assetId);
    if (ownReferences.length && otherReferences.length) sharedFiles.push({ path, ownRoles: ownReferences.map((item) => item.role), usedBy: otherReferences });
  }
  const pendingRelease = asset.status === "approved" || Boolean(asset.releaseRequest?.number && asset.releaseRequest.state !== "merged");
  const protectedStatus = asset.status === "published" || pendingRelease;
  const unresolved = dependencies.filter((dependency) => !dependency.resolved);
  return {
    assetId, dependencies, dependents, sharedFiles, unresolved,
    canArchive: !protectedStatus && asset.status !== "archived" && dependents.length === 0,
    canReplace: !pendingRelease && dependents.length === 0,
    archiveBlockers: dependents.map((item) => item.assetName),
    warnings: [
      ...(pendingRelease ? ["يوجد طلب نشر مفتوح؛ أغلقه أو انتظر نتيجته قبل تعديل هذا الأصل."] : []),
      ...unresolved.map((item) => "تعذر تحديد ملف التبعية: " + item.targetName),
      ...sharedFiles.map((item) => "الملف " + item.path + " مشترك مع " + item.usedBy.map((use) => use.assetName).join("، ") + "؛ الاستبدال ينشئ مساراً جديداً ولا يغيّر النسخ الأخرى.")
    ]
  };
}
export function getAssetDependents(assets, assetId) { return buildAssetDependencyReport(assets, assetId)?.dependents || []; }
