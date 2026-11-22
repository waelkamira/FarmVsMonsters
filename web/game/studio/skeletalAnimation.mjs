const MAX_BONES = 64;
const MAX_CLIPS = 16;
const MAX_KEYS_PER_TRACK = 256;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/;

function finite(value, field, min, max, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new RangeError(field + " must be a finite number between " + min + " and " + max + ".");
  }
  return number;
}

function requireObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(field + " must be an object.");
  return value;
}

function readId(value, field) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new TypeError(field + " must be a stable ID (1–64 safe characters).");
  }
  return value;
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freezeDeep);
  return Object.freeze(value);
}

function readTransform(input, field, defaults = {}) {
  const value = input && typeof input === "object" ? input : {};
  return {
    x: finite(value.x, field + ".x", -8192, 8192, defaults.x ?? 0),
    y: finite(value.y, field + ".y", -8192, 8192, defaults.y ?? 0),
    rotation: finite(value.rotation, field + ".rotation", -36000, 36000, defaults.rotation ?? 0),
    scaleX: finite(value.scaleX, field + ".scaleX", 0.01, 20, defaults.scaleX ?? 1),
    scaleY: finite(value.scaleY, field + ".scaleY", 0.01, 20, defaults.scaleY ?? 1)
  };
}

function validateParentGraph(bones) {
  const byId = new Map(bones.map((bone) => [bone.id, bone]));
  const roots = bones.filter((bone) => bone.parentId === null);
  if (roots.length !== 1) throw new RangeError("A rig must contain exactly one root bone.");

  for (const bone of bones) {
    if (bone.parentId !== null && !byId.has(bone.parentId)) {
      throw new RangeError("Bone " + bone.id + " references a missing parent.");
    }
    const visited = new Set([bone.id]);
    let parentId = bone.parentId;
    while (parentId !== null) {
      if (visited.has(parentId)) throw new RangeError("Bone hierarchy contains a cycle.");
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }
}

export function snapSkeletalKeyframeTime(timeOrClip, fpsOrTime = 24, durationMs = 60000) {
  const clipInput = timeOrClip && typeof timeOrClip === "object";
  const timeMs = clipInput ? fpsOrTime : timeOrClip;
  const fps = clipInput ? timeOrClip.fps : fpsOrTime;
  const durationInput = clipInput ? timeOrClip.durationMs : durationMs;
  const duration = Math.max(1, Math.round(Number(durationInput) || 1));
  const rate = Math.max(1, Math.min(60, Math.round(Number(fps) || 24)));
  const time = Math.max(0, Math.min(duration, Number(timeMs) || 0));
  const frameIndex = Math.round(time * rate / 1000);
  return Math.max(0, Math.min(duration, Math.round(frameIndex * 1000 / rate)));
}

export function createSkeletalRigProfile(input) {
  if (!input || typeof input !== "object") throw new TypeError("A skeletal rig profile is required.");
  if (Number(input.version ?? 1) !== 1) throw new RangeError("Only skeletal rig profile version 1 is supported.");

  const canvasInput = input.canvas && typeof input.canvas === "object" ? input.canvas : {};
  const canvas = {
    width: finite(canvasInput.width, "canvas.width", 1, 4096, 256),
    height: finite(canvasInput.height, "canvas.height", 1, 4096, 256)
  };
  if (!Number.isInteger(canvas.width) || !Number.isInteger(canvas.height)) {
    throw new RangeError("Rig canvas dimensions must be integers.");
  }

  if (!Array.isArray(input.bones) || input.bones.length < 1 || input.bones.length > MAX_BONES) {
    throw new RangeError("A rig must contain between 1 and " + MAX_BONES + " bones.");
  }

  const boneIds = new Set();
  const bones = input.bones.map((rawEntry, index) => {
    const entry = requireObject(rawEntry, "bones[" + index + "]");
    const id = readId(entry?.id, "bones[" + index + "].id");
    if (boneIds.has(id)) throw new RangeError("Duplicate bone ID: " + id + ".");
    boneIds.add(id);
    const parentId = entry.parentId == null ? null : readId(entry.parentId, "bones[" + index + "].parentId");
    const pivot = {
      x: finite(entry.pivot?.x, "bones[" + index + "].pivot.x", -4096, 4096, 0),
      y: finite(entry.pivot?.y, "bones[" + index + "].pivot.y", -4096, 4096, 0)
    };
    const part = entry.part == null ? null : {
      assetId: readId(entry.part.assetId, "bones[" + index + "].part.assetId"),
      frame: finite(entry.part.frame, "bones[" + index + "].part.frame", 0, 10000, 0)
    };
    if (part && !Number.isInteger(part.frame)) throw new RangeError("Sprite frame indices must be integers.");
    return { id, name: String(entry.name ?? id).slice(0, 80), parentId, ...readTransform(entry, "bones[" + index + "]"), pivot, part };
  });
  validateParentGraph(bones);

  const attachmentsInput = input.attachments ?? [];
  if (!Array.isArray(attachmentsInput) || attachmentsInput.length > 128) {
    throw new RangeError("A rig may contain at most 128 attachment points.");
  }
  const attachmentIds = new Set();
  const attachments = attachmentsInput.map((rawEntry, index) => {
    const entry = requireObject(rawEntry, "attachments[" + index + "]");
    const id = readId(entry?.id, "attachments[" + index + "].id");
    if (attachmentIds.has(id)) throw new RangeError("Duplicate attachment ID: " + id + ".");
    attachmentIds.add(id);
    const boneId = readId(entry.boneId, "attachments[" + index + "].boneId");
    if (!boneIds.has(boneId)) throw new RangeError("Attachment " + id + " references a missing bone.");
    return { id, name: String(entry.name ?? id).slice(0, 80), boneId, ...readTransform(entry, "attachments[" + index + "]") };
  });

  const hitboxesInput = input.hitboxes ?? [];
  if (!Array.isArray(hitboxesInput) || hitboxesInput.length > 128) {
    throw new RangeError("A rig may contain at most 128 hitboxes.");
  }
  const hitboxIds = new Set();
  const hitboxes = hitboxesInput.map((rawEntry, index) => {
    const entry = requireObject(rawEntry, "hitboxes[" + index + "]");
    const id = readId(entry?.id, "hitboxes[" + index + "].id");
    if (hitboxIds.has(id)) throw new RangeError("Duplicate hitbox ID: " + id + ".");
    hitboxIds.add(id);
    const boneId = readId(entry.boneId, "hitboxes[" + index + "].boneId");
    if (!boneIds.has(boneId)) throw new RangeError("Hitbox " + id + " references a missing bone.");
    const width = finite(entry.width, "hitboxes[" + index + "].width", 1, 4096, 1);
    const height = finite(entry.height, "hitboxes[" + index + "].height", 1, 4096, 1);
    return {
      id, name: String(entry.name ?? id).slice(0, 80), boneId,
      ...readTransform(entry, "hitboxes[" + index + "]"), width, height,
      kind: entry.kind === "hurt" ? "hurt" : "attack"
    };
  });

  const clipsInput = input.clips ?? [];
  if (!Array.isArray(clipsInput) || clipsInput.length < 1 || clipsInput.length > MAX_CLIPS) {
    throw new RangeError("A rig must contain between 1 and " + MAX_CLIPS + " animation clips.");
  }
  const boneById = new Map(bones.map((bone) => [bone.id, bone]));
  const clipIds = new Set();
  const clips = clipsInput.map((rawEntry, clipIndex) => {
    const entry = requireObject(rawEntry, "clips[" + clipIndex + "]");
    const id = readId(entry?.id, "clips[" + clipIndex + "].id");
    if (clipIds.has(id)) throw new RangeError("Duplicate animation clip ID: " + id + ".");
    clipIds.add(id);
    const durationMs = finite(entry.durationMs, "clips[" + clipIndex + "].durationMs", 1, 60000, 1000);
    const fps = finite(entry.fps, "clips[" + clipIndex + "].fps", 1, 60, 24);
    if (!Number.isInteger(durationMs) || !Number.isInteger(fps)) throw new RangeError("Clip duration and FPS must be integers.");
    if (!Number.isInteger(durationMs)) throw new RangeError("Animation duration must be an integer in milliseconds.");
    if (!Array.isArray(entry.tracks) || entry.tracks.length > MAX_BONES) {
      throw new RangeError("Each animation clip must contain a valid track list.");
    }
    const trackIds = new Set();
    const tracks = entry.tracks.map((rawTrack, trackIndex) => {
      const track = requireObject(rawTrack, "clips[" + clipIndex + "].tracks[" + trackIndex + "]");
      const boneId = readId(track?.boneId, "clips[" + clipIndex + "].tracks[" + trackIndex + "].boneId");
      if (!boneIds.has(boneId)) throw new RangeError("Animation track references a missing bone.");
      if (trackIds.has(boneId)) throw new RangeError("A clip may only have one track per bone.");
      trackIds.add(boneId);
      if (!Array.isArray(track.keyframes) || track.keyframes.length < 1 || track.keyframes.length > MAX_KEYS_PER_TRACK) {
        throw new RangeError("Each animation track must contain between 1 and " + MAX_KEYS_PER_TRACK + " keyframes.");
      }
      const boneBase = boneById.get(boneId);
      let previousTime = -1;
      const keyframes = track.keyframes.map((rawKey, keyIndex) => {
        const key = requireObject(rawKey, "clips[" + clipIndex + "].tracks[" + trackIndex + "].keyframes[" + keyIndex + "]");
        const timeMs = finite(key.timeMs, "keyframe.timeMs", 0, durationMs, 0);
        if (!Number.isInteger(timeMs) || timeMs <= previousTime) {
          throw new RangeError("Keyframes must use strictly increasing integer times.");
        }
        previousTime = timeMs;
        return { timeMs, ...readTransform(key, "keyframe", boneBase) };
      });
      return { boneId, keyframes };
    });
    return { id, name: String(entry.name ?? id).slice(0, 80), durationMs, fps, loop: Boolean(entry.loop), tracks };
  });

  return freezeDeep({ version: 1, canvas, bones, attachments, hitboxes, clips });
}

function normalizeTime(clip, elapsedMs) {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  if (clip.loop) return elapsed % clip.durationMs;
  return Math.min(elapsed, clip.durationMs);
}

function interpolateAngle(from, to, amount) {
  const delta = ((to - from + 540) % 360) - 180;
  return from + delta * amount;
}

function sampleTrack(track, base, timeMs) {
  const keys = track.keyframes;
  if (timeMs <= keys[0].timeMs) return { ...base, ...keys[0] };
  const last = keys[keys.length - 1];
  if (timeMs >= last.timeMs) return { ...base, ...last };

  let rightIndex = 1;
  while (rightIndex < keys.length && keys[rightIndex].timeMs < timeMs) rightIndex += 1;
  const left = keys[rightIndex - 1];
  const right = keys[rightIndex];
  const amount = (timeMs - left.timeMs) / (right.timeMs - left.timeMs);
  return {
    x: left.x + (right.x - left.x) * amount,
    y: left.y + (right.y - left.y) * amount,
    rotation: interpolateAngle(left.rotation, right.rotation, amount),
    scaleX: left.scaleX + (right.scaleX - left.scaleX) * amount,
    scaleY: left.scaleY + (right.scaleY - left.scaleY) * amount
  };
}

function compose(parent, local) {
  const radians = parent.rotation * Math.PI / 180;
  const scaledX = local.x * parent.scaleX;
  const scaledY = local.y * parent.scaleY;
  return {
    x: parent.x + scaledX * Math.cos(radians) - scaledY * Math.sin(radians),
    y: parent.y + scaledX * Math.sin(radians) + scaledY * Math.cos(radians),
    rotation: parent.rotation + local.rotation,
    scaleX: parent.scaleX * local.scaleX,
    scaleY: parent.scaleY * local.scaleY
  };
}

export function evaluateSkeletalClip(profileInput, clipId, elapsedMs) {
  const profile = profileInput?.bones?.[0]?.id && Object.isFrozen(profileInput)
    ? profileInput
    : createSkeletalRigProfile(profileInput);
  const clip = profile.clips.find((entry) => entry.id === clipId);
  if (!clip) throw new RangeError("Unknown skeletal animation clip: " + clipId + ".");
  const timeMs = normalizeTime(clip, elapsedMs);
  const tracks = new Map(clip.tracks.map((track) => [track.boneId, track]));
  const bones = new Map(profile.bones.map((bone) => [bone.id, bone]));
  const world = new Map();
  const localPose = new Map();

  function resolve(boneId) {
    if (world.has(boneId)) return world.get(boneId);
    const bone = bones.get(boneId);
    const base = { x: bone.x, y: bone.y, rotation: bone.rotation, scaleX: bone.scaleX, scaleY: bone.scaleY };
    const local = tracks.has(boneId) ? sampleTrack(tracks.get(boneId), base, timeMs) : base;
    localPose.set(boneId, local);
    const result = bone.parentId === null ? local : compose(resolve(bone.parentId), local);
    world.set(boneId, result);
    return result;
  }

  for (const bone of profile.bones) resolve(bone.id);
  return { clipId, timeMs, localBones: Object.fromEntries(localPose), bones: Object.fromEntries(world) };
}

function transformPoint(transform, point) {
  const radians = transform.rotation * Math.PI / 180;
  const x = point.x * transform.scaleX;
  const y = point.y * transform.scaleY;
  return {
    x: transform.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: transform.y + x * Math.sin(radians) + y * Math.cos(radians)
  };
}

export function getSkeletalAttachmentTransform(profileInput, evaluated, attachmentId) {
  const profile = profileInput?.attachments ? profileInput : createSkeletalRigProfile(profileInput);
  const attachment = profile.attachments.find((entry) => entry.id === attachmentId);
  if (!attachment) throw new RangeError("Unknown skeletal attachment: " + attachmentId + ".");
  const bone = evaluated?.bones?.[attachment.boneId];
  if (!bone) throw new TypeError("Evaluated pose does not contain attachment bone " + attachment.boneId + ".");
  const point = transformPoint(bone, attachment);
  return { ...point, rotation: bone.rotation + attachment.rotation, scaleX: bone.scaleX * attachment.scaleX, scaleY: bone.scaleY * attachment.scaleY };
}

export function getSkeletalHitboxTransform(profileInput, evaluated, hitboxId) {
  const profile = profileInput?.hitboxes ? profileInput : createSkeletalRigProfile(profileInput);
  const hitbox = profile.hitboxes.find((entry) => entry.id === hitboxId);
  if (!hitbox) throw new RangeError("Unknown skeletal hitbox: " + hitboxId + ".");
  const bone = evaluated?.bones?.[hitbox.boneId];
  if (!bone) throw new TypeError("Evaluated pose does not contain hitbox bone " + hitbox.boneId + ".");
  const point = transformPoint(bone, hitbox);
  return {
    ...point,
    rotation: bone.rotation + hitbox.rotation,
    width: hitbox.width * bone.scaleX * hitbox.scaleX,
    height: hitbox.height * bone.scaleY * hitbox.scaleY,
    kind: hitbox.kind
  };
}

export function validateSkeletalRigProfile(input) {
  try { return { valid: true, profile: createSkeletalRigProfile(input), errors: [] }; }
  catch (error) { return { valid: false, profile: null, errors: [error.message] }; }
}
