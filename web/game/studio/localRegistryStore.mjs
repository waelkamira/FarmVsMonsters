import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { assertExpectedContentSha } from "./registryConcurrency.mjs";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function conflict(message) {
  const error = new Error(message);
  error.code = "STUDIO_WRITE_CONFLICT";
  return error;
}

export async function readLocalRegistrySnapshot(targetPath) {
  try {
    const raw = await readFile(targetPath, "utf8");
    const registry = JSON.parse(raw);
    if (!registry || typeof registry !== "object" || !Array.isArray(registry.assets)) {
      throw new Error("سجل أصول Studio المحلي غير صالح؛ لم يتم تغييره.");
    }
    return { registry, sha: digest(raw) };
  } catch (error) {
    if (error.code === "ENOENT") return { registry: { version: 1, assets: [] }, sha: null };
    throw error;
  }
}

async function acquireExclusiveLock(lockPath, staleLockMs) {
  try {
    return await open(lockPath, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }

  const lockStat = await stat(lockPath).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (lockStat && Date.now() - lockStat.mtimeMs > staleLockMs) {
    let ownerPid = null;
    try {
      ownerPid = Number(JSON.parse(await readFile(lockPath, "utf8")).pid);
    } catch {
      // A malformed old lock can be reclaimed after the stale threshold.
    }
    let ownerAlive = false;
    if (Number.isInteger(ownerPid) && ownerPid > 0) {
      try {
        process.kill(ownerPid, 0);
        ownerAlive = true;
      } catch (error) {
        ownerAlive = error.code !== "ESRCH";
      }
    }
    if (!ownerAlive) {
      const stalePath = lockPath + ".stale-" + randomUUID();
      try {
        // Atomic rename ensures only one contender can claim a stale lock.
        await rename(lockPath, stalePath);
        await unlink(stalePath).catch(() => {});
        try {
          return await open(lockPath, "wx");
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }

  throw conflict("سجل Studio قيد التعديل من عملية أخرى. أعد تحميل المكتبة ثم حاول مجدداً.");
}

export async function writeLocalRegistryAtomically(targetPath, registry, expectedSha, options = {}) {
  if (!registry || typeof registry !== "object" || !Array.isArray(registry.assets)) {
    throw new TypeError("Refusing to write an invalid Studio asset registry.");
  }
  const lockPath = targetPath + ".lock";
  const staleLockMs = Number.isFinite(options.staleLockMs)
    ? Math.max(60_000, options.staleLockMs)
    : 10 * 60 * 1000;
  await mkdir(path.dirname(targetPath), { recursive: true });

  const lockHandle = await acquireExclusiveLock(lockPath, staleLockMs);
  const temporaryPath = targetPath + ".tmp-" + randomUUID();
  try {
    await lockHandle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    await lockHandle.sync();

    let currentRaw = null;
    try {
      currentRaw = await readFile(targetPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    assertExpectedContentSha(expectedSha, currentRaw === null ? null : digest(currentRaw));

    const serialized = JSON.stringify(registry, null, 2) + "\n";
    await writeFile(temporaryPath, serialized, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, targetPath);
    return digest(serialized);
  } finally {
    await unlink(temporaryPath).catch(() => {});
    await lockHandle.close().catch(() => {});
    await unlink(lockPath).catch(() => {});
  }
}
