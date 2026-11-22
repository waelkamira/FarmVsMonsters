import { createSkeletalRigProfile } from "./skeletalAnimation.mjs";

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/;
export const AUTO_RIG_ROLE_DICTIONARY_VERSION = "1.0.0";
const MUZZLE_EMITTER_ROLES = new Set(["weapon", "weapon.barrel", "weapon.muzzle", "mouth", "head", "face"]);
export const AUTO_RIG_ROLE_OPTIONS = Object.freeze([
  { value: "body", label: "الجسم" }, { value: "stem", label: "الساق" },
  { value: "head", label: "الرأس" }, { value: "face", label: "الوجه" },
  { value: "eye.left", label: "العين اليسرى" }, { value: "eye.right", label: "العين اليمنى" },
  { value: "mouth", label: "الفم" }, { value: "jaw.upper", label: "الفك العلوي" },
  { value: "jaw.lower", label: "الفك السفلي" }, { value: "leaf.left", label: "الورقة اليسرى" },
  { value: "leaf.right", label: "الورقة اليمنى" }, { value: "leaf", label: "ورقة" },
  { value: "arm.left", label: "الذراع الأيسر" }, { value: "arm.right", label: "الذراع الأيمن" },
  { value: "hand.left", label: "اليد اليسرى" }, { value: "hand.right", label: "اليد اليمنى" },
  { value: "weapon", label: "السلاح" }, { value: "weapon.barrel", label: "ماسورة السلاح" },
  { value: "weapon.muzzle", label: "منطقة فوهة السلاح" }, { value: "back", label: "الجزء الخلفي" },
  { value: "tail", label: "الذيل" }, { value: "armor", label: "الدرع" },
  { value: "accessory", label: "إضافة" }, { value: "shadow", label: "الظل" },
  { value: "effect", label: "مؤثر" }
]);
const ROLE_ALIASES = Object.freeze({
  "left-leaf": "leaf.left",
  "leaf-left": "leaf.left",
  "right-leaf": "leaf.right",
  "leaf-right": "leaf.right",
  "left-arm": "arm.left",
  "arm-left": "arm.left",
  "right-arm": "arm.right",
  "arm-right": "arm.right",
  "left-hand": "hand.left",
  "hand-left": "hand.left",
  "right-hand": "hand.right",
  "hand-right": "hand.right",
  "weapon-barrel": "weapon.barrel"
});
const PARENT_ROLES = Object.freeze({
  "body": [],
  "stem": ["body"],
  "head": ["body", "stem"],
  "face": ["head", "body"],
  "eye.left": ["face", "head"],
  "eye.right": ["face", "head"],
  "mouth": ["face", "head"],
  "jaw.upper": ["head", "face"],
  "jaw.lower": ["head", "face"],
  "leaf": ["stem", "body"],
  "leaf.left": ["stem", "body"],
  "leaf.right": ["stem", "body"],
  "arm.left": ["body", "stem"],
  "arm.right": ["body", "stem"],
  "hand.left": ["arm.left", "body"],
  "hand.right": ["arm.right", "body"],
  "weapon": ["hand.left", "hand.right", "arm.left", "arm.right", "body"],
  "weapon.barrel": ["weapon"],
  "weapon.muzzle": ["weapon.barrel", "weapon"],
  "back": ["body"],
  "tail": ["body"],
  "armor": ["body"],
  "accessory": ["body", "head"],
  "shadow": [],
  "effect": []
});
const KNOWN_ROLES = new Set(Object.keys(PARENT_ROLES));

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(field + " must be a finite number.");
  return number;
}
function readId(value, field, maxLength = 64) {
  if (typeof value !== "string" || !ID_PATTERN.test(value) || value.length > maxLength) {
    throw new TypeError(field + " must be a stable ID of 1–" + maxLength + " safe characters.");
  }
  return value;
}
function normalizeRole(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("Every part requires a semantic role.");
  const role = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  return ROLE_ALIASES[role] || role.replace(/-/g, ".");
}
function readPart(raw, index, canvas) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("parts[" + index + "] must be an object.");
  const id = readId(raw.id, "parts[" + index + "].id", 59);
  const assetId = readId(raw.assetId, "parts[" + index + "].assetId");
  const role = normalizeRole(raw.role);
  const bounds = raw.bounds || {};
  const x = finite(bounds.x, "parts[" + index + "].bounds.x");
  const y = finite(bounds.y, "parts[" + index + "].bounds.y");
  const width = finite(bounds.width, "parts[" + index + "].bounds.width");
  const height = finite(bounds.height, "parts[" + index + "].bounds.height");
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > canvas.width || y + height > canvas.height) {
    throw new RangeError("Part " + id + " bounds must be positive and fit inside the source canvas.");
  }
  const pivotExplicit = raw.pivot != null;
  const pivot = raw.pivot || { x: x + width / 2, y: y + height / 2 };
  const pivotX = finite(pivot.x, "parts[" + index + "].pivot.x");
  const pivotY = finite(pivot.y, "parts[" + index + "].pivot.y");
  if (pivotX < x || pivotX > x + width || pivotY < y || pivotY > y + height) {
    throw new RangeError("Part " + id + " pivot must lie inside its source bounds.");
  }
  const frame = raw.frame == null ? 0 : finite(raw.frame, "parts[" + index + "].frame");
  if (!Number.isInteger(frame) || frame < 0 || frame > 10000) throw new RangeError("Part " + id + " frame must be an integer from 0 to 10000.");
  const side = raw.side === "left" || raw.side === "right" ? raw.side : (role.endsWith(".left") ? "left" : role.endsWith(".right") ? "right" : null);
  const confidence = raw.confidence == null ? null : finite(raw.confidence, "parts[" + index + "].confidence");
  let mask = null;
  if (raw.mask != null) {
    if (!raw.mask || raw.mask.kind !== "polygon" || !Array.isArray(raw.mask.points) || raw.mask.points.length < 3 || raw.mask.points.length > 512) {
      throw new TypeError("Part " + id + " mask must be a polygon with 3–512 source-space points.");
    }
    const points = raw.mask.points.map((point, pointIndex) => {
      const px = finite(point?.x, "parts[" + index + "].mask.points[" + pointIndex + "].x");
      const py = finite(point?.y, "parts[" + index + "].mask.points[" + pointIndex + "].y");
      if (px < 0 || py < 0 || px > canvas.width || py > canvas.height) throw new RangeError("Part " + id + " mask point lies outside the source canvas.");
      return { x: px, y: py };
    });
    const area = points.reduce((sum, point, pointIndex) => {
      const next = points[(pointIndex + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2;
    if (Math.abs(area) < 1) throw new RangeError("Part " + id + " mask polygon must enclose a non-zero area.");
    mask = { kind: "polygon", points };
  }
  const provenanceInput = raw.provenance && typeof raw.provenance === "object" ? raw.provenance : {};
  const segmentation = ["manual-polygon", "model-mask", "imported-mask", "sam2"].includes(provenanceInput.segmentation)
    ? provenanceInput.segmentation : (mask ? "manual-polygon" : "unspecified");
  const pixels = ["source", "reconstructed"].includes(provenanceInput.pixels) ? provenanceInput.pixels : "source";
  if (confidence !== null && (confidence < 0 || confidence > 1)) throw new RangeError("Part " + id + " confidence must be between 0 and 1.");
  return {
    id, assetId, role, side, frame, bounds: { x, y, width, height },
    pivot: { x: pivotX, y: pivotY }, pivotExplicit,
    name: String(raw.name || role).slice(0, 80),
    confidence, mask, provenance: { segmentation, pixels },
    occlusion: raw.occlusion === "unresolved" ? "unresolved" : raw.occlusion === "reconstructed" ? "reconstructed" : "none",
    parentPartId: raw.parentPartId == null ? null : readId(raw.parentPartId, "parts[" + index + "].parentPartId", 59),
    drawOrder: Number.isFinite(Number(raw.drawOrder)) ? Number(raw.drawOrder) : index
  };
}
function chooseParent(part, partsById, parts) {
  if (part.parentPartId) {
    if (!partsById.has(part.parentPartId)) throw new RangeError("Part " + part.id + " references missing parent part " + part.parentPartId + ".");
    return partsById.get(part.parentPartId);
  }
  const roles = PARENT_ROLES[part.role] || ["body", "stem"];
  for (const role of roles) {
    const candidates = parts.filter((candidate) => candidate.role === role && candidate.id !== part.id);
    candidates.sort((a, b) => {
      const aSidePenalty = part.side && a.side !== part.side ? 1 : 0;
      const bSidePenalty = part.side && b.side !== part.side ? 1 : 0;
      if (aSidePenalty !== bSidePenalty) return aSidePenalty - bSidePenalty;
      const aDistance = Math.hypot(a.pivot.x - part.pivot.x, a.pivot.y - part.pivot.y);
      const bDistance = Math.hypot(b.pivot.x - part.pivot.x, b.pivot.y - part.pivot.y);
      return aDistance - bDistance || a.id.localeCompare(b.id);
    });
    if (candidates.length) return candidates[0];
  }
  return null;
}
function suggestAutoPivot(part, parent) {
  if (!parent && ["body", "stem"].includes(part.role)) {
    return { x: part.bounds.x + part.bounds.width / 2, y: part.bounds.y + part.bounds.height };
  }
  if (!parent) return { x: part.bounds.x + part.bounds.width / 2, y: part.bounds.y + part.bounds.height / 2 };
  const polygon = part.mask?.points || [
    { x: part.bounds.x, y: part.bounds.y },
    { x: part.bounds.x + part.bounds.width, y: part.bounds.y },
    { x: part.bounds.x + part.bounds.width, y: part.bounds.y + part.bounds.height },
    { x: part.bounds.x, y: part.bounds.y + part.bounds.height }
  ];
  let best = null, bestDistance = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const amount = Math.max(0, Math.min(1, ((parent.pivot.x - a.x) * dx + (parent.pivot.y - a.y) * dy) / lengthSquared));
    const point = { x: a.x + amount * dx, y: a.y + amount * dy };
    const distance = Math.hypot(point.x - parent.pivot.x, point.y - parent.pivot.y);
    if (distance < bestDistance) { best = point; bestDistance = distance; }
  }
  return best || { x: part.bounds.x + part.bounds.width / 2, y: part.bounds.y + part.bounds.height / 2 };
}

function buildStarterClips(bones, parts) {
  const roles = new Map(parts.map((part) => ["part-" + part.id, part.role]));
  const visible = bones.filter((bone) => bone.part);
  const body = visible.find((bone) => roles.get(bone.id) === "body")
    || visible.find((bone) => roles.get(bone.id) === "stem")
    || visible[0];
  const leaves = visible.filter((bone) => bone.id !== body?.id && String(roles.get(bone.id) || "").startsWith("leaf"));
  const headCandidate = visible.find((bone) => roles.get(bone.id) === "head");
  const head = headCandidate?.id === body?.id ? null : headCandidate;
  const arms = visible.filter((bone) => /^(arm|hand)\\./.test(roles.get(bone.id) || ""));
  const weapons = visible.filter((bone) => ["weapon", "weapon.barrel", "weapon.muzzle"].includes(roles.get(bone.id)));
  const baseFrame = (bone, timeMs, changes = {}) => ({
    timeMs, x: bone.x, y: bone.y, rotation: bone.rotation,
    scaleX: bone.scaleX, scaleY: bone.scaleY, ...changes
  });
  const track = (bone, frames) => ({ boneId: bone.id, keyframes: frames });
  const oscillation = (bone, durationMs, midTime, changes) => track(bone, [
    baseFrame(bone, 0),
    baseFrame(bone, midTime, changes),
    baseFrame(bone, durationMs)
  ]);
  const clips = [];
  const idleTracks = [];
  if (body) idleTracks.push(oscillation(body, 1200, 600, { y: body.y - 2, scaleX: body.scaleX * 0.99, scaleY: body.scaleY * 1.015 }));
  for (const bone of leaves) idleTracks.push(oscillation(bone, 1200, 600, { rotation: bone.rotation + 3 }));
  if (head) idleTracks.push(oscillation(head, 1200, 600, { rotation: head.rotation - 1.5 }));
  clips.push({ id: "idle", name: "Idle · breathing", durationMs: 1200, fps: 12, loop: true, tracks: idleTracks });

  const moveTracks = [];
  if (body) moveTracks.push(oscillation(body, 600, 300, { y: body.y - 4 }));
  for (const bone of leaves) moveTracks.push(oscillation(bone, 600, 300, { rotation: bone.rotation - 5 }));
  clips.push({ id: "move", name: "Move · bounce", durationMs: 600, fps: 12, loop: true, tracks: moveTracks });

  const attackTargets = weapons.length ? weapons : arms.length ? arms : body ? [body] : [];
  clips.push({
    id: "attack", name: "Attack · strike", durationMs: 520, fps: 15, loop: false,
    tracks: attackTargets.map((bone) => track(bone, [
      baseFrame(bone, 0),
      baseFrame(bone, 160, { rotation: bone.rotation - 28 }),
      baseFrame(bone, 340, { rotation: bone.rotation + 8 }),
      baseFrame(bone, 520)
    ]))
  });

  const hitTargets = [body, head].filter(Boolean);
  clips.push({
    id: "hit", name: "Hit · recoil", durationMs: 360, fps: 15, loop: false,
    tracks: hitTargets.map((bone) => track(bone, [
      baseFrame(bone, 0),
      baseFrame(bone, 100, { rotation: bone.rotation + 8, scaleX: bone.scaleX * 0.94, scaleY: bone.scaleY * 1.03 }),
      baseFrame(bone, 360)
    ]))
  });

  const deathTarget = body || visible[0];
  clips.push({
    id: "death", name: "Death · fall", durationMs: 900, fps: 12, loop: false,
    tracks: deathTarget ? [track(deathTarget, [
      baseFrame(deathTarget, 0),
      baseFrame(deathTarget, 500, { rotation: deathTarget.rotation + 38, scaleX: deathTarget.scaleX * 0.9, scaleY: deathTarget.scaleY * 0.72 }),
      baseFrame(deathTarget, 900, { rotation: deathTarget.rotation + 82, scaleX: deathTarget.scaleX * 0.78, scaleY: deathTarget.scaleY * 0.32 })
    ])] : []
  });
  return clips;
}

/**
 * Builds a deterministic version-1 skeletal profile from already extracted image layers.
 * Segmentation, role confirmation, and pixel reconstruction intentionally happen upstream.
 */
export function buildAutoRigFromParts(input) {
  if (!input || typeof input !== "object") throw new TypeError("Auto-Rig input is required.");
  const canvasInput = input.canvas || {};
  const canvas = {
    width: finite(canvasInput.width, "canvas.width"),
    height: finite(canvasInput.height, "canvas.height")
  };
  if (!Number.isInteger(canvas.width) || !Number.isInteger(canvas.height) || canvas.width < 1 || canvas.height < 1 || canvas.width > 4096 || canvas.height > 4096) {
    throw new RangeError("Canvas dimensions must be integers between 1 and 4096.");
  }
  if (!Array.isArray(input.parts) || input.parts.length < 1 || input.parts.length > 63) {
    throw new RangeError("Auto-Rig requires between 1 and 63 extracted parts.");
  }
  const parts = input.parts.map((part, index) => readPart(part, index, canvas));
  const ids = new Set();
  for (const part of parts) {
    if (ids.has(part.id)) throw new RangeError("Duplicate part instance ID: " + part.id + ".");
    ids.add(part.id);
  }
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const sourceInput = input.source && typeof input.source === "object" ? input.source : {};
  const sourceAssetId = sourceInput.assetId == null ? null : readId(sourceInput.assetId, "source.assetId");
  const sourceSha256 = sourceInput.sha256 == null ? null : String(sourceInput.sha256).toLowerCase();
  if (sourceSha256 !== null && !/^[a-f0-9]{64}$/.test(sourceSha256)) throw new TypeError("source.sha256 must be a 64-character hexadecimal SHA-256 digest.");
  const sourceFrame = sourceInput.frame == null ? 0 : finite(sourceInput.frame, "source.frame");
  if (!Number.isInteger(sourceFrame) || sourceFrame < 0 || sourceFrame > 10000) throw new RangeError("source.frame must be an integer from 0 to 10000.");
  const center = { x: canvas.width / 2, y: canvas.height / 2 };
  const bones = [{
    id: "root", name: "Root", parentId: null,
    x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
    pivot: { x: 0, y: 0 }, part: null
  }];
  const parentByPartId = new Map();
  const pending = new Set(parts.map((part) => part.id));
  while (pending.size) {
    let progressed = false;
    for (const part of parts) {
      if (!pending.has(part.id)) continue;
      const parent = chooseParent(part, partsById, parts);
      if (parent && pending.has(parent.id)) continue;
      if (!part.pivotExplicit) part.pivot = suggestAutoPivot(part, parent);
      const parentBoneId = parent ? "part-" + parent.id : "root";
      const parentPivot = parent ? parent.pivot : center;
      const boneId = "part-" + part.id;
      bones.push({
        id: boneId,
        name: part.name,
        parentId: parentBoneId,
        x: part.pivot.x - parentPivot.x,
        y: part.pivot.y - parentPivot.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        pivot: { x: part.pivot.x - part.bounds.x, y: part.pivot.y - part.bounds.y },
        part: { assetId: part.assetId, frame: part.frame }
      });
      parentByPartId.set(part.id, parent ? parent.id : null);
      pending.delete(part.id);
      progressed = true;
    }
    if (!progressed) throw new RangeError("Part parent relationships contain a cycle.");
  }

  const attachments = [];
  const muzzle = input.anchors?.muzzle;
  if (input.requiresMuzzle && !muzzle) throw new RangeError("A projectile rig requires a confirmed muzzle/emitter anchor.");
  if (muzzle) {
    const weapon = muzzle.partId
      ? partsById.get(readId(muzzle.partId, "anchors.muzzle.partId", 59))
      : parts.find((part) => part.role === "weapon.barrel") || parts.find((part) => part.role === "weapon") || parts.find((part) => part.role === "weapon.muzzle") || parts.find((part) => part.role === "mouth") || parts.find((part) => part.role === "head") || parts.find((part) => part.role === "face");
    if (muzzle.partId && !weapon) throw new RangeError("Muzzle anchor references a missing emitter part.");
    if (!weapon || !MUZZLE_EMITTER_ROLES.has(weapon.role)) {
      throw new RangeError("A muzzle anchor must reference a weapon, barrel, muzzle-region, mouth, head, or face part.");
    }
    const x = finite(muzzle.x, "anchors.muzzle.x");
    const y = finite(muzzle.y, "anchors.muzzle.y");
    if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) throw new RangeError("Muzzle anchor must lie inside the source canvas.");
    if (x < weapon.bounds.x || y < weapon.bounds.y || x > weapon.bounds.x + weapon.bounds.width || y > weapon.bounds.y + weapon.bounds.height) {
      throw new RangeError("Muzzle anchor must lie inside or on the confirmed emitter part bounds.");
    }
    attachments.push({
      id: "muzzle",
      name: "Muzzle / emitter",
      boneId: "part-" + weapon.id,
      x: x - weapon.pivot.x,
      y: y - weapon.pivot.y,
      rotation: finite(muzzle.rotation ?? 0, "anchors.muzzle.rotation"),
      scaleX: 1,
      scaleY: 1
    });
  }

  const clips = buildStarterClips(bones, parts);
  const profile = createSkeletalRigProfile({ version: 1, canvas, bones, attachments, hitboxes: [], clips });
  const warnings = [];
  for (const part of parts) {
    if (!KNOWN_ROLES.has(part.role)) warnings.push({ code: "unknown-role", partId: part.id, role: part.role });
    if (part.occlusion === "unresolved") warnings.push({ code: "unresolved-occlusion", partId: part.id });
    if (part.occlusion === "reconstructed" || part.provenance.pixels === "reconstructed") warnings.push({ code: "generated-pixels", partId: part.id });
  }
  return {
    profile,
    manifest: {
      version: 1,
      builder: "farmvsmonsters-auto-rig",
      generator: { id: "farmvsmonsters-auto-rig", version: 1 },
      roleDictionaryVersion: AUTO_RIG_ROLE_DICTIONARY_VERSION,
      source: { assetId: sourceAssetId, sha256: sourceSha256, frame: sourceFrame, width: canvas.width, height: canvas.height },
      canvas,
      parts: parts.map((part) => ({
        id: part.id, assetId: part.assetId, role: part.role, side: part.side,
        bounds: part.bounds, pivot: part.pivot, parentPartId: parentByPartId.get(part.id),
        drawOrder: part.drawOrder, confidence: part.confidence, occlusion: part.occlusion,
        mask: part.mask, provenance: part.provenance
      })),
      anchors: attachments.map((attachment) => ({ id: attachment.id, boneId: attachment.boneId, x: attachment.x, y: attachment.y })),
      animation: { generator: "procedural-starter", version: 1, clipIds: clips.map((clip) => clip.id) },
      warnings
    },
    warnings
  };
}


export function validateAutoRigBuildManifest(input, profileInput) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Auto-Rig build manifest must be an object.");
    if (Number(input.version) !== 1 || input.builder !== "farmvsmonsters-auto-rig") throw new RangeError("Unsupported Auto-Rig build manifest version or builder.");
    if (input.roleDictionaryVersion !== AUTO_RIG_ROLE_DICTIONARY_VERSION) throw new RangeError("Auto-Rig role dictionary version does not match this Studio build.");
    if (input.generator?.id !== "farmvsmonsters-auto-rig" || Number(input.generator?.version) !== 1) throw new RangeError("Unsupported Auto-Rig generator identity or version.");
    const profile = createSkeletalRigProfile(profileInput);
    const canvas = input.canvas || {};
    if (Number(canvas.width) !== profile.canvas.width || Number(canvas.height) !== profile.canvas.height) {
      throw new RangeError("Auto-Rig manifest canvas does not match the skeletal profile canvas.");
    }
    if (!input.source || Number(input.source.width) !== profile.canvas.width || Number(input.source.height) !== profile.canvas.height) {
      throw new RangeError("Auto-Rig source dimensions do not match the generated canvas.");
    }
    if (input.source.assetId != null) readId(input.source.assetId, "manifest.source.assetId");
    if (input.source.sha256 != null && !/^[a-f0-9]{64}$/i.test(String(input.source.sha256))) {
      throw new TypeError("Auto-Rig source hash is invalid.");
    }
    const sourceFrame = Number(input.source.frame ?? 0);
    if (!Number.isInteger(sourceFrame) || sourceFrame < 0 || sourceFrame > 10000) throw new RangeError("Auto-Rig source frame is invalid.");
    if (!Array.isArray(input.parts) || input.parts.length < 1 || input.parts.length > 63) {
      throw new RangeError("Auto-Rig manifest must contain between 1 and 63 parts.");
    }
    const parts = input.parts.map((part, index) => readPart(part, index, profile.canvas));
    const byId = new Map();
    for (const part of parts) {
      if (byId.has(part.id)) throw new RangeError("Duplicate manifest part ID: " + part.id + ".");
      byId.set(part.id, part);
    }
    for (const part of parts) {
      if (part.parentPartId && !byId.has(part.parentPartId)) throw new RangeError("Manifest part " + part.id + " references a missing parent.");
      const visited = new Set([part.id]);
      let parentId = part.parentPartId;
      while (parentId) {
        if (visited.has(parentId)) throw new RangeError("Auto-Rig manifest parent graph contains a cycle.");
        visited.add(parentId);
        parentId = byId.get(parentId)?.parentPartId || null;
      }
    }
    return { valid: true, manifest: input, profile, errors: [] };
  } catch (error) {
    return { valid: false, manifest: null, profile: null, errors: [error.message] };
  }
}


