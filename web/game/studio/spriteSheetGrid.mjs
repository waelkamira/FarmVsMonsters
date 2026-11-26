export function inferSpriteGrid(width, height, frameCount) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0 ||
      !Number.isInteger(frameCount) || frameCount < 1 || frameCount > 24) {
    throw new RangeError("Sprite Sheet dimensions must be positive and frame count must be between 1 and 24.");
  }

  let best = { rows: 1, columns: frameCount, score: Infinity };
  for (let rows = 1; rows <= frameCount; rows += 1) {
    if (frameCount % rows !== 0) continue;
    const columns = frameCount / rows;
    const frameAspect = (width / columns) / (height / rows);
    const score = Math.abs(Math.log(frameAspect));
    if (score < best.score) best = { rows, columns, score };
  }

  return { rows: best.rows, columns: best.columns };
}

export function getSpriteFrameRectangles(width, height, rows, columns) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 ||
      !Number.isInteger(rows) || rows < 1 || !Number.isInteger(columns) || columns < 1 ||
      rows * columns > 100) {
    throw new RangeError("Sprite Sheet dimensions and grid must be positive integers.");
  }

  const frames = [];
  for (let index = 0; index < rows * columns; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = Math.floor((column * width) / columns);
    const y = Math.floor((row * height) / rows);
    const right = Math.floor(((column + 1) * width) / columns);
    const bottom = Math.floor(((row + 1) * height) / rows);
    frames.push({ index, x, y, width: right - x, height: bottom - y });
  }

  return frames;
}

export function resolveSpriteThumbnailGrid(frameCount, rows, columns) {
  const count = Math.max(1, Math.min(100, Number(frameCount) || 1));
  const safeRows = Math.max(1, Number(rows) || 1);
  const safeColumns = Math.max(1, Number(columns) || 1);
  if (Number.isInteger(safeRows) && Number.isInteger(safeColumns) && safeRows * safeColumns === count) {
    return { rows: safeRows, columns: safeColumns };
  }
  const fallbackColumns = Math.ceil(Math.sqrt(count));
  return { rows: Math.ceil(count / fallbackColumns), columns: fallbackColumns };
}


// Prefer the published plant catalog's animation grid when the static asset manifest
// only contains image dimensions and therefore cannot describe individual frames.
export function resolvePlantSpriteMetadata(source = {}, catalogPlant = {}) {
  const frame = source.frameConfig || {};
  const frameRows = frame.frameHeight && source.height
    ? Math.max(1, Math.floor(source.height / frame.frameHeight)) : 0;
  const frameColumns = frame.frameWidth && source.width
    ? Math.max(1, Math.floor(source.width / frame.frameWidth)) : 0;
  const rows = Number(source.rows) || frameRows || Number(catalogPlant.rows) || 1;
  const columns = Number(source.columns) || frameColumns || Number(catalogPlant.columns) || 1;
  const measuredFrameCount = frameRows && frameColumns ? frameRows * frameColumns : 0;
  const frameCount = Number(source.frameCount) || measuredFrameCount ||
    Number(catalogPlant.frameCount) || rows * columns;
  return {
    rows,
    columns,
    frameCount: Math.max(1, frameCount),
    spriteSheet: Boolean(source.spriteSheet || source.type === "spritesheet" ||
      catalogPlant.spriteSheet || frameCount > 1)
  };
}
