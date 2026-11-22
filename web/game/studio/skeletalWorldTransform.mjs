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

export function transformRigHitboxToWorld(hitbox, parentTransform) {
  const width = Number(hitbox?.width), height = Number(hitbox?.height);
  const rotation = Number(hitbox?.rotation ?? 0) * Math.PI / 180;
  if (![width, height, rotation].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new TypeError("Rig hitbox dimensions and rotation must be finite, with positive dimensions.");
  }
  const cosine = Math.cos(rotation), sine = Math.sin(rotation);
  const halfWidth = width / 2, halfHeight = height / 2;
  const localCorners = [
    [-halfWidth, -halfHeight], [halfWidth, -halfHeight],
    [halfWidth, halfHeight], [-halfWidth, halfHeight]
  ];
  const points = localCorners.map(([x, y]) => transformRigPointToWorld({
    x: Number(hitbox.x) + x * cosine - y * sine,
    y: Number(hitbox.y) + x * sine + y * cosine
  }, parentTransform));
  const center = transformRigPointToWorld(hitbox, parentTransform);
  return { ...center, points };
}