/**
 * Produces an actionable quality report without silently repairing authoring data.
 * Invalid manifests are blocking; heuristic findings remain explicit warnings.
 */
export function analyzeAutoRigQuality(manifest, profileInput) {
  const validation = validateAutoRigBuildManifest(manifest, profileInput);
  if (!validation.valid) {
    return {
      valid: false,
      readyForAnimation: false,
      score: 0,
      checks: {},
      errors: validation.errors,
      warnings: []
    };
  }
  const parts = manifest.parts;
  const rolesConfirmed = parts.every((part) => KNOWN_ROLES.has(normalizeRole(part.role)));
  const allMasksPresent = parts.every((part) => part.mask?.kind === "polygon" && part.mask.points.length >= 3);
  const confidenceReviewed = parts.every((part) => part.confidence !== null && part.confidence !== undefined);
  const occlusionResolved = parts.every((part) => part.occlusion !== "unresolved");
  const sourceFingerprintPresent = /^[a-f0-9]{64}$/i.test(String(manifest.source.sha256 || ""));
  const hasPrimaryBody = parts.some((part) => ["body", "stem"].includes(normalizeRole(part.role)));
  const lowConfidenceCount = parts.filter((part) => part.confidence != null && Number.isFinite(Number(part.confidence)) && Number(part.confidence) < 0.65).length;
  const reconstructedCount = parts.filter((part) => part.provenance?.pixels === "reconstructed").length;
  const warnings = [];
  if (!rolesConfirmed) warnings.push({ code: "unconfirmed-semantic-role", message: "One or more parts still have unknown semantic roles." });
  if (!allMasksPresent) warnings.push({ code: "missing-editable-mask", message: "One or more parts have no editable polygon mask." });
  if (!confidenceReviewed) warnings.push({ code: "missing-confidence", message: "One or more parts have no model confidence value; manually review them." });
  if (lowConfidenceCount) warnings.push({ code: "low-confidence", count: lowConfidenceCount, message: "Review low-confidence segmentation proposals." });
  if (!occlusionResolved) warnings.push({ code: "unresolved-occlusion", message: "One or more parts have unresolved occlusion." });
  if (reconstructedCount) warnings.push({ code: "reconstructed-pixels", count: reconstructedCount, message: "Review generated pixels before publishing." });
  if (!sourceFingerprintPresent) warnings.push({ code: "missing-source-fingerprint", message: "The original source image has no SHA-256 fingerprint." });
  if (!hasPrimaryBody) warnings.push({ code: "missing-primary-body", message: "No body or stem role is assigned; the rig may lack a stable primary anchor." });
  const penalty = (condition, amount) => condition ? amount : 0;
  const score = Math.max(0, 100
    - penalty(!rolesConfirmed, 20)
    - penalty(!allMasksPresent, 15)
    - penalty(!confidenceReviewed, 8)
    - Math.min(15, lowConfidenceCount * 5)
    - penalty(!occlusionResolved, 15)
    - Math.min(10, reconstructedCount * 3)
    - penalty(!sourceFingerprintPresent, 5)
    - penalty(!hasPrimaryBody, 10));
  return {
    valid: true,
    readyForAnimation: rolesConfirmed && allMasksPresent && confidenceReviewed && lowConfidenceCount === 0 && occlusionResolved && sourceFingerprintPresent && hasPrimaryBody && reconstructedCount === 0,
    score,
    checks: {
      rolesConfirmed,
      allMasksPresent,
      confidenceReviewed,
      occlusionResolved,
      sourceFingerprintPresent,
      hasPrimaryBody,
      lowConfidenceCount,
      reconstructedCount
    },
    errors: [],
    warnings
  };
}


