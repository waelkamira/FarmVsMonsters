import { safeAssetPath } from "./assetReadiness.mjs";
import { getAssetDependents } from "./assetDependencies.mjs";
import { getStageAssetReferences } from "./stageMonsterReferences.mjs";

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
    snapshot?.combat?.projectile?.path,
    ...Object.values(snapshot?.stateAnimations || {}).map((state) => state?.path)
  ]).filter((value) => typeof value === "string" && safeAssetPath(value)))];
}

export function assetPathStillUsed(assets, assetPath) {
  return (Array.isArray(assets) ? assets : []).some((asset) =>
    snapshotsFor(asset).some((snapshot) => [
      snapshot?.path,
      snapshot?.atlasMetadataPath,
      snapshot?.atlas?.jsonPath,
      snapshot?.audio?.path,
      snapshot?.combat?.projectile?.path,
      ...Object.values(snapshot?.stateAnimations || {}).map((state) => state?.path)
    ].includes(assetPath))
  );
}

function linkedAssets(assets, asset) {
  const byId = new Map((assets || []).map((item) => [String(item?.id || ""), item]));
  const ids = [
    ...(asset?.rigProfile?.bones || []).map((bone) => bone?.part?.assetId),
    ...(asset?.dependencies || []).map((dependency) => typeof dependency === "string" ? dependency : dependency?.id),
    ...(asset?.combat?.projectile?.managed ? [asset.combat.projectile.id] : [])
  ].filter(Boolean);
  return [...new Set(ids)].map((id) => byId.get(String(id))).filter(Boolean);
}

export function getAssetReleasePaths(assets, asset) {
  return [...new Set([asset, ...linkedAssets(assets, asset)].flatMap((item) => [
    ...assetOwnedPaths(item), item?.combat?.projectile?.path
  ]).filter((value) => typeof value === "string" && safeAssetPath(value)))];
}

export const productionDeletionMessages = Object.freeze({
  dependentAssets: "\u0644\u0627 \u064a\u0645\u0643\u0646 \u062d\u0630\u0641 \u0627\u0644\u0623\u0635\u0644 \u0644\u0623\u0646 \u0623\u0635\u0648\u0644\u0627\u064b \u0623\u062e\u0631\u0649 \u062a\u0639\u062a\u0645\u062f \u0639\u0644\u064a\u0647: ",
  publishRequestOpen: "\u064a\u0648\u062c\u062f \u0637\u0644\u0628 \u0646\u0634\u0631 \u0645\u0641\u062a\u0648\u062d \u0644\u0647\u0630\u0627 \u0627\u0644\u0623\u0635\u0644. \u0627\u0646\u062a\u0638\u0631 \u0625\u063a\u0644\u0627\u0642\u0647 \u0642\u0628\u0644 \u0637\u0644\u0628 \u0627\u0644\u0625\u0632\u0627\u0644\u0629.",
  finalized: "\u0627\u0643\u062a\u0645\u0644\u062a \u0627\u0644\u0625\u0632\u0627\u0644\u0629 \u0628\u0639\u062f \u062f\u0645\u062c \u0637\u0644\u0628 PR.",
  requestAccepted: "\u0633\u064f\u062c\u0651\u0644 \u0637\u0644\u0628 \u0627\u0644\u0625\u0632\u0627\u0644\u0629\u061b \u064a\u0628\u0642\u0649 \u0627\u0644\u0623\u0635\u0644 \u0645\u0646\u0634\u0648\u0631\u0627\u064b \u062d\u062a\u0649 \u062f\u0645\u062c PR."
});

export function getAssetDependencyConflict(assets, assetId) {
  const dependents = getAssetDependents(assets, assetId);
  if (!dependents.length) return null;
  return Object.assign(new Error(productionDeletionMessages.dependentAssets + dependents.map((item) => item.assetName).join("\u060c ") + "."), { status: 409 });
}

