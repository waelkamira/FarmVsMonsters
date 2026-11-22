import { createSkeletalRigProfile, evaluateSkeletalClip } from "./skeletalAnimation.mjs";

function blendAngle(from, to, amount) {
  const delta = ((to - from + 540) % 360) - 180;
  return from + delta * amount;
}
function blendTransform(from, to, amount) {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    rotation: blendAngle(from.rotation, to.rotation, amount),
    scaleX: from.scaleX + (to.scaleX - from.scaleX) * amount,
    scaleY: from.scaleY + (to.scaleY - from.scaleY) * amount
  };
}
function compose(parent, local) {
  const radians = parent.rotation * Math.PI / 180;
  const x = local.x * parent.scaleX, y = local.y * parent.scaleY;
  return {
    x: parent.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: parent.y + x * Math.sin(radians) + y * Math.cos(radians),
    rotation: parent.rotation + local.rotation,
    scaleX: parent.scaleX * local.scaleX,
    scaleY: parent.scaleY * local.scaleY
  };
}
function makeWorldPose(profile, clipId, timeMs, localBones) {
  const bones = new Map(profile.bones.map((bone) => [bone.id, bone]));
  const world = {};
  function resolve(id) {
    if (world[id]) return world[id];
    const bone = bones.get(id), local = localBones[id];
    world[id] = bone.parentId === null ? local : compose(resolve(bone.parentId), local);
    return world[id];
  }
  for (const bone of profile.bones) resolve(bone.id);
  return { clipId, timeMs, localBones, bones: world };
}

export function createSkeletalAnimationController(profileInput, initialClipId = null) {
  const profile = createSkeletalRigProfile(profileInput);
  if (!profile.clips.length) throw new RangeError("An animation controller requires at least one clip.");
  const initial = profile.clips.find((clip) => clip.id === initialClipId) || profile.clips[0];
  let currentClipId = initial.id;
  let elapsedMs = 0;
  let transition = null;

  function currentPose() {
    return evaluateSkeletalClip(profile, currentClipId, elapsedMs);
  }
  function getPose() {
    const pose = currentPose();
    if (!transition) return pose;
    const amount = Math.max(0, Math.min(1, transition.elapsedMs / transition.durationMs));
    const localBones = {};
    for (const bone of profile.bones) {
      localBones[bone.id] = blendTransform(
        transition.fromPose.localBones[bone.id],
        pose.localBones[bone.id],
        amount
      );
    }
    if (amount >= 1) transition = null;
    return makeWorldPose(profile, currentClipId, pose.timeMs, localBones);
  }

  return {
    profile,
    get state() { return currentClipId; },
    get elapsedMs() { return elapsedMs; },
    setState(nextClipId, blendDurationMs = 140) {
      const next = profile.clips.find((clip) => clip.id === nextClipId);
      if (!next) throw new RangeError("Unknown skeletal animation state: " + nextClipId + ".");
      if (nextClipId === currentClipId) return false;
      const fromPose = getPose();
      currentClipId = nextClipId;
      elapsedMs = 0;
      const duration = Math.max(0, Math.min(2000, Number(blendDurationMs) || 0));
      transition = duration > 0 ? { fromPose, elapsedMs: 0, durationMs: duration } : null;
      return true;
    },
    restart() { elapsedMs = 0; transition = null; return getPose(); },
    update(deltaMs) {
      const delta = Math.max(0, Math.min(250, Number(deltaMs) || 0));
      elapsedMs += delta;
      if (transition) {
        transition.elapsedMs = Math.min(transition.durationMs, transition.elapsedMs + delta);
      }
      return getPose();
    },
    getPose,
    reset() {
      elapsedMs = 0;
      transition = null;
      return getPose();
    }
  };
}


/** Return a stable looping idle clip, never a one-shot attack/movement clip. */
export function resolveSkeletalIdleClip(profileInput) {
  const clips = Array.isArray(profileInput?.clips) ? profileInput.clips : [];
  return clips.find((clip) => clip?.id === "idle" && clip.loop)
    || clips.find((clip) => clip?.loop)
    || null;
}
