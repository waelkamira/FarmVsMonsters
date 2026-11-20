import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const assetsRoot = path.join(webRoot, "public", "assets");
const outputPath = path.join(assetsRoot, "asset-manifest.json");
const auditPath = path.join(assetsRoot, "asset-audit.json");

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

const SPRITESHEET_OVERRIDES = {
  "plants/pineapple-level-1.png": { key: "pineapple-level-1", type: "spritesheet", frameConfig: { frameWidth: 418, frameHeight: 418, margin: 0, spacing: 0 } },
  "plants/hazelnut-level-1.png": { key: "hazelnut-level-1", type: "spritesheet", frameConfig: { frameWidth: 341, frameHeight: 341, margin: 0, spacing: 0 } },
  "items/currency/gold-coin.png": { key: "gold-coin", type: "spritesheet", frameConfig: { frameWidth: 170, frameHeight: 170 } },
  "characters/farmer/farmer-run.png": { key: "farmer-run", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 430 } },
  "characters/farmer/farmer-walk.png": { key: "farmer-walk", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 430 } },
  "characters/farmer/farmer-jump.png": { key: "farmer-jump", type: "spritesheet", frameConfig: { frameWidth: 216, frameHeight: 720 } },
  "characters/farmer/farmer-idle.png": { key: "farmer-idle", type: "spritesheet", frameConfig: { frameWidth: 540, frameHeight: 360 } },
  "characters/farmer/farmer-plant.png": { key: "farmer-plant", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 430 } },
  "characters/farmer/farmer-collect.png": { key: "farmer-collect", type: "spritesheet", frameConfig: { frameWidth: 180, frameHeight: 360 } },
  "characters/farmer/farmer-uproot.png": { key: "farmer-uproot", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 430 } },
  "characters/farmer/farmer-attack.png": { key: "farmer-attack", type: "spritesheet", frameConfig: { frameWidth: 180, frameHeight: 360 } },
  "characters/farmer/farmer-hit.png": { key: "farmer-hit", type: "spritesheet", frameConfig: { frameWidth: 152, frameHeight: 430 } },
  "characters/farmer/farmer-death.png": { key: "farmer-death", type: "spritesheet", frameConfig: { frameWidth: 152, frameHeight: 430 } },
  "characters/monsters/dragon/dragon-boss.png": { key: "dragon-boss", type: "spritesheet", frameConfig: { frameWidth: 512, frameHeight: 512 } },
  "characters/monsters/hyena/hyena-idle.png": { key: "hyena-idle", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 298 } },
  "characters/monsters/hyena/hyena-walk.png": { key: "hyena-walk", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 298 } },
  "characters/monsters/hyena/hyena-run1.png": { key: "hyena-run", type: "spritesheet", frameConfig: { frameWidth: 367, frameHeight: 298 } },
  "characters/monsters/hyena/hyena-bite.png": { key: "hyena-bite", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 447 } },
  "characters/monsters/hyena/hyena-hit.png": { key: "hyena-hit", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 894 } },
  "characters/monsters/hyena/hyena-death.png": { key: "hyena-death", type: "spritesheet", frameConfig: { frameWidth: 360, frameHeight: 447 } }
};

function groupFor(relativePath) {
  const parts = relativePath.split("/");
  if (parts[0] === "characters" || parts[0] === "items") return parts.slice(0, 2).join("/");
  return parts.length > 1 ? parts[0] : "misc";
}

function assetKey(relativePath) {
  return relativePath.replace(/\.[^.]+$/, "").replace(/[\\/\s]+/g, "-").replace(/[^\w-]/g, "-").toLowerCase();
}

const paths = (await walk(assetsRoot)).sort();
const assets = [];
const hashes = new Map();
const keys = new Map();
const duplicates = [];
let totalBytes = 0;

for (const absolutePath of paths) {
  const extension = path.extname(absolutePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension) && !AUDIO_EXTENSIONS.has(extension)) continue;
  const buffer = await readFile(absolutePath);
  const relativePath = path.relative(assetsRoot, absolutePath).split(path.sep).join("/");
  const digest = createHash("sha256").update(buffer).digest("hex");
  const info = await stat(absolutePath);
  const override = SPRITESHEET_OVERRIDES[relativePath] || {};
  const type = override.type || (AUDIO_EXTENSIONS.has(extension) ? "audio" : extension === ".svg" ? "svg" : "image");
  const fileName = path.basename(relativePath, extension);
  const defaultKey = type === "audio" && relativePath.startsWith("audio/sfx/") ? `sfx-${fileName}` : assetKey(relativePath);
  const key = override.key || defaultKey;
  if (keys.has(key)) throw new Error(`Asset key collision: "${key}" is used by both "${keys.get(key)}" and "${relativePath}"`);
  keys.set(key, relativePath);
  const dimensions = type === "audio" ? null : imageDimensions(buffer, extension);
  const entry = {
    key,
    url: `/assets/${relativePath}`,
    type,
    group: groupFor(relativePath),
    bytes: info.size,
    sha256: digest,
    ...(override.frameConfig ? { frameConfig: override.frameConfig } : {}),
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
  type: asset.type,
  ...(asset.frameConfig ? { frameConfig: asset.frameConfig } : {})
});


const largeFiles = assets.filter((asset) => {
  const limit = asset.type === "audio" ? 3 * 1024 * 1024 : 1.5 * 1024 * 1024;
  return asset.bytes > limit;
}).map((asset) => ({ key: asset.key, url: asset.url, type: asset.type, bytes: asset.bytes }));

const groupSummary = Object.fromEntries(Object.entries(groups).map(([name, entries]) => [name, {
  assetCount: entries.length,
  totalBytes: assets.filter((asset) => asset.group === name).reduce((sum, asset) => sum + asset.bytes, 0)
}]));
const spritesheets = assets.filter((asset) => asset.type === "spritesheet").map((asset) => ({
  key: asset.key, url: asset.url, bytes: asset.bytes, frameConfig: asset.frameConfig
}));
const audit = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  assetCount: assets.length,
  totalBytes,
  groups: groupSummary,
  exactDuplicates: duplicates,
  largeFiles,
  spritesheets
};
await writeFile(auditPath, JSON.stringify(audit, null, 2) + "\n");

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
  audit: path.relative(webRoot, auditPath),
  largeFiles: largeFiles.length,
  assetCount: assets.length,
  totalMiB: Number((totalBytes / 1024 / 1024).toFixed(2)),
  groups: Object.fromEntries(Object.entries(groups).map(([name, entries]) => [name, entries.length])),
  exactDuplicates: duplicates
}, null, 2));
