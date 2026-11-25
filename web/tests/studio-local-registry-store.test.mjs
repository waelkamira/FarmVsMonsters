import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, open, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readLocalRegistrySnapshot, writeLocalRegistryAtomically } from "../game/studio/localRegistryStore.mjs";

async function withTempRegistry(run) {
  const directory = await mkdtemp(path.join(tmpdir(), "fvm-studio-registry-"));
  const target = path.join(directory, "studioAssetRegistry.json");
  try {
    await run(target);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("local registry snapshot starts empty and returns a content hash after creation", async () => {
  await withTempRegistry(async (target) => {
    const empty = await readLocalRegistrySnapshot(target);
    assert.deepEqual(empty.registry, { version: 1, assets: [] });
    assert.equal(empty.sha, null);
    const sha = await writeLocalRegistryAtomically(target, { version: 1, assets: [{ id: "first" }] }, empty.sha);
    assert.match(sha, /^[a-f0-9]{64}$/);
    const saved = await readLocalRegistrySnapshot(target);
    assert.equal(saved.sha, sha);
    assert.equal(saved.registry.assets[0].id, "first");
  });
});

test("local registry rejects a stale expected hash without overwriting newer data", async () => {
  await withTempRegistry(async (target) => {
    const initial = await readLocalRegistrySnapshot(target);
    await writeLocalRegistryAtomically(target, { version: 1, assets: [{ id: "newer" }] }, initial.sha);
    await assert.rejects(
      writeLocalRegistryAtomically(target, { version: 1, assets: [{ id: "stale" }] }, initial.sha),
      (error) => error.code === "STUDIO_WRITE_CONFLICT"
    );
    const saved = await readLocalRegistrySnapshot(target);
    assert.equal(saved.registry.assets[0].id, "newer");
  });
});

test("local registry serializes writers with an exclusive lock", async () => {
  await withTempRegistry(async (target) => {
    const lock = await open(target + ".lock", "wx");
    try {
      await assert.rejects(
        writeLocalRegistryAtomically(target, { version: 1, assets: [{ id: "blocked" }] }, null),
        (error) => error.code === "STUDIO_WRITE_CONFLICT"
      );
    } finally {
      await lock.close();
    }
    const snapshot = await readLocalRegistrySnapshot(target);
    assert.deepEqual(snapshot.registry, { version: 1, assets: [] });
  });
});

test("local registry writes a complete replacement through an atomic temporary file", async () => {
  await withTempRegistry(async (target) => {
    const initial = await readLocalRegistrySnapshot(target);
    const next = { version: 1, assets: [{ id: "atomic", nested: { revision: 3 } }] };
    await writeLocalRegistryAtomically(target, next, initial.sha);
    assert.deepEqual(JSON.parse(await readFile(target, "utf8")), next);
  });
});

test("malformed registry JSON is surfaced instead of being replaced by an empty registry", async () => {
  await withTempRegistry(async (target) => {
    await (await open(target, "w")).close();
    await assert.rejects(readLocalRegistrySnapshot(target), SyntaxError);
  });
});

test("concurrent writes from the same snapshot cannot silently overwrite each other", async () => {
  await withTempRegistry(async (target) => {
    const initial = await readLocalRegistrySnapshot(target);
    const results = await Promise.allSettled([
      writeLocalRegistryAtomically(target, { version: 1, assets: [{ id: "writer-a" }] }, initial.sha),
      writeLocalRegistryAtomically(target, { version: 1, assets: [{ id: "writer-b" }] }, initial.sha)
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason.code === "STUDIO_WRITE_CONFLICT").length, 1);
    const saved = await readLocalRegistrySnapshot(target);
    assert.ok(["writer-a", "writer-b"].includes(saved.registry.assets[0].id));
  });
});
