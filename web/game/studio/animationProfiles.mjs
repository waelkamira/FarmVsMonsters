const LIMITS = Object.freeze({ fps: [1, 30] });

function boundedFrame(value, field, frameCount, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 0 || number >= frameCount) {
    throw new RangeError(`Invalid animation setting: ${field} must be a frame index between 0 and ${frameCount - 1}.`);
  }
  return number;
}
function boundedFps(value, field, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < LIMITS.fps[0] || number > LIMITS.fps[1]) {
    throw new RangeError(`Invalid animation setting: ${field} must be between 1 and 30 FPS.`);
  }
  return Math.round(number);
}
export function createStudioAnimationProfile(input = {}, frameCount = 1) {
  const count = Number(frameCount);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new RangeError("Animation frame count must be between 1 and 100.");
  }
  const idleStartFrame = boundedFrame(input.idleStartFrame, "idleStartFrame", count, 0);
  const idleEndFrame = boundedFrame(input.idleEndFrame, "idleEndFrame", count, idleStartFrame);
  const attackStartFrame = boundedFrame(input.attackStartFrame, "attackStartFrame", count, 0);
  const attackEndFrame = boundedFrame(input.attackEndFrame, "attackEndFrame", count, count - 1);
  if (idleEndFrame < idleStartFrame) throw new RangeError("Idle animation end frame cannot be before its start frame.");
  if (attackEndFrame < attackStartFrame) throw new RangeError("Attack animation end frame cannot be before its start frame.");
  return Object.freeze({
    version: 1,
    idle: Object.freeze({
      startFrame: idleStartFrame,
      endFrame: idleEndFrame,
      fps: boundedFps(input.idleFps, "idleFps", 6),
      loop: input.idleLoop === undefined ? true : input.idleLoop === true
    }),
    attack: Object.freeze({
      startFrame: attackStartFrame,
      endFrame: attackEndFrame,
      fps: boundedFps(input.attackFps, "attackFps", 12),
      loop: false
    })
  });
}
export function validateStudioAnimationProfile(input, frameCount) {
  try { return { valid: true, profile: createStudioAnimationProfile(input, frameCount), errors: [] }; }
  catch (error) { return { valid: false, profile: null, errors: [error.message] }; }
}
