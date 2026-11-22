export function normalizeProjectilePathPoints(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > 18) {
    throw new RangeError("Projectile path must contain between 2 and 18 control points.");
  }
  const normalized = points.map((point, index) => {
    const progress = Number(point?.progress ?? point?.t);
    const x = Number(point?.x);
    const y = Number(point?.y);
    if (![progress, x, y].every(Number.isFinite) || progress < 0 || progress > 1 || Math.abs(x) > 1000 || Math.abs(y) > 1000) {
      throw new RangeError("Invalid projectile path control point.");
    }
    return { progress, x, y, id: String(point.id || "point-" + index) };
  }).sort((a, b) => a.progress - b.progress);
  if (normalized[0].progress !== 0 || normalized[normalized.length - 1].progress !== 1) {
    throw new RangeError("Projectile path must start at 0 and end at 1.");
  }
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].progress - normalized[index - 1].progress < 0.001) {
      throw new RangeError("Projectile path points must have distinct progress positions.");
    }
  }
  return normalized.map(({progress, x, y}) => ({progress, x, y}));
}

function sampleControlPoints(points, progress) {
  const t = Math.min(1, Math.max(0, Number(progress) || 0));
  let right = points.findIndex(point => point.progress >= t);
  if (right <= 0) return { x: points[0].x, y: points[0].y };
  if (right < 0) return { x: points[points.length - 1].x, y: points[points.length - 1].y };
  const p0 = points[Math.max(0, right - 2)];
  const p1 = points[right - 1];
  const p2 = points[right];
  const p3 = points[Math.min(points.length - 1, right + 1)];
  const span = Math.max(0.000001, p2.progress - p1.progress);
  const u = Math.min(1, Math.max(0, (t - p1.progress) / span));
  const interpolate = key => {
    const m1 = ((p2[key] - p0[key]) / Math.max(0.000001, p2.progress - p0.progress)) * span;
    const m2 = ((p3[key] - p1[key]) / Math.max(0.000001, p3.progress - p1.progress)) * span;
    const u2 = u * u, u3 = u2 * u;
    return (2*u3-3*u2+1)*p1[key] + (u3-2*u2+u)*m1 + (-2*u3+3*u2)*p2[key] + (u3-u2)*m2;
  };
  return { x: interpolate("x"), y: interpolate("y") };
}

export function getProjectileHeadCorrection({progress=0,targetX=0,targetY=0,trajectoryEndX=0,trajectoryEndY=0}={}) {
  const t = Math.min(1, Math.max(0, Number(progress) || 0));
  const x = (Number(targetX) - Number(trajectoryEndX)) * t;
  const y = (Number(targetY) - Number(trajectoryEndY)) * t;
  return {
    x: Object.is(x, -0) ? 0 : x,
    y: Object.is(y, -0) ? 0 : y
  };
}

export function getProjectileTrajectoryOffset({type="arc",progress=0,height=0,curveX=0,curveY=110,targetX=0,targetY=0,points=null}={}) {
  const t=Math.min(1,Math.max(0,Number(progress)||0));
  const targetOffset={x:(Number(targetX)||0)*t,y:(Number(targetY)||0)*t};
  if (Array.isArray(points) && points.length >= 2) {
    const offset = sampleControlPoints(points, t);
    // Control-point coordinates are relative to the muzzle, so the first
    // authored point defines zero offset and can never move the launch origin.
    const origin = points[0] || { x: 0, y: 0 };
    return { x: targetOffset.x + offset.x - Number(origin.x || 0), y: targetOffset.y + offset.y - Number(origin.y || 0) + Math.sin(Math.PI*t)*(Number(height)||0) };
  }
  const bend=2*t*(1-t);
  if(type==="straight")return targetOffset;
  if(type==="sine")return {x:targetOffset.x,y:targetOffset.y+Math.sin(Math.PI*2*t)*(Number(height)||0)};
  if(type==="bezier")return {x:targetOffset.x+bend*(Number(curveX)||0),y:targetOffset.y+bend*(Number(curveY)||0)};
  return {x:targetOffset.x,y:targetOffset.y+Math.sin(Math.PI*t)*(Number(height)||0)};
}


/**
 * Resolve the projectile's world-space muzzle point from the same lane anchor
 * and pixel offsets in both Studio and the Phaser battle runtime.
 */
export function getProjectileLaunchPoint({ laneX = 0, laneY = 0, offsetX = 0, offsetY = 0 } = {}) {
  return {
    x: Number(laneX || 0) + Number(offsetX || 0),
    y: Number(laneY || 0) + Number(offsetY || 0)
  };
}
