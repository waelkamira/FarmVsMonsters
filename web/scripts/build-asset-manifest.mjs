import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const assetsRoot = path.join(webRoot, "public", "assets");
const outputPath = path.join(assetsRoot, "asset-manifest.json");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".avif"]);
const AUDIO_EXTENSIONS = new Set([".ogg", ".mp3", ".wav", ".m4a"]);

function imageDimensions(buffer, extension) {
  if (extension === ".png" && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (extension === ".webp" && buffer.length >= 30 && buffer.toString("ascii", 12, 16) === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  if (extension === ".svg") {
    const source = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
    const viewBox = source.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)["']/i);
    const width = source.match(/\bwidth=["']([\d.]+)/i);
    const height = source.match(/\bheight=["']([\d.]+)/i);
    if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
    if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return null;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile() && absolute !== outputPath) files.push(absolute);
  }
  return files;
}

function groupFor(relativePath) {
  const parts = relativePath.split(path.sep);
  return parts.length > 1 ? parts[0] : "misc";
}

function assetKey(relativePath) {
  return relativePath.replace(/\.[^.]+$/, "").replace(/[\\/\s]+/g, "-").replace(/[^\w-]/g, "-").toLowerCase();
}

const paths = (await walk(assetsRoot)).sort();
const assets = [];
const hashes = new Map();
const duplicates = [];
let totalBytes = 0;

for (const absolutePath of paths) {
  const extension = path.extname(absolutePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension) && !AUDIO_EXTENSIONS.has(extension)) continue;
  const buffer = await readFile(absolutePath);
  const relativePath = path.relative(assetsRoot, absolutePath).split(path.sep).join("/");
  const digest = createHash("sha256").update(buffer).digest("hex");
  const info = await stat(absolutePath);
  const type = AUDIO_EXTENSIONS.has(extension) ? "audio" : extension === ".svg" ? "svg" : "image";
  const dimensions = type === "audio" ? null : imageDimensions(buffer, extension);
  const entry = {
    key: assetKey(relativePath),
    url: `/assets/${relativePath}`,
    type,
    group: groupFor(relativePath),
    bytes: info.size,
    sha256: digest,
    ...(dimensions ? dimensions : {})
  };
  assets.push(entry);
  totalBytes += info.size;
  if (hashes.has(digest)) duplicates.push({ file: relativePath, identicalTo: hashes.get(digest), bytes: info.size });
  else hashes.set(digest, relativePath);
}

const groups = {};
for (const asset of assets) (groups[asset.group] ||= []).push({
  key: asset.key,
  url: asset.url,
  type: asset.type
});

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  assetCount: assets.length,
  totalBytes,
  groups,
  assets
};

await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({
  manifest: path.relative(webRoot, outputPath),
  assetCount: assets.length,
  totalMiB: Number((totalBytes / 1024 / 1024).toFixed(2)),
  groups: Object.fromEntries(Object.entries(groups).map(([name, entries]) => [name, entries.length])),
  exactDuplicates: duplicates
}, null, 2));
