export const SEED_LOADOUT_STORAGE_KEY = "farmVsMonsters.selectedPlants";
export const MAX_SEED_PACKETS = 6;

export const SEED_PACKET_IDS = Object.freeze([
  "radish",
  "mushroom",
  "pumpkin",
  "pineapple",
  "hazelnut",
  "mango",
  "snow-thrower"
]);

export const REQUIRED_STARTER_SEEDS = Object.freeze(["radish", "mushroom"]);

export function normalizeSeedLoadout(selectedIds, unlockedIds, allowedIds = SEED_PACKET_IDS) {
  const unlocked = new Set(
    Array.isArray(unlockedIds)
      ? unlockedIds.filter((id) => allowedIds.includes(id))
      : REQUIRED_STARTER_SEEDS
  );
  REQUIRED_STARTER_SEEDS.forEach((id) => unlocked.add(id));

  const selected = [];
  const source = Array.isArray(selectedIds) ? selectedIds : [];
  for (const id of source) {
    if (unlocked.has(id) && !selected.includes(id) && selected.length < MAX_SEED_PACKETS) {
      selected.push(id);
    }
  }

  for (const required of REQUIRED_STARTER_SEEDS) {
    if (!selected.includes(required)) {
      if (selected.length >= MAX_SEED_PACKETS) selected.pop();
      selected.unshift(required);
    }
  }

  // Keep the two starter packets in their canonical order, followed by
  // the player's remaining valid selections.
  return [
    ...REQUIRED_STARTER_SEEDS,
    ...selected.filter((id) => !REQUIRED_STARTER_SEEDS.includes(id))
  ].slice(0, MAX_SEED_PACKETS);
}

export function createDefaultSeedLoadout(unlockedIds) {
  const unlocked = new Set(Array.isArray(unlockedIds) ? unlockedIds : REQUIRED_STARTER_SEEDS);
  return normalizeSeedLoadout(
    [...REQUIRED_STARTER_SEEDS, ...SEED_PACKET_IDS.filter((id) => unlocked.has(id))],
    unlockedIds
  );
}
