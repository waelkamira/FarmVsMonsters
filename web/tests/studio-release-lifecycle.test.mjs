import test from "node:test";
import assert from "node:assert/strict";
import { createStudioReleaseBranchName, resolveStudioReleaseAsset, transitionStudioAssetStatus } from "../game/studio/releaseLifecycle.mjs";

const asset = { id: "test-plant", status: "testing", releaseRequest: { number: 123, url: "https://github.com/example/repo/pull/123", branch: "studio/release/test-plant-abcdef12" } };

test("builds a unique, safe Studio release branch name", () => {
  assert.equal(createStudioReleaseBranchName("test-plant", "abcdef12"), "studio/release/test-plant-abcdef12");
  assert.throws(() => createStudioReleaseBranchName("../main", "abcdef12"), /Invalid Studio release branch identity/);
  assert.throws(() => createStudioReleaseBranchName("test-plant", "not-a-hash"), /Invalid Studio release branch identity/);
});

test("shows an open release pull request as awaiting review", () => {
  const result = resolveStudioReleaseAsset(asset, { state: "open", merged: false });
  assert.equal(result.status, "approved");
  assert.equal(result.releaseRequest.state, "open");
  assert.equal(result.releaseRequest.number, 123);
});

test("shows a merged release pull request as published", () => {
  const result = resolveStudioReleaseAsset(asset, { state: "closed", merged: true, mergedAt: "2026-11-21T10:00:00.000Z" });
  assert.equal(result.status, "published");
  assert.equal(result.publishedAt, "2026-11-21T10:00:00.000Z");
  assert.equal(result.releaseRequest.state, "merged");
});

test("returns a closed unmerged release request to testing", () => {
  const result = resolveStudioReleaseAsset(asset, { state: "closed", merged: false });
  assert.equal(result.status, "testing");
  assert.equal(result.releaseRequest, null);
});

test("does not alter assets without a release request", () => {
  const draft = { id: "draft-plant", status: "draft" };
  assert.equal(resolveStudioReleaseAsset(draft, null), draft);
});

test("archives draft assets of any supported type without deleting their files", () => {
  const draft = { id: "draft-sfx", type: "audio", status: "draft", path: "/assets/audio/draft.ogg" };
  const result = transitionStudioAssetStatus(draft, "archive", "2026-11-21T11:00:00.000Z");
  assert.equal(result.status, "archived");
  assert.equal(result.path, draft.path);
  assert.equal(result.archivedAt, "2026-11-21T11:00:00.000Z");
});

test("restores archived assets of any type as drafts", () => {
  const archived = { id: "old-effect", type: "effect", status: "archived", archivedAt: "2026-11-20T10:00:00.000Z" };
  const result = transitionStudioAssetStatus(archived, "restore", "2026-11-21T11:00:00.000Z");
  assert.equal(result.status, "draft");
  assert.equal(result.archivedAt, null);
  assert.equal(result.updatedAt, "2026-11-21T11:00:00.000Z");
});

test("does not archive published or review-pending assets", () => {
  assert.throws(() => transitionStudioAssetStatus({ id: "live", status: "published" }, "archive"), /لا يمكن أرشفة/);
  assert.throws(() => transitionStudioAssetStatus({ id: "pending", status: "testing", releaseRequest: { number: 7 } }, "archive"), /لا يمكن أرشفة/);
});

test("rejects restoring an asset that is not archived", () => {
  assert.throws(() => transitionStudioAssetStatus({ id: "draft", status: "draft" }, "restore"), /لا يمكن استعادة/);
});

test("does not treat a merged release request as pending after the asset is a draft", () => {
  const mergedDraft = { id: "draft-after-release", status: "draft", releaseRequest: { number: 123, state: "merged" } };
  const result = transitionStudioAssetStatus(mergedDraft, "archive", "2026-11-21T13:00:00.000Z");
  assert.equal(result.status, "archived");
});
