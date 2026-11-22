import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
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
    return { registry: JSON.parse(raw), sha: digest(raw) };
  } catch (error) {
    if (error.code === "ENOENT") return { registry: { version: 1, assets: [] }, sha: null };
    throw error;
  }
}

export async function writeLocalRegistryAtomically(targetPath, registry, expectedSha, options = {}) {
  const lockPath = targetPath + ".lock";
  const staleLockMs = Number.isFinite(options.staleLockMs) ? Math.max(1000, options.staleLockMs) : 5 * 60 * 1000;
  await mkdir(path.dirname(targetPath), { recursive: true });

  let lockHandle = null;
  try {
    lockHandle = await open(lockPath, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const lockStat = await stat(lockPath).catch(() => null);
    if (lockStat && Date.now() - lockStat.mtimeMs > staleLockMs) {
      await unlink(lockPath).catch(() => {});
      try {
        lockHandle = await open(lockPath, "wx");
      } catch (retryError) {
        if (retryError.code !== "EEXIST") throw retryError;
      }
    }
  }
  if (!lockHandle) throw conflict("سجل Studio قيد التعديل من عملية أخرى. أعد تحميل المكتبة ثم حاول مجدداً.");

  const temporaryPath = targetPath + ".tmp-" + randomUUID();
  try {
    let currentRaw = null;
    try {
      currentRaw = await readFile(targetPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    assertExpectedContentSha(expectedSha, currentRaw === null ? null : digest(currentRaw));

    const serialized = JSON.stringify(registry, null, 2) + "\n";
    await writeFile(temporaryPath, serialized, "utf8");
    await rename(temporaryPath, targetPath);
    return digest(serialized);
  } finally {
    await unlink(temporaryPath).catch(() => {});
    await lockHandle.close().catch(() => {});
    await unlink(lockPath).catch(() => {});
  }
}
