export function transformRigPointToWorld(point, parentTransform) {
  const x = Number(point?.x), y = Number(point?.y);
  const parentX = Number(parentTransform?.x), parentY = Number(parentTransform?.y);
  const scaleX = Number(parentTransform?.scaleX ?? 1), scaleY = Number(parentTransform?.scaleY ?? 1);
  const rotation = Number(parentTransform?.rotation ?? 0);
  const pointRotation = Number(point?.rotation ?? 0);
  const pointScaleX = Number(point?.scaleX ?? 1), pointScaleY = Number(point?.scaleY ?? 1);
  if (![x, y, parentX, parentY, scaleX, scaleY, rotation, pointRotation, pointScaleX, pointScaleY].every(Number.isFinite)) {
    throw new TypeError("Rig point and parent transform values must be finite numbers.");
  }
  const scaledX = x * scaleX, scaledY = y * scaleY;
  return {
    ...point,
    x: parentX + scaledX * Math.cos(rotation) - scaledY * Math.sin(rotation),
    y: parentY + scaledX * Math.sin(rotation) + scaledY * Math.cos(rotation),
    rotation: pointRotation + rotation * 180 / Math.PI,
    scaleX: pointScaleX * scaleX,
    scaleY: pointScaleY * scaleY
  };
}
