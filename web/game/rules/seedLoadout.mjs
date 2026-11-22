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

export function normalizeSeedLoadout(selectedIds, unlockedIds) {
  const unlocked = new Set(
    Array.isArray(unlockedIds)
      ? unlockedIds.filter((id) => SEED_PACKET_IDS.includes(id))
      : REQUIRED_STARTER_SEEDS
  );
  REQUIRED_STARTER_SEEDS.forEach((id) => unlocked.add(id));

  const selectedExtras = [];
  const source = Array.isArray(selectedIds) ? selectedIds : [];
  for (const id of source) {
    if (
      unlocked.has(id) &&
      !REQUIRED_STARTER_SEEDS.includes(id) &&
      !selectedExtras.includes(id) &&
      selectedExtras.length < MAX_SEED_PACKETS - REQUIRED_STARTER_SEEDS.length
    ) {
      selectedExtras.push(id);
    }
  }

  return [...REQUIRED_STARTER_SEEDS, ...selectedExtras];
}

export function createDefaultSeedLoadout(unlockedIds) {
  const unlocked = new Set(Array.isArray(unlockedIds) ? unlockedIds : REQUIRED_STARTER_SEEDS);
  return normalizeSeedLoadout(
    [...REQUIRED_STARTER_SEEDS, ...SEED_PACKET_IDS.filter((id) => unlocked.has(id))],
    unlockedIds
  );
}
