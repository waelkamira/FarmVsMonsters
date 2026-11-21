export const STUDIO_MONSTER_ARCHETYPES = Object.freeze(["cave-brute", "dust-skitter", "stonehide", "alpha-brute"]);
const LIMITS = Object.freeze({
  hpMultiplier: [0.25, 4],
  speedMultiplier: [0.25, 2],
  damageMultiplier: [0.25, 3],
  attackIntervalMultiplier: [0.25, 3],
  widthScale: [0.5, 2],
  heightScale: [0.5, 2],
  spawnWeight: [0, 100],
  firstWave: [1, 10]
});
function bounded(value, field, fallback) {
  const number = Number(value ?? fallback);
  const [min, max] = LIMITS[field];
  if (!Number.isFinite(number) || number < min || number > max) throw new RangeError(field + " must be between " + min + " and " + max + ".");
  return Math.round(number * 100) / 100;
}
export function createStudioMonsterProfile(input = {}) {
  const profile = input && typeof input === "object" ? input : {};
  const baseArchetype = String(profile.baseArchetype || "cave-brute");
  if (!STUDIO_MONSTER_ARCHETYPES.includes(baseArchetype)) throw new RangeError("Choose a supported base monster archetype.");
  return Object.freeze({
    baseArchetype,
    hpMultiplier: bounded(profile.hpMultiplier, "hpMultiplier", 1),
    speedMultiplier: bounded(profile.speedMultiplier, "speedMultiplier", 1),
    damageMultiplier: bounded(profile.damageMultiplier, "damageMultiplier", 1),
    attackIntervalMultiplier: bounded(profile.attackIntervalMultiplier, "attackIntervalMultiplier", 1),
    widthScale: bounded(profile.widthScale, "widthScale", 1),
    heightScale: bounded(profile.heightScale, "heightScale", 1),
    spawnWeight: bounded(profile.spawnWeight, "spawnWeight", 0),
    firstWave: bounded(profile.firstWave, "firstWave", 1)
  });
}
export function resolveStudioMonsterRuntimeProfile(base, custom) {
  if (!base || !custom) throw new TypeError("A base combat profile and a Studio monster profile are required.");
  return Object.freeze({
    ...base,
    hp: Math.max(1, Math.round(base.hp * custom.hpMultiplier)),
    maxHp: Math.max(1, Math.round(base.hp * custom.hpMultiplier)),
    speed: base.speed * custom.speedMultiplier,
    plantDamage: Math.max(1, Math.round(base.plantDamage * custom.damageMultiplier)),
    attackIntervalMs: Math.max(250, Math.round(base.attackIntervalMs * custom.attackIntervalMultiplier)),
    widthScale: base.widthScale * custom.widthScale,
    heightScale: base.heightScale * custom.heightScale
  });
}
export function selectWeightedStudioMonster(monsters, wave, randomInt) {
  if (!Array.isArray(monsters) || typeof randomInt !== "function") return null;
  const candidates = monsters.filter((monster) => monster?.monsterProfile?.spawnWeight > 0 && monster.monsterProfile.firstWave <= wave);
  const totalWeight = candidates.reduce((sum, monster) => sum + monster.monsterProfile.spawnWeight, 0);
  if (!totalWeight) return null;
  let roll = randomInt(1, totalWeight);
  for (const monster of candidates) {
    roll -= monster.monsterProfile.spawnWeight;
    if (roll <= 0) return monster;
  }
  return candidates[candidates.length - 1] || null;
}
