export const VFX_PRESETS = Object.freeze({
  "impact.light": Object.freeze({ kind: "impact", color: 0xffd98a, radius: 9, sparks: 4, duration: 150, particleColor: [0xffe6a3, 0xffffff] }),
  "impact.heavy": Object.freeze({ kind: "impact", color: 0xffa64d, radius: 17, sparks: 8, duration: 260, particleColor: [0xffa64d, 0xffe0a1, 0xffffff] }),
  "impact.plant": Object.freeze({ kind: "impact", color: 0xffa7b5, radius: 11, sparks: 6, duration: 190, particleColor: [0xff7185, 0x8bd66f, 0xffffff] }),
  "element.fire": Object.freeze({ kind: "fire", color: 0xff8a32, radius: 18, sparks: 10, duration: 320, particleColor: [0xff5b25, 0xffb52e, 0xffe7a0] }),
  "element.electric": Object.freeze({ kind: "electric", color: 0x8ceaff, radius: 16, sparks: 7, duration: 230, particleColor: [0x8ceaff, 0xe6ffff, 0x8d9dff] }),
  "element.ice": Object.freeze({ kind: "ice", color: 0x9ceaff, radius: 20, sparks: 6, duration: 320, particleColor: [0xb9f3ff, 0xffffff, 0x72cfff] })
});

export const VFX_QUALITY = Object.freeze({
  ultra: Object.freeze({ particleScale: 1, maxParticlesPerEffect: 18, maxConcurrentEffects: 36, glow: true, distortion: true }),
  high: Object.freeze({ particleScale: 0.68, maxParticlesPerEffect: 12, maxConcurrentEffects: 24, glow: true, distortion: false }),
  performance: Object.freeze({ particleScale: 0.35, maxParticlesPerEffect: 6, maxConcurrentEffects: 12, glow: false, distortion: false })
});
