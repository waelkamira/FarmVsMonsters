import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assetOwnedPaths } from "../game/studio/assetDeletion.mjs";
import { safeAssetPath } from "../game/studio/assetReadiness.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(webRoot, "..");
const localRegistryPath = path.join(webRoot, "game/data/studioAssetRegistry.json");
const sourceBranch = "studio/assets";

function git(args, cwd = repoRoot, allowFailure = false) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }).trim();
  } catch (error) {
    if (allowFailure) return null;
    const detail = String(error.stderr || error.message || "").trim();
    throw new Error("Git " + args[0] + " failed: " + detail);
  }
}

function fingerprint(asset) {
  const identity = {
    id: asset?.id, type: asset?.type, revision: asset?.revision || 1, path: asset?.path, thumbnailPath: asset?.thumbnailPath,
    filename: asset?.filename, rows: asset?.rows, columns: asset?.columns, frameCount: asset?.frameCount,
    spriteSheet: asset?.spriteSheet, animationProfile: asset?.animationProfile, rigProfile: asset?.rigProfile,
    combat: asset?.combat, monsterProfile: asset?.monsterProfile, flipX: asset?.flipX,
    effects: asset?.effects, stateAnimations: asset?.stateAnimations
  };
  return identity;
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf8"));
}

function collectClosure(registry, roots) {
  const byId = new Map((registry.assets || []).map((asset) => [asset.id, asset]));
  const included = new Map();
  function visit(asset) {
    if (included.has(asset.id)) return;
    if (asset.status === "archived") throw new Error("Dependency " + asset.id + " is archived.");
    included.set(asset.id, asset);
    const dependencyIds = [
      ...(asset.rigProfile?.bones || []).map((bone) => bone?.part?.assetId),
      ...(asset.dependencies || []).map((item) => typeof item === "string" ? item : item?.id),
      ...(asset.combat?.projectile?.managed ? [asset.combat.projectile.id] : [])
    ].filter(Boolean);
    for (const id of new Set(dependencyIds)) {
      const dependency = byId.get(String(id));
      if (!dependency) throw new Error("Missing local dependency " + id + " required by " + asset.id + ".");
      visit(dependency);
    }
  }
  for (const asset of roots) visit(asset);
  return [...included.values()];
}

function validateDeclaredPaths(asset) {
  const declared = [
    asset.path, asset.thumbnailPath, asset.atlasMetadataPath, asset.atlas?.jsonPath, asset.audio?.path,
    asset.combat?.projectile?.path,
    ...Object.values(asset.stateAnimations || {}).map((state) => state?.path)
  ].filter((value) => value !== undefined && value !== null && value !== "");
  for (const assetPath of declared) {
    if (!safeAssetPath(assetPath)) throw new Error("Invalid declared asset path on " + asset.id + ": " + assetPath);
  }
}

