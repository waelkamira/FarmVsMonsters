/**
 * Conservative geometry-only semantic role suggestions for SAM 2 masks.
 * These are hints, never approvals: the author must inspect and choose each role.
 */
export function suggestAutoRigSemanticRoles(proposals, canvas, characterType = "plant") {
  if (!Array.isArray(proposals)) throw new TypeError("Semantic proposals must be an array.");
  const width = Number(canvas?.width), height = Number(canvas?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new TypeError("Semantic classification requires positive source dimensions.");
  }
  if (!proposals.length) return [];
  const kind = characterType === "monster" ? "monster" : "plant";
  const items = proposals.map((proposal, index) => {
    const bounds = proposal?.bounds || {};
    const x = Number(bounds.x), y = Number(bounds.y), w = Number(bounds.width), h = Number(bounds.height);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0 ||
        x < 0 || y < 0 || x + w > width || y + h > height) {
      throw new RangeError("Semantic proposal " + index + " has invalid source bounds.");
    }
    return { proposal, x, y, w, h, area: w * h, cx: (x + w / 2) / width, cy: (y + h / 2) / height, ratio: w / h };
  }).sort((a, b) => b.area - a.area || a.cy - b.cy || a.cx - b.cx);
  const largest = items[0];
  const centerCandidates = items.filter((item) => item.cx >= 0.2 && item.cx <= 0.8);
  const primary = centerCandidates.sort((a, b) => b.area - a.area)[0] || largest;
  const assigned = new Set();
  const suggestions = new Map();
  const add = (item, role, confidence, reason) => {
    if (!item || assigned.has(item)) return;
    assigned.add(item);
    suggestions.set(item.proposal.id, { role, confidence, reason });
  };
  add(primary, kind === "plant" ? "body" : "body", 0.58,
    "أكبر منطقة قريبة من مركز الشخصية؛ اقتراح هندسي يحتاج تأكيداً بصرياً");
  for (const item of items) {
    if (assigned.has(item)) continue;
    const dx = item.cx - primary.cx;
    const above = item.cy < primary.cy - 0.14;
    const below = item.cy > primary.cy + 0.12;
    const side = Math.abs(dx) > 0.13;
    const wide = item.ratio > 1.25;
    if (kind === "plant") {
      if (below && item.ratio < 0.9 && item.area < primary.area * 0.8) {
        add(item, "stem", 0.48, "منطقة سفلية طويلة نسبياً؛ قد تكون ساقاً");
      } else if (side && wide && item.area < primary.area * 0.9) {
        add(item, dx < 0 ? "leaf.left" : "leaf.right", 0.52, "امتداد جانبي؛ قد يكون ورقة");
      } else if (above && item.area < primary.area * 0.7) {
        add(item, "head", 0.42, "منطقة أعلى الجسم؛ قد تكون رأساً أو زهرة");
      } else {
        add(item, "accessory", 0.3, "الشكل وحده لا يكفي لتحديد الدور");
      }
    } else {
      if (above && item.area < primary.area * 0.75) {
        add(item, "head", 0.5, "منطقة علوية أصغر من الجسم؛ قد تكون الرأس");
      } else if (side && item.area < primary.area * 0.65) {
        add(item, dx < 0 ? "arm.left" : "arm.right", 0.46, "امتداد جانبي؛ قد يكون ذراعاً");
      } else if (below && item.ratio < 0.8) {
        add(item, "accessory", 0.32, "منطقة سفلية؛ لا يمكن تحديد دورها بثقة من الشكل وحده");
      } else {
        add(item, "accessory", 0.3, "الشكل وحده لا يكفي لتحديد الدور");
      }
    }
  }
  return items.map((item) => ({
    proposalId: item.proposal.id,
    ...(suggestions.get(item.proposal.id) || { role: "accessory", confidence: 0.25, reason: "اقتراح منخفض الثقة" })
  }));
}
