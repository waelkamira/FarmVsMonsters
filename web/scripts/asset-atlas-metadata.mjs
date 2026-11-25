export function buildAtlasMetadata(relativePath, atlas, dimensions) {
  const entries = Object.entries(atlas?.frames || {});
  if (!entries.length) return null;

  const frames = entries.map(([name, value], index) => {
    const frame = value?.frame || value;
    const { x, y, w, h } = frame || {};
    if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0) {
      throw new Error(`Invalid Phaser Atlas frame "${name}" in "${relativePath}"`);
    }
    if (dimensions && (x + w > dimensions.width || y + h > dimensions.height)) {
      throw new Error(`Phaser Atlas frame "${name}" exceeds image bounds in "${relativePath}"`);
    }
    return { name, index, x, y, w, h, rotated: value?.rotated, trimmed: value?.trimmed };
  });

  const widths = [...new Set(frames.map((frame) => frame.w))];
  const heights = [...new Set(frames.map((frame) => frame.h))];
  const xPositions = [...new Set(frames.map((frame) => frame.x))].sort((a, b) => a - b);
  const yPositions = [...new Set(frames.map((frame) => frame.y))].sort((a, b) => a - b);
  const columns = xPositions.length;
  const rows = yPositions.length;
  const uniformGrid = widths.length === 1 && heights.length === 1 &&
    columns * rows === frames.length &&
    frames.every((frame, index) =>
      frame.x === xPositions[index % columns] &&
      frame.y === yPositions[Math.floor(index / columns)] &&
      frame.rotated !== true &&
      frame.trimmed !== true
    ) &&
    xPositions.every((x, index) => x === xPositions[0] + index * widths[0]) &&
    yPositions.every((y, index) => y === yPositions[0] + index * heights[0]);
  const clipsByName = new Map();
  for (const frame of frames) {
    const match = frame.name.match(/^(.+?)_\d+$/);
    if (!match) continue;
    const clip = match[1];
    const range = clipsByName.get(clip) || { startFrame: frame.index, endFrame: frame.index };
    range.endFrame = frame.index;
    clipsByName.set(clip, range);
  }

  return {
    type: uniformGrid ? "spritesheet" : "image",
    spriteSheet: uniformGrid,
    frameCount: frames.length,
    rows: uniformGrid ? rows : 1,
    columns: uniformGrid ? columns : 1,
    ...(uniformGrid ? {
      frameConfig: { frameWidth: widths[0], frameHeight: heights[0], margin: 0, spacing: 0 }
    } : {}),
    sourceFormat: "phaser-atlas",
    atlasMetadataPath: `/assets/${relativePath.replace(/\.[^.]+$/, ".json")}`,
    ...(clipsByName.size ? { atlasClips: Object.fromEntries(clipsByName) } : {})
  };
}
