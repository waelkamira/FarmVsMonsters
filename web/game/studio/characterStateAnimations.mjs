export const CHARACTER_STATUS_STATES = Object.freeze([
  Object.freeze({ id: "burn", effectId: "burn", label: "محروق", hint: "إطارات بديلة للشخصية أثناء حالة الحرق." }),
  Object.freeze({ id: "freeze", effectId: "freeze", label: "متجمّد", hint: "إطارات بديلة للشخصية أثناء حالة التجمد." }),
  Object.freeze({ id: "electric-shock", effectId: "electric-shock", label: "مصدوم كهربائياً", hint: "إطارات بديلة للشخصية أثناء الصعق." }),
  Object.freeze({ id: "poison", effectId: "poison", label: "مسموم", hint: "إطارات بديلة للشخصية أثناء التسمم." }),
  Object.freeze({ id: "stun-stars", effectId: "stun-stars", label: "مذهول", hint: "إطارات بديلة للشخصية أثناء الدوخة." })
]);

const STATE_IDS = new Set(CHARACTER_STATUS_STATES.map((state) => state.id));

export function validateCharacterStateAnimation(input, { maxFrames = 24 } = {}) {
  const errors = [];
  const stateId = String(input?.stateId || "");
  const rows = Number(input?.rows);
  const columns = Number(input?.columns);
  const frameCount = Number(input?.frameCount);
  const fps = Number(input?.fps ?? 10);
  const path = input?.path;
  if (!STATE_IDS.has(stateId)) errors.push("حالة الشخصية غير مدعومة.");
  if (typeof path !== "string" || !path.startsWith("/assets/") || /[?#\\\\]/.test(path) || path.slice(1).split("/").some((part) => part === "." || part === ".." || !part)) errors.push("مسار إطارات الحالة غير صالح.");
  if (!Number.isInteger(rows) || rows < 1 || rows > 24) errors.push("عدد صفوف الحالة يجب أن يكون بين 1 و24.");
  if (!Number.isInteger(columns) || columns < 1 || columns > 24) errors.push("عدد أعمدة الحالة يجب أن يكون بين 1 و24.");
  if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > maxFrames || rows * columns !== frameCount) errors.push("عدد إطارات الحالة يجب أن يطابق الصفوف × الأعمدة وألا يتجاوز " + maxFrames + ".");
  if (!Number.isFinite(fps) || fps < 1 || fps > 30) errors.push("سرعة الحالة يجب أن تكون بين 1 و30 إطاراً في الثانية.");
  return { valid: errors.length === 0, errors, profile: errors.length ? null : { stateId, path, rows, columns, frameCount, fps, loop: input?.loop !== false, spriteSheet: true } };
}

export function validateCharacterStateAnimations(input) {
  const errors = [];
  const states = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  for (const [stateId, value] of Object.entries(states)) {
    const result = validateCharacterStateAnimation({ ...value, stateId });
    if (!result.valid) errors.push(...result.errors.map((message) => stateId + ": " + message));
  }
  return { valid: errors.length === 0, errors };
}
