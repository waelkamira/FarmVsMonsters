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
