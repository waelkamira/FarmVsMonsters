import {
  createSkeletalRigProfile,
  evaluateSkeletalClip,
  getSkeletalAttachmentTransform,
  getSkeletalHitboxTransform
} from "./skeletalAnimation.mjs";

function setTransform(target, transform) {
  target.setPosition(transform.x, transform.y);
  target.setRotation(transform.rotation * Math.PI / 180);
  target.setScale(transform.scaleX, transform.scaleY);
}

function resolveTextureKey(partTextures, assetId) {
  const descriptor = partTextures?.[assetId];
  if (typeof descriptor === "string") return descriptor;
  return descriptor?.textureKey || assetId;
}

/**
 * Creates a Phaser Container hierarchy for a validated cutout rig.
 * All bitmap part textures must already be loaded before this function is called.
 */
export function createPhaserSkeletalRig(scene, profileInput, partTextures = {}, options = {}) {
  if (!scene?.add?.container || !scene?.add?.image || !scene?.textures?.exists || !scene?.textures?.get) {
    throw new TypeError("A Phaser Scene with container, image, and texture APIs is required.");
  }

  const profile = createSkeletalRigProfile(profileInput);
  const root = scene.add.container(Number(options.x) || 0, Number(options.y) || 0);
  root.setVisible?.(options.visible !== false);

  const containers = new Map();
  for (const bone of profile.bones) containers.set(bone.id, scene.add.container(0, 0));

  for (const bone of profile.bones) {
    const container = containers.get(bone.id);
    if (bone.part) {
      const textureKey = resolveTextureKey(partTextures, bone.part.assetId);
      if (!scene.textures.exists(textureKey)) {
        root.destroy?.(true);
        throw new Error("Missing loaded texture for skeletal part " + bone.part.assetId + " (" + textureKey + ").");
      }
      const texture = scene.textures.get(textureKey);
      const frame = texture?.get?.(bone.part.frame);
      if (!frame || !Number.isFinite(frame.width) || !Number.isFinite(frame.height) || frame.width < 1 || frame.height < 1) {
        root.destroy?.(true);
        throw new Error("Missing or invalid frame " + bone.part.frame + " for skeletal part " + bone.part.assetId + ".");
      }
      const image = scene.add.image(0, 0, textureKey, bone.part.frame);
      image.setOrigin(
        Math.max(0, Math.min(1, bone.pivot.x / frame.width)),
        Math.max(0, Math.min(1, bone.pivot.y / frame.height))
      );
      container.add(image);
    }
  }

  for (const bone of profile.bones) {
    const container = containers.get(bone.id);
    if (bone.parentId === null) root.add(container);
    else containers.get(bone.parentId).add(container);
  }

  let currentPose = null;
  let destroyed = false;

  function applyPose(pose) {
    if (destroyed) throw new Error("Cannot update a destroyed skeletal rig.");
    for (const bone of profile.bones) {
      const transform = pose.localBones?.[bone.id];
      if (!transform) throw new Error("Pose is missing local transform for bone " + bone.id + ".");
      setTransform(containers.get(bone.id), transform);
    }
    currentPose = pose;
    return pose;
  }

  return {
    profile,
    root,
    play(clipId, elapsedMs = 0) {
      return applyPose(evaluateSkeletalClip(profile, clipId, elapsedMs));
    },
    applyPose,
    setPosition(x, y) {
      if (destroyed) return;
      root.setPosition(Number(x) || 0, Number(y) || 0);
    },
    setVisible(visible) {
      if (!destroyed) root.setVisible(Boolean(visible));
    },
    getAttachment(id) {
      if (!currentPose) throw new Error("Play or apply a skeletal pose before resolving attachments.");
      return getSkeletalAttachmentTransform(profile, currentPose, id);
    },
    getHitbox(id) {
      if (!currentPose) throw new Error("Play or apply a skeletal pose before resolving hitboxes.");
      return getSkeletalHitboxTransform(profile, currentPose, id);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.destroy(true);
      containers.clear();
      currentPose = null;
    }
  };
}
