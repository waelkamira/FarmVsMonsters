import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateStudioAssetBytes } from "../game/studio/assetTypes.mjs";

const route = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");

test("accepts valid PNG, WebP, and GIF file signatures", () => {
  assert.equal(validateStudioAssetBytes("image/png", Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00])).valid, true);
  assert.equal(validateStudioAssetBytes("image/webp", Buffer.from("RIFF0000WEBP","ascii")).valid, true);
  assert.equal(validateStudioAssetBytes("image/gif", Buffer.from("GIF89a","ascii")).valid, true);
});

test("accepts valid MP3, WAV, OGG, and MP4 file signatures", () => {
  assert.equal(validateStudioAssetBytes("audio/mpeg", Buffer.from([0x49,0x44,0x33,0x04,0x00,0x00,0x00])).valid, true);
  assert.equal(validateStudioAssetBytes("audio/wav", Buffer.from("RIFF0000WAVE","ascii")).valid, true);
  assert.equal(validateStudioAssetBytes("audio/ogg", Buffer.from("OggS0000","ascii")).valid, true);
  const mp4 = Buffer.alloc(12); mp4.write("ftyp",4,"ascii");
  assert.equal(validateStudioAssetBytes("audio/mp4", mp4).valid, true);
});

test("rejects MIME spoofing, truncated files, and unsupported content types", () => {
  assert.equal(validateStudioAssetBytes("image/png", Buffer.from("<html>fake</html>")).valid, false);
  assert.equal(validateStudioAssetBytes("image/webp", Buffer.from("RIFF0000NOPE")).valid, false);
  assert.equal(validateStudioAssetBytes("audio/wav", Buffer.from("RIFF")).valid, false);
  assert.equal(validateStudioAssetBytes("application/octet-stream", Buffer.from("data")).valid, false);
  assert.equal(validateStudioAssetBytes("image/png", Buffer.alloc(0)).valid, false);
});

test("Studio upload API validates primary and projectile bytes before writing", () => {
  assert.ok(route.includes("validateStudioAssetBytes(projectileFile.type,projectileBytes)"));
  assert.ok(route.includes("validateStudioAssetBytes(file.type,bytes)"));
  assert.ok(route.includes("status:415"));
  assert.ok(route.indexOf("validateStudioAssetBytes(file.type,bytes)") < route.indexOf('githubPutImmutable("web/public/assets/"+relative'));
});
