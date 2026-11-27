import path from "node:path";
import { resolvePlantSpriteMetadata } from "./spriteSheetGrid.mjs";

function manifestEntries(source) {
  return [
    ...(Array.isArray(source?.assets) ? source.assets : []),
    ...Object.entries(source?.groups || {}).flatMap(([group, items]) =>
      (Array.isArray(items) ? items : []).map((asset) => ({ ...asset, group }))
    )
  ];
}

function idFromUrl(url) {
  return path.basename(url || "").replace(/\.[^.]+$/, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function deletedIdSet(registry) {
  return new Set((Array.isArray(registry?.deletedAssetIds) ? registry.deletedAssetIds : [])
    .map((entry) => typeof entry === "string" ? entry : entry?.id)
    .filter(Boolean));
}

/** Import missing manifest/catalog plants without mutating existing records. */
export function importManifestPlants(registry, manifest, catalog, now = new Date().toISOString()) {
  const next = { ...(registry || {}), version: registry?.version || 1, assets: [...(registry?.assets || [])] };
  const known = new Set(next.assets.map((asset) => asset.id));
  const deleted = deletedIdSet(next);
  const catalogPlants = new Map((Array.isArray(catalog?.plants) ? catalog.plants : []).map((plant) => [plant.id, plant]));
  const candidates = new Map();

  for (const source of [...manifestEntries(manifest), ...manifestEntries(catalog)]) {
    if (source?.group !== "plants" && !source?.path?.startsWith("/assets/plants/")) continue;
    const url = source.url || source.path;
    if (typeof url !== "string" || !url.startsWith("/assets/plants/") || /-bomb(?:-|\.)/i.test(url)) continue;
    const id = idFromUrl(url);
    if (id && !candidates.has(id)) candidates.set(id, { ...source, url });
  }

  let imported = 0;
  for (const [id, source] of candidates) {
    if (known.has(id) || deleted.has(id)) continue;
    const published = catalogPlants.get(id);
    const metadata = resolvePlantSpriteMetadata(source, published);
    next.assets.push({
      ...(published || {}),
      ...source,
      id,
      type: "plant",
      name: published?.name || id,
      filename: path.basename(source.url),
      path: source.url,
      ...metadata,
      status: published ? "published" : "draft",
      createdAt: published?.publishedAt || now,
      updatedAt: now
    });
    known.add(id);
    imported += 1;
  }
  return { registry: next, imported, skippedDeleted: [...candidates.keys()].filter((id) => deleted.has(id)) };
}
