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
  if (!pullRequest) return { ...asset, status: "testing", releaseRequest: null };
  if (pullRequest.merged) {
    return { ...asset, status: "published", publishedAt: pullRequest.mergedAt || asset.publishedAt, releaseRequest: { ...asset.releaseRequest, state: "merged" } };
  }
  if (pullRequest.state === "open") {
    return { ...asset, status: "approved", releaseRequest: { ...asset.releaseRequest, state: "open" } };
  }
  return { ...asset, status: "testing", releaseRequest: null };
}
