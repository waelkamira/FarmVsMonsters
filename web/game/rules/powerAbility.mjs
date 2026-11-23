export const POWER_ABILITY_COST = 50;
export const POWER_BURST_SHOTS = 10;
export const POWER_BURST_INTERVAL_MS = 90;

export function createPowerBurstSchedule() {
  return Array.from({ length: POWER_BURST_SHOTS }, (_, index) => index * POWER_BURST_INTERVAL_MS);
}

export function canUsePlantPower(plant, energy) {
  const rangedTypes = new Set(["radish", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom", "corn-monster"]);
  const studioRanged = plant?.studioPlant?.combat?.mode === "projectile";
  return Boolean(plant?.alive && (rangedTypes.has(plant.type) || studioRanged) && Number(energy) >= POWER_ABILITY_COST);
}
