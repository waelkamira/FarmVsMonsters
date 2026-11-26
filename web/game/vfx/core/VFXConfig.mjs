export const DEFAULT_VFX_CONFIG = Object.freeze({
  enabled: true,
  quality: "high",
  limits: Object.freeze({
    maxActiveBursts: 24,
    burstLifetimeMs: 360
  }),
  qualityProfiles: Object.freeze({
    low: Object.freeze({ particleScale: 0.5, maxParticlesPerEffect: 5 }),
    medium: Object.freeze({ particleScale: 0.75, maxParticlesPerEffect: 9 }),
    high: Object.freeze({ particleScale: 1, maxParticlesPerEffect: 16 })
  })
});

const QUALITY_LEVELS = new Set(["low", "medium", "high"]);

export function createVFXConfig(overrides = {}) {
  const quality = QUALITY_LEVELS.has(overrides.quality)
    ? overrides.quality
    : DEFAULT_VFX_CONFIG.quality;
  const limits = { ...DEFAULT_VFX_CONFIG.limits, ...(overrides.limits || {}) };

  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`VFX config limit "${key}" must be a non-negative number`);
    }
  }

  return Object.freeze({
    ...DEFAULT_VFX_CONFIG,
    ...overrides,
    enabled: overrides.enabled !== false,
    quality,
    limits: Object.freeze(limits),
    qualityProfile: DEFAULT_VFX_CONFIG.qualityProfiles[quality]
  });
}

export default DEFAULT_VFX_CONFIG;


/**
 * Choose one shared visual-effects budget for every battle VFX subsystem.
 * Hardware hints are advisory: unknown desktop capabilities keep the high
 * profile, while unknown mobile capabilities use medium as a safe fallback.
 */
export function detectVFXQuality(scene, navigatorInfo = globalThis.navigator) {
  const os = scene?.sys?.game?.device?.os || {};
  const isMobile = Boolean(os.android || os.iOS || os.iPhone || os.iPad);
  const memory = Number(navigatorInfo?.deviceMemory) || 0;
  const cores = Number(navigatorInfo?.hardwareConcurrency) || 0;
  const weakMemory = memory > 0 && memory <= 3;
  const weakCpu = cores > 0 && cores <= 4;

  if (weakMemory || weakCpu) return "low";

  if (isMobile) {
    return memory >= 6 && cores >= 8 ? "high" : "medium";
  }

  if ((memory > 0 && memory < 8) || (cores > 0 && cores < 8)) return "medium";
  return "high";
}
