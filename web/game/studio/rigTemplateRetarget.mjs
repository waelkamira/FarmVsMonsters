const MAX_PARTS = 63;

function positiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 1 || value > 4096) {
    throw new RangeError(field + " must be an integer between 1 and 4096.");
  }
  return value;
}

function readBounds(value, field, canvas) {
  if (!value || typeof value !== "object") throw new TypeError(field + " is required.");
  const { x, y, width, height } = value;
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0 ||
      x < 0 || y < 0 || x + width > canvas.width || y + height > canvas.height) {
    throw new RangeError(field + " must fit inside its source canvas.");
  }
  return { x, y, width, height };
}

function center(bounds, canvas) {
  return {
    x: (bounds.x + bounds.width / 2) / canvas.width,
    y: (bounds.y + bounds.height / 2) / canvas.height
  };
}

function normalizedPivot(part, bounds) {
  const pivot = part.pivot && Number.isFinite(part.pivot.x) && Number.isFinite(part.pivot.y)
    ? part.pivot
    : { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  return {
    x: Math.max(0, Math.min(1, (pivot.x - bounds.x) / bounds.width)),
    y: Math.max(0, Math.min(1, (pivot.y - bounds.y) / bounds.height))
  };
}

/**
 * Suggests a one-to-one semantic retarget from a reviewed rig manifest.
 * It never edits input data and every returned mapping remains author-reviewable.
 */
export function suggestRigTemplateRetarget(templateManifest, targetParts, targetCanvas) {
  if (!templateManifest || typeof templateManifest !== "object" || Array.isArray(templateManifest)) {
    throw new TypeError("A saved Auto-Rig template manifest is required.");
  }
  const templateCanvas = templateManifest.canvas;
  const sourceCanvas = {
    width: positiveInteger(templateCanvas?.width, "Template canvas width"),
    height: positiveInteger(templateCanvas?.height, "Template canvas height")
  };
  const destinationCanvas = {
    width: positiveInteger(targetCanvas?.width, "Target canvas width"),
    height: positiveInteger(targetCanvas?.height, "Target canvas height")
  };
  if (!Array.isArray(templateManifest.parts) || templateManifest.parts.length < 1 || templateManifest.parts.length > MAX_PARTS) {
    throw new RangeError("Template must contain between 1 and 63 semantic parts.");
  }
  if (!Array.isArray(targetParts) || targetParts.length < 1 || targetParts.length > MAX_PARTS) {
    throw new RangeError("Target must contain between 1 and 63 extracted parts.");
  }

  const templateParts = templateManifest.parts.map((part, index) => {
    if (!part || typeof part.id !== "string" || !part.id || typeof part.role !== "string" || !part.role) {
      throw new TypeError("Template part " + index + " requires a stable ID and semantic role.");
    }
    return {
      ...part,
      bounds: readBounds(part.bounds, "Template part " + part.id + " bounds", sourceCanvas),
      normalizedCenter: center(part.bounds, sourceCanvas),
      normalizedPivot: normalizedPivot(part, part.bounds)
    };
  });
  const targets = targetParts.map((part, index) => {
    if (!part || typeof part.id !== "string" || !part.id || typeof part.role !== "string" || !part.role) {
      throw new TypeError("Target part " + index + " requires a stable ID and an assigned semantic role.");
    }
    const bounds = readBounds(part.bounds, "Target part " + part.id + " bounds", destinationCanvas);
    return { ...part, bounds, normalizedCenter: center(bounds, destinationCanvas) };
  });
  if (new Set(templateParts.map((part) => part.id)).size !== templateParts.length ||
      new Set(targets.map((part) => part.id)).size !== targets.length) {
    throw new RangeError("Template and target part IDs must be unique.");
  }

  const candidates = [];
  for (const templatePart of templateParts) {
    for (const targetPart of targets) {
      if (templatePart.role !== targetPart.role) continue;
      if (templatePart.side && targetPart.side && templatePart.side !== targetPart.side) continue;
      const distance = Math.hypot(
        templatePart.normalizedCenter.x - targetPart.normalizedCenter.x,
        templatePart.normalizedCenter.y - targetPart.normalizedCenter.y
      );
      const sidePenalty = templatePart.side && !targetPart.side ? 0.08 : 0;
      const cost = distance + sidePenalty;
      candidates.push({ templatePart, targetPart, cost, distance });
    }
  }
  candidates.sort((a, b) => a.cost - b.cost ||
    a.templatePart.id.localeCompare(b.templatePart.id) ||
    a.targetPart.id.localeCompare(b.targetPart.id));

  const usedTemplate = new Set();
  const usedTargets = new Set();
  const matches = [];
  for (const candidate of candidates) {
    const { templatePart, targetPart } = candidate;
    if (usedTemplate.has(templatePart.id) || usedTargets.has(targetPart.id)) continue;
    usedTemplate.add(templatePart.id);
    usedTargets.add(targetPart.id);
    const pivot = {
      x: targetPart.bounds.x + templatePart.normalizedPivot.x * targetPart.bounds.width,
      y: targetPart.bounds.y + templatePart.normalizedPivot.y * targetPart.bounds.height
    };
    matches.push({
      templatePartId: templatePart.id,
      targetPartId: targetPart.id,
      role: targetPart.role,
      normalizedCenterDistance: Number(candidate.distance.toFixed(4)),
      confidence: Number(Math.max(0.1, Math.min(1, 1 - candidate.cost / 1.25)).toFixed(3)),
      reviewRequired: true,
      update: {
        pivot,
        drawOrder: Number.isFinite(templatePart.drawOrder) ? templatePart.drawOrder : targetPart.drawOrder,
        side: templatePart.side || targetPart.side || null
      }
    });
  }

  const templateToTarget = new Map(matches.map((match) => [match.templatePartId, match.targetPartId]));
  for (const match of matches) {
    const templatePart = templateParts.find((part) => part.id === match.templatePartId);
    const mappedParent = templatePart.parentPartId ? templateToTarget.get(templatePart.parentPartId) : null;
    match.update.parentPartId = mappedParent || null;
    if (templatePart.parentPartId && !mappedParent) {
      match.parentWarning = "Template parent was not matched; automatic parent selection will be used.";
    }
  }

  return {
    templateId: templateManifest.source?.assetId || null,
    matches,
    unmatchedTemplatePartIds: templateParts.filter((part) => !usedTemplate.has(part.id)).map((part) => part.id),
    unmatchedTargetPartIds: targets.filter((part) => !usedTargets.has(part.id)).map((part) => part.id),
    requiresAuthorReview: true
  };
}