export function createProductionAssetDeletionPlan({ registry, assetId, stageConfig }) {
  const assets = Array.isArray(registry?.assets) ? registry.assets : [];
  const asset = assets.find((item) => item.id === assetId);
  if (!asset) throw Object.assign(new Error("\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0623\u0635\u0644 \u0627\u0644\u0645\u0646\u0634\u0648\u0631."), { status: 404 });
  if (asset.status !== "published") throw Object.assign(new Error("\u0644\u0627 \u064a\u0645\u0643\u0646 \u0637\u0644\u0628 \u0625\u0632\u0627\u0644\u0629 \u0623\u0635\u0644 \u0642\u0628\u0644 \u0646\u0634\u0631\u0647 \u0641\u0639\u0644\u064a\u0627\u064b."), { status: 409 });

  const stageReferences = getStageAssetReferences(stageConfig, assetId);
  if (stageReferences.length) {
    const locations = stageReferences.map((item) => item.kind === "monster"
      ? `\u0627\u0644\u0645\u0631\u062d\u0644\u0629 ${item.stageId}\u060c \u0627\u0644\u0645\u0648\u062c\u0629 ${item.wave}` : `\u0627\u0644\u0645\u0631\u062d\u0644\u0629 ${item.stageId}`).join("\u061b ");
    throw Object.assign(new Error(`\u0644\u0627 \u064a\u0645\u0643\u0646 \u062d\u0630\u0641 \u0627\u0644\u0623\u0635\u0644 \u0644\u0623\u0646\u0647 \u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u064a \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0631\u0627\u062d\u0644: ${locations}. \u0623\u0632\u0644 \u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0623\u0648\u0644\u0627\u064b.`), { status: 409 });
  }

  const dependencyConflict = getAssetDependencyConflict(assets, assetId);
  if (dependencyConflict) throw dependencyConflict;

  const remainingAssets = assets.filter((item) => item.id !== assetId);
  const candidatePaths = getAssetReleasePaths(assets, asset);
  const remainingPaths = new Set(remainingAssets.flatMap((item) => getAssetReleasePaths(assets, item)));
  const removablePaths = candidatePaths.filter((assetPath) => !remainingPaths.has(assetPath));
  return { asset, remainingAssets, candidatePaths, removablePaths };
}

export async function requestProductionAssetDeletion({ plan, baseBranch, beginRelease, removeReleaseFiles, finishRelease }) {
  const release = await beginRelease(plan.asset.id, baseBranch, plan.asset);
  if (release.completed) return { operation: "deleted", finalized: true, alreadyDeleted: true, releaseRequest: release.completed };
  await removeReleaseFiles(release.branch, plan);
  const releaseRequest = await finishRelease(release, plan, baseBranch);
  return { operation: "delete-requested", finalized: false, alreadyDeleted: false, releaseRequest };
}

export async function removeAssetManifestReferencesFromBranch({ assetPaths, branch, getDocument, putFile }) {
  const manifestPath = "web/public/assets/asset-manifest.json";
  const auditPath = "web/public/assets/asset-audit.json";
  const [manifestDocument, auditDocument] = await Promise.all([getDocument(manifestPath, branch), getDocument(auditPath, branch)]);
  if (!manifestDocument || !auditDocument) throw new Error("Production Manifest or Audit is unavailable; deletion PR was not completed.");
  const manifest = JSON.parse(manifestDocument.content);
  const removed = new Set(assetPaths);
  const entries = [...(Array.isArray(manifest.assets) ? manifest.assets : []), ...Object.values(manifest.groups || {}).flatMap((items) => Array.isArray(items) ? items : [])];
  const hasReferences = entries.some((item) => removed.has(item?.url));
  const updatedManifest = hasReferences ? removeManifestAssetReferences(manifest, assetPaths) : manifest;
  let changed = false;
  if (hasReferences) {
    const manifestContent = JSON.stringify(updatedManifest, null, 2) + "\n";
    if (manifestContent !== manifestDocument.content) {
      await putFile(manifestPath, Buffer.from(manifestContent), "studio: remove deleted asset references from manifest", branch, manifestDocument.sha);
      changed = true;
    }
  }
  const audit = synchronizeAssetAudit(JSON.parse(auditDocument.content), updatedManifest);
  const auditContent = JSON.stringify(audit, null, 2) + "\n";
  if (auditContent !== auditDocument.content) {
    await putFile(auditPath, Buffer.from(auditContent), "studio: reconcile asset audit after permanent deletion", branch, auditDocument.sha);
    changed = true;
  }
  return { changed };
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
