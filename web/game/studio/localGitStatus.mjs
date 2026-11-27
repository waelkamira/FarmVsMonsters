import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_CHANGED_FILES = 200;

async function git(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 256 * 1024,
    windowsHide: true
  });
  return String(result.stdout || "").trim();
}

async function optionalGit(cwd, args) {
  try {
    return await git(cwd, args);
  } catch {
    return null;
  }
}

function parseNameStatus(value) {
  return value ? value.split("\n").filter(Boolean).slice(0, MAX_CHANGED_FILES).map((line) => {
    const [status, ...parts] = line.split("\t");
    return { status, path: parts.join("\t") };
  }) : [];
}

function parseCounts(value) {
  if (!value) return null;
  const match = value.trim().match(/^(\d+)\s+(\d+)$/);
  return match ? { ahead: Number(match[1]), behind: Number(match[2]) } : null;
}

/**
 * Read-only local Git snapshot for the Studio development UI.
 * It never fetches, checks out, commits, pulls, pushes, or changes refs.
 */
export async function getLocalGitStatus({ cwd = process.cwd(), env = process.env } = {}) {
  if (env.NODE_ENV === "production") {
    return { enabled: false, available: false, syncStates: ["Production differs"], changedFiles: [] };
  }

  try {
    const root = await git(cwd, ["rev-parse", "--show-toplevel"]);
    const [branch, porcelain, upstream] = await Promise.all([
      git(root, ["branch", "--show-current"]),
      git(root, ["status", "--porcelain=v1", "--untracked-files=all"]),
      optionalGit(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
    ]);

    const statusLines = porcelain ? porcelain.split(String.fromCharCode(10)).filter(Boolean) : [];
    const changedFiles = statusLines.slice(0, MAX_CHANGED_FILES).map((line) => ({
      status: line.slice(0, 2),
      path: line.slice(3)
    }));
    const dirty = statusLines.length > 0;
    const unmerged = statusLines.some((line) => /^(AA|DD|U.|.U)/.test(line.slice(0, 2)));
    const trackingCounts = upstream
      ? parseCounts(await optionalGit(root, ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"]))
      : null;

    const [studioAssetsSha, mainSha] = await Promise.all([
      optionalGit(root, ["rev-parse", "--verify", "refs/remotes/origin/studio/assets"]),
      optionalGit(root, ["rev-parse", "--verify", "refs/remotes/origin/main"])
    ]);
    let productionCounts = null;
    let productionChangedFiles = [];
    let localToStudioAssets = null;
    let localToStudioChangedFiles = [];
    if (studioAssetsSha) {
      localToStudioAssets = parseCounts(await optionalGit(root, [
        "rev-list", "--left-right", "--count", "HEAD...refs/remotes/origin/studio/assets"
      ]));
      localToStudioChangedFiles = parseNameStatus(await optionalGit(root, [
        "diff", "--name-status", "HEAD", "refs/remotes/origin/studio/assets"
      ]));
    }
    if (studioAssetsSha && mainSha) {
      productionCounts = parseCounts(await optionalGit(root, [
        "rev-list", "--left-right", "--count", "refs/remotes/origin/main...refs/remotes/origin/studio/assets"
      ]));
      productionChangedFiles = parseNameStatus(await optionalGit(root, [
        "diff", "--name-status", "refs/remotes/origin/main", "refs/remotes/origin/studio/assets"
      ]));
    }
    const productionComparisonUnavailable = !productionCounts;
    const productionDiffers = Boolean(productionCounts && (productionCounts.ahead > 0 || productionCounts.behind > 0));
    const diverged = Boolean(trackingCounts && trackingCounts.ahead > 0 && trackingCounts.behind > 0);
    const conflict = unmerged;
    const notSynced = !upstream || !trackingCounts || trackingCounts.ahead > 0 || trackingCounts.behind > 0;
    const syncStates = [];
    if (dirty) syncStates.push("Local changes", "Not committed");
    if (notSynced) syncStates.push("Not synced");
    if (productionDiffers) syncStates.push("Production differs");
    if (productionComparisonUnavailable) syncStates.push("Production comparison unavailable");
    if (diverged) syncStates.push("Diverged");
    if (conflict) syncStates.push("Conflict");
    if (!syncStates.length) syncStates.push("Synced");

    const diffStat = dirty
      ? await optionalGit(root, ["diff", "--stat", "HEAD"])
      : "";
    return {
      enabled: true,
      available: true,
      root,
      branch: branch || null,
      upstream,
      dirty,
      unmerged,
      ahead: trackingCounts?.ahead ?? null,
      behind: trackingCounts?.behind ?? null,
      productionDiffers,
      productionComparisonUnavailable,
      productionAhead: productionCounts?.ahead ?? null,
      productionBehind: productionCounts?.behind ?? null,
      productionChangedFiles,
      localToStudioAhead: localToStudioAssets?.ahead ?? null,
      localToStudioBehind: localToStudioAssets?.behind ?? null,
      localToStudioChangedFiles,
      remoteTrackingRefs: "cached",
      syncStates,
      changedFiles,
      changedFilesTruncated: statusLines.length > MAX_CHANGED_FILES,
      diffStat: diffStat || ""
    };
  } catch {
    return {
      enabled: true,
      available: false,
      syncStates: ["Not synced"],
      changedFiles: [],
      error: "تعذر قراءة حالة Git المحلية. تأكد من تشغيل Studio داخل مستودع Git."
    };
  }
}
