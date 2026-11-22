function readRectangle(rectangle) {
  const x = Number(rectangle?.x), y = Number(rectangle?.y);
  const width = Math.abs(Number(rectangle?.width)), height = Math.abs(Number(rectangle?.height));
  const rotation = Number(rectangle?.rotation ?? 0);
  if (![x, y, width, height, rotation].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new TypeError("A collision rectangle requires finite coordinates, positive dimensions, and a finite rotation.");
  }
  const angle = rotation * Math.PI / 180;
  const ux = { x: Math.cos(angle), y: Math.sin(angle) };
  const uy = { x: -Math.sin(angle), y: Math.cos(angle) };
  return { x, y, width, height, ux, uy };
}

export function orientedRectanglesOverlap(first, second) {
  const a = readRectangle(first), b = readRectangle(second);
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const axis of [a.ux, a.uy, b.ux, b.uy]) {
    const distance = Math.abs(dx * axis.x + dy * axis.y);
    const radiusA = a.width / 2 * Math.abs(a.ux.x * axis.x + a.ux.y * axis.y)
      + a.height / 2 * Math.abs(a.uy.x * axis.x + a.uy.y * axis.y);
    const radiusB = b.width / 2 * Math.abs(b.ux.x * axis.x + b.ux.y * axis.y)
      + b.height / 2 * Math.abs(b.uy.x * axis.x + b.uy.y * axis.y);
    if (distance > radiusA + radiusB) return false;
  }
  return true;
}

export function circleIntersectsOrientedRectangle(circle, rectangle) {
  const x = Number(circle?.x), y = Number(circle?.y), radius = Number(circle?.radius);
  if (![x, y, radius].every(Number.isFinite) || radius < 0) {
    throw new TypeError("A collision circle requires finite coordinates and a non-negative radius.");
  }
  const rect = readRectangle(rectangle);
  const dx = x - rect.x, dy = y - rect.y;
  const localX = dx * rect.ux.x + dy * rect.ux.y;
  const localY = dx * rect.uy.x + dy * rect.uy.y;
  const nearestX = Math.max(-rect.width / 2, Math.min(rect.width / 2, localX));
  const nearestY = Math.max(-rect.height / 2, Math.min(rect.height / 2, localY));
  return Math.hypot(localX - nearestX, localY - nearestY) <= radius;
}