/**
 * Returns a clamped, validated polygon after moving one source-space vertex.
 * Invalid/degenerate edits are rejected so a drag cannot corrupt the saved mask.
 */
export function moveAutoRigPolygonVertex(points, vertexIndex, position, canvas) {
  if (!Array.isArray(points) || points.length < 3 || points.length > 512) {
    throw new TypeError("Editable mask must contain 3–512 vertices.");
  }
  if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= points.length) {
    throw new RangeError("Editable mask vertex index is out of range.");
  }
  const width = finite(canvas?.width, "canvas.width");
  const height = finite(canvas?.height, "canvas.height");
  if (width < 1 || height < 1) throw new RangeError("Editable mask canvas dimensions must be positive.");
  const x = Math.max(0, Math.min(width, finite(position?.x, "position.x")));
  const y = Math.max(0, Math.min(height, finite(position?.y, "position.y")));
  const next = points.map((point, index) => {
    if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
      throw new TypeError("Editable mask contains an invalid vertex.");
    }
    return index === vertexIndex ? { x, y } : { x: Number(point.x), y: Number(point.y) };
  });
  const area = Math.abs(next.reduce((sum, point, index) => {
    const following = next[(index + 1) % next.length];
    return sum + point.x * following.y - following.x * point.y;
  }, 0) / 2);
  if (area < 1) throw new RangeError("Vertex edit would collapse the mask polygon.");
  return next;
}
