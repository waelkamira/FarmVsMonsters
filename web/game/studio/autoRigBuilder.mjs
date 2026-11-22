import { createSkeletalRigProfile } from "./skeletalAnimation.mjs";

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/;
export const AUTO_RIG_ROLE_DICTIONARY_VERSION = "1.0.0";
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
  const segmentation = ["manual-polygon", "model-mask", "imported-mask"].includes(provenanceInput.segmentation)
    ? provenanceInput.segmentation : (mask ? "manual-polygon" : "unspecified");
  const pixels = ["source", "reconstructed"].includes(provenanceInput.pixels) ? provenanceInput.pixels : "source";
  if (confidence !== null && (confidence < 0 || confidence > 1)) throw new RangeError("Part " + id + " confidence must be between 0 and 1.");
  return {
    id, assetId, role, side, frame, bounds: { x, y, width, height },
    pivot: { x: pivotX, y: pivotY },
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
function buildStaticClip(id, name, durationMs, loop, bones) {
  return {
    id, name, durationMs, fps: 24, loop,
    tracks: bones.map((bone) => ({
      boneId: bone.id,
      keyframes: [
        { timeMs: 0, x: bone.x, y: bone.y, rotation: bone.rotation, scaleX: bone.scaleX, scaleY: bone.scaleY },
        { timeMs: durationMs, x: bone.x, y: bone.y, rotation: bone.rotation, scaleX: bone.scaleX, scaleY: bone.scaleY }
      ]
    }))
  };
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
  if (input.requiresMuzzle && !muzzle) throw new RangeError("A projectile rig requires a confirmed muzzle anchor.");
  if (muzzle) {
    const weapon = muzzle.partId
      ? partsById.get(readId(muzzle.partId, "anchors.muzzle.partId", 59))
      : parts.find((part) => part.role === "weapon.barrel") || parts.find((part) => part.role === "weapon");
    if (muzzle.partId && !weapon) throw new RangeError("Muzzle anchor references a missing weapon part.");
    if (!weapon || !["weapon", "weapon.barrel"].includes(weapon.role)) {
      throw new RangeError("A muzzle anchor must reference a weapon or weapon-barrel part.");
    }
    const x = finite(muzzle.x, "anchors.muzzle.x");
    const y = finite(muzzle.y, "anchors.muzzle.y");
    if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) throw new RangeError("Muzzle anchor must lie inside the source canvas.");
    if (x < weapon.bounds.x || y < weapon.bounds.y || x > weapon.bounds.x + weapon.bounds.width || y > weapon.bounds.y + weapon.bounds.height) {
      throw new RangeError("Muzzle anchor must lie inside or on the confirmed weapon part bounds.");
    }
    attachments.push({
      id: "muzzle",
      name: "Weapon muzzle",
      boneId: "part-" + weapon.id,
      x: x - weapon.pivot.x,
      y: y - weapon.pivot.y,
      rotation: finite(muzzle.rotation ?? 0, "anchors.muzzle.rotation"),
      scaleX: 1,
      scaleY: 1
    });
  }

  const clips = [buildStaticClip("idle", "Idle", 1000, true, bones)];
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
      warnings
    },
    warnings
  };
}
