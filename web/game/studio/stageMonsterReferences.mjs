const BUILTIN_MONSTER_IDS = new Set(["monster-01"]);

export function getStageMonsterReferences(config, monsterId) {
  const targetId = typeof monsterId === "string" ? monsterId.trim().toLowerCase() : "";
  if (!targetId) return [];
  const stages = config?.stages && typeof config.stages === "object" ? config.stages : {};
  const references = [];
  for (const [stageId, stage] of Object.entries(stages)) {
    const monsters = Array.isArray(stage?.monsters) ? stage.monsters : [];
    for (const entry of monsters) {
      if (String(entry?.id || "").trim().toLowerCase() !== targetId) continue;
      references.push({
        stageId: String(stageId),
        wave: Number(entry.wave) || 1,
        key: String(entry.key || ""),
        enabled: entry.enabled !== false
      });
    }
  }
  return references;
}

export function validateStageMonsterReferences(config, assets = []) {
  const available = new Set(BUILTIN_MONSTER_IDS);
  for (const asset of Array.isArray(assets) ? assets : []) {
    if (asset?.type === "monster" && asset?.status !== "archived" && typeof asset.id === "string") {
      available.add(asset.id.trim().toLowerCase());
    }
  }
  const missing = [];
  const stages = config?.stages && typeof config.stages === "object" ? config.stages : {};
  for (const [stageId, stage] of Object.entries(stages)) {
    for (const entry of Array.isArray(stage?.monsters) ? stage.monsters : []) {
      const id = String(entry?.id || "").trim().toLowerCase();
      if (id && !available.has(id)) missing.push({ stageId: String(stageId), wave: Number(entry.wave) || 1, id, enabled: entry.enabled !== false });
    }
  }
  return missing;
}
