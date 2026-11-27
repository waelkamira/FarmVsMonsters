import { createHash } from "node:crypto";

export function createImmutableAssetPath(folder, basename, extension, bytes) {
  if (typeof folder !== "string" || !/^[a-z0-9/-]+$/.test(folder) || folder.includes("..")) {
    throw new TypeError("Invalid Studio asset folder.");
  }
  if (typeof basename !== "string" || !/^[a-z0-9-]+$/.test(basename)) {
    throw new TypeError("Invalid Studio asset name.");
  }
  if (typeof extension !== "string" || !/^\.[a-z0-9]+$/.test(extension)) {
    throw new TypeError("Invalid Studio asset extension.");
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new TypeError("Studio asset content must be a non-empty byte array.");
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  return `${folder}/${basename}-${digest}${extension}`;
}
