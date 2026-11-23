export const AI_ANIMATION_MOTIONS = [
  { id: "idle", label: "الخمول", english: "Idle", loop: true, prompt: "Animate this exact character in a subtle seamless idle loop. Preserve the exact silhouette, face, colors, proportions and identifying details. Add gentle breathing, tiny natural leaf or body sway, and blinking only if the reference already has eyes. Keep the root planted and the camera locked." },
  { id: "walk", label: "المشي", english: "Walk", loop: true, prompt: "Animate this exact character walking in place with a clear readable repeating gait appropriate to its anatomy. Preserve identity, silhouette, colors and proportions. Keep camera locked and framing fixed." },
  { id: "run", label: "الركض", english: "Run", loop: true, prompt: "Animate this exact character running in place with energetic, readable, anatomically appropriate motion. Preserve identity, silhouette, colors and proportions. Keep camera locked and framing fixed." },
  { id: "fly", label: "الطيران", english: "Fly", loop: true, prompt: "Animate this exact character flying or hovering, moving only the parts that logically enable flight. Preserve identity and silhouette. Keep camera locked and framing fixed." },
  { id: "attack", label: "الهجوم", english: "Attack", loop: false, prompt: "Animate this exact character performing its attack. Build a clear anticipation, attack action, release moment and recovery. Preserve the character design and keep the camera locked. Leave clear space in front for a separately rendered projectile; do not permanently attach a projectile to the character." },
  { id: "hurt", label: "الإصابة", english: "Hurt", loop: false, prompt: "Animate this exact character reacting to a hit with a short readable recoil and hurt expression if a face exists. Preserve identity, proportions and all parts. Keep camera locked." },
  { id: "death", label: "الموت", english: "Death", loop: false, prompt: "Animate this exact character in a clear final defeat/death action appropriate to its design. Keep the full character visible until the motion finishes. Preserve its identity and avoid morphing or adding objects. Keep camera locked." }
];

export const DEFAULT_NEGATIVE_PROMPT = "redesign, reinterpretation, morphing, changing silhouette, changing colors, changing face, extra limbs, missing leaves, duplicated parts, extra characters, extra objects, camera movement, zoom, cuts, scene change, perspective change, rotation, flipping, stretching, cropping, flicker, motion blur, text, logo, watermark, gradients, scenery, shadows touching the chroma background";

export function createMotionSettings(motion, overrides = {}) {
  const known = AI_ANIMATION_MOTIONS.find((item) => item.id === motion);
  if (!known) throw new TypeError("Unknown animation motion: " + motion);
  const frames = Number(overrides.frames ?? 24);
  const fps = Number(overrides.fps ?? 12);
  const width = Number(overrides.width ?? 832);
  const height = Number(overrides.height ?? 480);
  const durationSeconds = Number(overrides.durationSeconds ?? 2);
  const frameWidth = Number(overrides.frameWidth ?? 150);
  const frameHeight = Number(overrides.frameHeight ?? 150);
  const columns = Math.min(frames, Number(overrides.columns ?? 6));
  if (!Number.isInteger(frames) || frames < 2 || frames > 96) throw new RangeError("Frame count must be between 2 and 96.");
  if (!Number.isInteger(fps) || fps < 1 || fps > 30) throw new RangeError("FPS must be between 1 and 30.");
  if (!Number.isInteger(width) || width < 64 || width > 1920 || !Number.isInteger(height) || height < 64 || height > 1080) throw new RangeError("Invalid video dimensions.");
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0.5 || durationSeconds > 12) throw new RangeError("Video duration must be between 0.5 and 12 seconds.");
  if (!Number.isInteger(frameWidth) || frameWidth < 32 || frameWidth > 512 || !Number.isInteger(frameHeight) || frameHeight < 32 || frameHeight > 512) throw new RangeError("Sprite frame dimensions must be between 32 and 512 pixels.");
  if (!Number.isInteger(columns) || columns < 1 || columns > frames) throw new RangeError("Sprite sheet columns must be between 1 and the frame count.");
  return {
    id: known.id, label: known.label, english: known.english, loop: known.loop,
    selected: overrides.selected !== false,
    prompt: String(overrides.prompt ?? known.prompt).slice(0, 3000),
    negativePrompt: String(overrides.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT).slice(0, 3000),
    frames, fps, width, height, durationSeconds, frameWidth, frameHeight, columns,
    seed: Number.isInteger(overrides.seed) && overrides.seed >= 0 ? overrides.seed : null,
    status: "selected",
    videoPath: null, videoApprovedAt: null, spriteStatus: "not_started",
    outputPath: null, atlasJsonPath: null, validationPath: null, error: null
  };
}

export function assertMotionTransition(motion, action) {
  const allowed = {
    "approve-video": ["video_review"],
    "reject-video": ["video_review", "video_approved"],
    "approve-sprites": ["sprite_review"],
    "reject-sprites": ["sprite_review", "sprite_approved"]
  };
  if (!allowed[action] || !allowed[action].includes(motion.status)) {
    throw new Error("Invalid action for current motion state.");
  }
}

export function safeAiJobId(value) {
  return typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value);
}
