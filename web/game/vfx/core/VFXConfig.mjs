export const DEFAULT_VFX_CONFIG = Object.freeze({
  enabled: true,
  quality: "high",
  limits: Object.freeze({
    maxActiveBursts: 24,
    burstLifetimeMs: 360
  }),
  qualityProfiles: Object.freeze({
    low: Object.freeze({ particleScale: 0.5, maxParticlesPerEffect: 5, maxActiveBursts: 8 }),
    medium: Object.freeze({ particleScale: 0.75, maxParticlesPerEffect: 9, maxActiveBursts: 16 }),
    high: Object.freeze({ particleScale: 1, maxParticlesPerEffect: 16, maxActiveBursts: 24 })
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
function resolveVFXQuality(isMobile, navigatorInfo) {
  const memory = Number(navigatorInfo?.deviceMemory) || 0;
  const cores = Number(navigatorInfo?.hardwareConcurrency) || 0;
  const weakMemory = memory > 0 && memory <= 3;
  const weakCpu = cores > 0 && cores <= 4;

  if (weakMemory || weakCpu) return "low";
  if (isMobile) return memory >= 6 && cores >= 8 ? "high" : "medium";
  if ((memory > 0 && memory < 8) || (cores > 0 && cores < 8)) return "medium";
  return "high";
}

export function detectVFXQuality(scene, navigatorInfo = globalThis.navigator) {
  const os = scene?.sys?.game?.device?.os || {};
  const isMobile = Boolean(os.android || os.iOS || os.iPhone || os.iPad);
  return resolveVFXQuality(isMobile, navigatorInfo);
}

export function detectBrowserVFXQuality(navigatorInfo = globalThis.navigator, userAgent = navigatorInfo?.userAgent || "") {
  const isMobile = Boolean(
    navigatorInfo?.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
  );
  return resolveVFXQuality(isMobile, navigatorInfo);
}

const RENDER_RESOLUTION_CAPS = Object.freeze({ low: 1.25, medium: 1.75, high: 2.5 });

export function getGameRenderResolution(devicePixelRatio, quality = "high") {
  const ratio = Number(devicePixelRatio);
  const nativeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const cap = RENDER_RESOLUTION_CAPS[quality] || RENDER_RESOLUTION_CAPS.high;
  return Math.min(Math.max(1, nativeRatio), cap);
}


/**
 * Enable high-quality mipmap sampling only on capable devices. Phaser creates
 * mipmaps only for power-of-two textures; keeping them off on lower tiers
 * avoids the additional GPU texture memory cost on constrained devices.
 */
export function getGameMipmapFilter(quality = "low") {
  return quality === "high" ? "LINEAR_MIPMAP_LINEAR" : undefined;
}
