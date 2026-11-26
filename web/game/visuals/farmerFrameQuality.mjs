/**
 * Shared sizing rules for the farmer's independently authored animation sheets.
 * Use the tallest visible pose as the stable reference for each sheet.
 */
export function getFarmerSheetReferenceHeight(frameHeights = []) {
  const validHeights = frameHeights.filter((height) => Number.isFinite(height) && height > 0);
  return validHeights.length ? Math.max(...validHeights) : null;
}

export function resolveFarmerSheetScale(targetDisplayHeight, frameHeights = []) {
  if (!Number.isFinite(targetDisplayHeight) || targetDisplayHeight <= 0) return null;
  const referenceHeight = getFarmerSheetReferenceHeight(frameHeights);
  return referenceHeight ? targetDisplayHeight / referenceHeight : null;
}
