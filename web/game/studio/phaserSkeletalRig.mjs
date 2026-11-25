import {
  createSkeletalRigProfile,
  evaluateSkeletalClip,
  getSkeletalAttachmentTransform,
  getSkeletalAttachmentsByKind,
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
  const resolvedParts = new Map();
  for (const bone of profile.bones) {
    if (!bone.part) continue;
    const textureKey = resolveTextureKey(partTextures, bone.part.assetId);
    if (!scene.textures.exists(textureKey)) {
      throw new Error("Missing loaded texture for skeletal part " + bone.part.assetId + " (" + textureKey + ").");
    }
    const frame = scene.textures.get(textureKey)?.get?.(bone.part.frame);
    if (!frame || !Number.isFinite(frame.width) || !Number.isFinite(frame.height) || frame.width < 1 || frame.height < 1) {
      throw new Error("Missing or invalid frame " + bone.part.frame + " for skeletal part " + bone.part.assetId + ".");
    }
    resolvedParts.set(bone.id, { textureKey, frame });
  }

  const root = scene.add.container(Number(options.x) || 0, Number(options.y) || 0);
  root.setVisible?.(options.visible !== false);

  const containers = new Map();
  for (const bone of profile.bones) containers.set(bone.id, scene.add.container(0, 0));

  for (const bone of profile.bones) {
    const container = containers.get(bone.id);
    if (bone.part) {
      const { textureKey, frame } = resolvedParts.get(bone.id);
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
    setRotation(degrees) {
      if (!destroyed) root.setRotation((Number(degrees) || 0) * Math.PI / 180);
    },
    setScale(scaleX, scaleY = scaleX) {
      if (!destroyed) root.setScale(Number(scaleX) || 1, Number(scaleY) || 1);
    },
    getAttachment(id) {
      if (!currentPose) throw new Error("Play or apply a skeletal pose before resolving attachments.");
      const point = getSkeletalAttachmentTransform(profile, currentPose, id);
      const rotation = Number(root.rotation) || 0;
      const scaleX = Number(root.scaleX) || 1;
      const scaleY = Number(root.scaleY) || 1;
      const x = point.x * scaleX, y = point.y * scaleY;
      return {
        ...point,
        x: root.x + x * Math.cos(rotation) - y * Math.sin(rotation),
        y: root.y + x * Math.sin(rotation) + y * Math.cos(rotation),
        rotation: point.rotation + rotation * 180 / Math.PI,
        scaleX: point.scaleX * scaleX,
        scaleY: point.scaleY * scaleY
      };
    },
    getAttachmentsByKind(kind) {
      if (!currentPose) throw new Error("Play or apply a skeletal pose before resolving attachments.");
      return getSkeletalAttachmentsByKind(profile, currentPose, kind).map((point) => {
        const rotation = Number(root.rotation) || 0;
        const scaleX = Number(root.scaleX) || 1;
        const scaleY = Number(root.scaleY) || 1;
        const x = point.x * scaleX, y = point.y * scaleY;
        return {
          ...point,
          x: root.x + x * Math.cos(rotation) - y * Math.sin(rotation),
          y: root.y + x * Math.sin(rotation) + y * Math.cos(rotation),
          rotation: point.rotation + rotation * 180 / Math.PI,
          scaleX: point.scaleX * scaleX,
          scaleY: point.scaleY * scaleY
        };
      });
    },
    getHitbox(id) {
      if (!currentPose) throw new Error("Play or apply a skeletal pose before resolving hitboxes.");
      const hitbox = getSkeletalHitboxTransform(profile, currentPose, id);
      const rotation = Number(root.rotation) || 0;
      const scaleX = Number(root.scaleX) || 1;
      const scaleY = Number(root.scaleY) || 1;
      const x = hitbox.x * scaleX, y = hitbox.y * scaleY;
      return {
        ...hitbox,
        x: root.x + x * Math.cos(rotation) - y * Math.sin(rotation),
        y: root.y + x * Math.sin(rotation) + y * Math.cos(rotation),
        rotation: hitbox.rotation + rotation * 180 / Math.PI,
        width: hitbox.width * scaleX,
        height: hitbox.height * scaleY
      };
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
