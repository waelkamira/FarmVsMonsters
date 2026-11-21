export const STUDIO_PLANT_BEHAVIORS = Object.freeze({
  projectile: Object.freeze({ label: "إطلاق مقذوفات", description: "يطلق قذيفة مرتبطة بهذه النبتة." }),
  blocker: Object.freeze({ label: "حاجز دفاعي", description: "يمتص عضّات الوحوش ويوقف تقدمها دون إطلاق مقذوفات." }),
  melee: Object.freeze({ label: "هجوم قريب", description: "يضرب أقرب وحش في المسار عندما يدخل نطاق الهجوم." }),
  contact: Object.freeze({ label: "ضرر تلامسي", description: "يلحق الضرر بالوحش أثناء توقفه لعض النبتة." }),
  energy: Object.freeze({ label: "منتج طاقة", description: "ينتج وحدات طاقة قابلة للجمع على فترات محددة." })
});

const LIMITS = Object.freeze({
  energyCost: [0, 250],
  hp: [1, 5000],
  cooldownMs: [250, 30000],
  damage: [1, 1000],
  range: [24, 500],
  projectileSpeed: [60, 1200],
  projectileHeight: [0, 300],
  projectileRotation: [0, 360],
  projectileCollisionRadius: [4, 100],
  energyAmount: [1, 100],
  energyIntervalMs: [1000, 120000],
  sizePercent: [25, 200]
});

function boundedNumber(value, field, fallback) {
  const numeric = Number(value ?? fallback);
  const [min, max] = LIMITS[field];
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new RangeError(`Invalid plant setting: ${field} must be between ${min} and ${max}.`);
  }
  return Math.round(numeric);
}

export function createStudioPlantCombatProfile({
  projectile = null,
  behavior = "melee",
  energyCost = 60,
  hp = 150,
  cooldownMs = 1800,
  damage = 30,
  range = 180,
  projectileSpeed = 280,
  projectileHeight = 0,
  projectileEffectColor = "#ffc247",
  projectileRotation = 0,
  projectileTrajectoryType = "arc",
  projectileCurveX = 0,
  projectileCurveY = 110,
  projectileLaunchOffsetX = 14,
  projectileLaunchOffsetY = -30,
  projectileCollisionRadius = 22,
  energyAmount = 15,
  energyIntervalMs = 12000,
  sizePercent = 100
} = {}) {
  const mode = behavior;
  if (mode !== "projectile" && !Object.hasOwn(STUDIO_PLANT_BEHAVIORS, mode)) {
    throw new RangeError("Choose a supported attack or defense behavior for this plant.");
  }
  if (mode === "projectile" && (!projectile?.path || !projectile?.id)) {
    throw new RangeError("A projectile plant must have an associated projectile asset.");
  }
  const projectileFrameCount = Number(projectile?.frameCount ?? 1);
  const projectileRows = Number(projectile?.rows ?? 1);
  const projectileColumns = Number(projectile?.columns ?? 1);
  if (mode === "projectile" && (
    !Number.isInteger(projectileFrameCount) || projectileFrameCount < 1 || projectileFrameCount > 24 ||
    !Number.isInteger(projectileRows) || projectileRows < 1 ||
    !Number.isInteger(projectileColumns) || projectileColumns < 1 ||
    projectileRows * projectileColumns !== projectileFrameCount
  )) {
    throw new RangeError("Projectile Sprite Sheet frame count must match its rows × columns (1–24 frames).");
  }

  return Object.freeze({
    mode,
    projectile: mode === "projectile" ? Object.freeze({
      id: String(projectile.id),
      path: String(projectile.path),
      filename: String(projectile.filename || ""),
      managed: projectile.managed === true,
      frameCount: projectileFrameCount,
      rows: projectileRows,
      columns: projectileColumns
    }) : null,
    energyCost: boundedNumber(energyCost, "energyCost", 60),
    hp: boundedNumber(hp, "hp", 150),
    cooldownMs: boundedNumber(cooldownMs, "cooldownMs", 1800),
    damage: mode === "blocker" || mode === "energy"
      ? 0
      : boundedNumber(damage, "damage", 30),
    range: boundedNumber(range, "range", 180),
    projectileSpeed: boundedNumber(projectileSpeed, "projectileSpeed", 280),
    projectileHeight: boundedNumber(projectileHeight, "projectileHeight", 0),
    projectileEffectColor: (() => { const color = String(projectileEffectColor ?? "#ffc247").trim().toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(color)) throw new RangeError("Invalid plant setting: projectileEffectColor must be a six-digit hex color."); return color; })(),
    projectileRotation: boundedNumber(projectileRotation, "projectileRotation", 0),
    projectileTrajectoryType: (() => { const value = String(projectileTrajectoryType || "arc"); if (!["straight","arc","sine","bezier"].includes(value)) throw new RangeError("Invalid projectile trajectory type."); return value; })(),
    projectileCurveX: Math.max(-180, Math.min(180, Math.round(Number(projectileCurveX) || 0))),
    projectileCurveY: Math.max(-300, Math.min(300, Math.round(Number(projectileCurveY) || 0))),
    projectileLaunchOffsetX: Math.max(-70, Math.min(70, Math.round(Number(projectileLaunchOffsetX) || 0))),
    projectileLaunchOffsetY: Math.max(-120, Math.min(120, Math.round(Number(projectileLaunchOffsetY) || 0))),
    projectileCollisionRadius: boundedNumber(projectileCollisionRadius, "projectileCollisionRadius", 22),
    energyAmount: boundedNumber(energyAmount, "energyAmount", 15),
    energyIntervalMs: boundedNumber(energyIntervalMs, "energyIntervalMs", 12000),
    sizePercent: boundedNumber(sizePercent, "sizePercent", 100)
  });
}

export function validateStudioPlantCombatProfile(input) {
  try {
    return { valid: true, profile: createStudioPlantCombatProfile(input), errors: [] };
  } catch (error) {
    return { valid: false, profile: null, errors: [error.message] };
  }
}