function sync() {
  const localRegistry = readJson(localRegistryPath, { version: 1, assets: [], deletedAssetIds: [] });
  const roots = (localRegistry.assets || []).filter((asset) =>
    ["plant", "monster"].includes(asset.type) && asset.status === "testing"
  );
  if (!roots.length) {
    process.stdout.write("No locally tested plants or monsters need syncing.\n");
    return;
  }

  const closure = collectClosure(localRegistry, roots);
  const selectedIds = new Set(roots.map((asset) => asset.id));
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "fvm-studio-source-"));
  const worktreePath = path.join(tempRoot, "checkout");
  const tempBranch = "studio-sync-tmp-" + process.pid + "-" + Date.now();
  let worktreeAdded = false;
  let branchCreated = false;

  try {
    git(["fetch", "origin"]);
    const remoteRef = git(["rev-parse", "--verify", "refs/remotes/origin/" + sourceBranch], repoRoot, true);
    if (!remoteRef) throw new Error("Remote branch origin/" + sourceBranch + " was not found.");
    git(["worktree", "add", "--track", "-b", tempBranch, worktreePath, "refs/remotes/origin/" + sourceBranch]);
    worktreeAdded = true;
    branchCreated = true;
    git(["pull", "--ff-only"], worktreePath);

    const branchRegistryPath = path.join(worktreePath, "web/game/data/studioAssetRegistry.json");
    const branchRegistry = readJson(branchRegistryPath, { version: 1, assets: [], deletedAssetIds: [] });
    branchRegistry.assets = Array.isArray(branchRegistry.assets) ? branchRegistry.assets : [];
    branchRegistry.deletedAssetIds = Array.isArray(branchRegistry.deletedAssetIds) ? branchRegistry.deletedAssetIds : [];
    const tombstones = new Set(branchRegistry.deletedAssetIds.map((entry) => typeof entry === "string" ? entry : entry?.id).filter(Boolean));
    const copiedPaths = new Set();
    const registryById = new Map(branchRegistry.assets.map((asset) => [asset.id, asset]));
    let registryChanged = false;

    for (const asset of closure) {
      validateDeclaredPaths(asset);
      if (tombstones.has(asset.id)) throw new Error("Asset " + asset.id + " is tombstoned on " + sourceBranch + "; it cannot be reintroduced.");
      const existing = registryById.get(asset.id);
      const nextFingerprint = JSON.stringify(fingerprint(asset));
      if (existing) {
        const existingFingerprint = JSON.stringify(fingerprint(existing));
        const localRevision = Number(asset.revision || 1);
        const remoteRevision = Number(existing.revision || 1);
        if (existing.releaseRequest?.number && existing.releaseRequest.state !== "merged" && existingFingerprint !== nextFingerprint) {
          throw new Error("Asset " + asset.id + " has an open release request on " + sourceBranch + "; resolve it before syncing another revision.");
        }
        if (existingFingerprint !== nextFingerprint && localRevision <= remoteRevision) {
          throw new Error("Asset " + asset.id + " differs from " + sourceBranch + " without a higher local revision. Resolve this conflict manually.");
        }
        if (existingFingerprint !== nextFingerprint || (selectedIds.has(asset.id) && existing.status !== "published" && existing.status !== "approved")) {
          const updated = {
            ...asset,
            ...(selectedIds.has(asset.id) ? { status: "testing", releaseRequest: null } : {})
          };
          const index = branchRegistry.assets.findIndex((item) => item.id === asset.id);
          branchRegistry.assets[index] = updated;
          registryById.set(asset.id, updated);
          registryChanged = true;
        }
      } else {
        const imported = { ...asset, ...(selectedIds.has(asset.id) ? { status: "testing", releaseRequest: null } : {}) };
        branchRegistry.assets.push(imported);
        registryById.set(asset.id, imported);
        registryChanged = true;
      }

      for (const assetPath of assetOwnedPaths(asset)) {
        if (!safeAssetPath(assetPath)) throw new Error("Unsafe asset path: " + assetPath);
        copiedPaths.add(assetPath);
      }
    }

    const sourcePublic = path.resolve(webRoot, "public");
    const targetPublic = path.resolve(worktreePath, "web/public");
    for (const assetPath of copiedPaths) {
      const relative = assetPath.replace(/^\/+/, "");
      const source = path.resolve(sourcePublic, relative);
      const destination = path.resolve(targetPublic, relative);
      if (!source.startsWith(sourcePublic + path.sep) || !destination.startsWith(targetPublic + path.sep)) {
        throw new Error("Asset path escapes the public assets directory: " + assetPath);
      }
      if (!existsSync(source) || !statSync(source).isFile()) throw new Error("Required local asset file is missing: " + assetPath);
      mkdirSync(path.dirname(destination), { recursive: true });
      if (existsSync(destination)) {
        if (!readFileSync(source).equals(readFileSync(destination))) throw new Error("Immutable asset path already exists with different bytes on " + sourceBranch + ": " + assetPath);
      } else {
        copyFileSync(source, destination);
      }
    }

    if (registryChanged) {
      writeFileSync(branchRegistryPath, JSON.stringify(branchRegistry, null, 2) + "\n", "utf8");
    }
    const pathsToStage = [
      ...(registryChanged ? ["web/game/data/studioAssetRegistry.json"] : []),
      ...[...copiedPaths].map((assetPath) => "web/public/" + assetPath.replace(/^\/+/, ""))
    ];
    if (pathsToStage.length) git(["add", "--", ...pathsToStage], worktreePath);
    const staged = git(["status", "--porcelain"], worktreePath);
    if (!staged) {
      process.stdout.write("All tested assets and dependencies are already present on " + sourceBranch + ".\n");
      return;
    }

    git(["commit", "-m", "studio: sync tested assets to source branch"], worktreePath);
    git(["push", "origin", "HEAD:refs/heads/" + sourceBranch], worktreePath);
    process.stdout.write("Synced " + roots.length + " tested character(s), " + closure.length + " total asset record(s), and " + copiedPaths.size + " file path(s) to origin/" + sourceBranch + ".\n");
  } finally {
    if (worktreeAdded) git(["worktree", "remove", "--force", worktreePath], repoRoot, true);
    if (branchCreated) git(["branch", "-D", tempBranch], repoRoot, true);
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

sync();
