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

function readPolygon(value) {
  const points = Array.isArray(value?.points) ? value.points : value;
  if (!Array.isArray(points) || points.length < 3) throw new TypeError("A collision polygon requires at least three points.");
  const normalized = points.map((point) => ({ x: Number(point?.x), y: Number(point?.y) }));
  if (normalized.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new TypeError("Collision polygon points must have finite coordinates.");
  }
  return normalized;
}

function polygonAxes(points) {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const dx = next.x - point.x, dy = next.y - point.y;
    const length = Math.hypot(dx, dy);
    if (length <= 1e-9) throw new TypeError("Collision polygons cannot contain zero-length edges.");
    return { x: -dy / length, y: dx / length };
  });
}

export function convexPolygonsOverlap(first, second) {
  const a = readPolygon(first), b = readPolygon(second);
  for (const axis of [...polygonAxes(a), ...polygonAxes(b)]) {
    const project = (points) => {
      let min = Infinity, max = -Infinity;
      for (const point of points) {
        const value = point.x * axis.x + point.y * axis.y;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      return { min, max };
    };
    const rangeA = project(a), rangeB = project(b);
    if (rangeA.max < rangeB.min || rangeB.max < rangeA.min) return false;
  }
  return true;
}

export function circleIntersectsConvexPolygon(circle, polygon) {
  const x = Number(circle?.x), y = Number(circle?.y), radius = Number(circle?.radius);
  if (![x, y, radius].every(Number.isFinite) || radius < 0) {
    throw new TypeError("A collision circle requires finite coordinates and a non-negative radius.");
  }
  const points = readPolygon(polygon);
  let inside = true;
  let sign = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index], b = points[(index + 1) % points.length];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (Math.abs(cross) > 1e-9) {
      const nextSign = Math.sign(cross);
      if (sign && nextSign !== sign) inside = false;
      sign = nextSign;
    }
  }
  if (inside) return true;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index], b = points[(index + 1) % points.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const amount = lengthSquared ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared)) : 0;
    const nearestX = a.x + amount * dx, nearestY = a.y + amount * dy;
    if (Math.hypot(x - nearestX, y - nearestY) <= radius) return true;
  }
  return false;
}
