const DEFAULT_FPS = Object.freeze({ idle: 6, attack: 12 });
function readFrame(value, field, maxFrame, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 0 || number > maxFrame) {
    throw new RangeError(field + " must be an integer between 0 and " + maxFrame + ".");
  }
  return number;
}
function readFps(value, field, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1 || number > 30) {
    throw new RangeError(field + " must be an integer between 1 and 30 FPS.");
  }
  return number;
}
function readClip(input, name, maxFrame, defaults) {
  const clip = input && typeof input === "object" ? input : {};
  const startFrame = readFrame(clip.startFrame, name + ".startFrame", maxFrame, defaults.startFrame);
  const endFrame = readFrame(clip.endFrame, name + ".endFrame", maxFrame, defaults.endFrame);
  if (endFrame < startFrame) throw new RangeError(name + " endFrame must be greater than or equal to startFrame.");
  return Object.freeze({
    startFrame,
    endFrame,
    fps: readFps(clip.fps, name + ".fps", defaults.fps),
    loop: name === "idle" ? true : Boolean(clip.loop ?? false)
  });
}
export function createStudioAnimationProfile(input, frameCount) {
  const count = Number(frameCount);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new RangeError("Sprite frame count must be an integer between 1 and 100.");
  }
  const profile = input && typeof input === "object" ? input : {};
  const maxFrame = count - 1;
  return Object.freeze({
    idle: readClip(profile.idle, "idle", maxFrame, { startFrame: 0, endFrame: 0, fps: DEFAULT_FPS.idle }),
    attack: readClip(profile.attack, "attack", maxFrame, { startFrame: 0, endFrame: maxFrame, fps: DEFAULT_FPS.attack })
  });
}
export function validateStudioAnimationProfile(input, frameCount) {
  try { return { valid: true, profile: createStudioAnimationProfile(input, frameCount), errors: [] }; }
  catch (error) { return { valid: false, profile: null, errors: [error.message] }; }
}
