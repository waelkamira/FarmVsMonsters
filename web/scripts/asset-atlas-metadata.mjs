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
    return { name, index, x, y, w, h };
  });

  const widths = [...new Set(frames.map((frame) => frame.w))];
  const heights = [...new Set(frames.map((frame) => frame.h))];
  const xPositions = [...new Set(frames.map((frame) => frame.x))];
  const yPositions = [...new Set(frames.map((frame) => frame.y))];
  const uniformGrid = widths.length === 1 && heights.length === 1 &&
    xPositions.length * yPositions.length === frames.length;
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
    type: "spritesheet",
    spriteSheet: true,
    frameCount: frames.length,
    rows: yPositions.length,
    columns: xPositions.length,
    ...(uniformGrid ? {
      frameConfig: {
        frameWidth: widths[0],
        frameHeight: heights[0],
        margin: 0,
        spacing: 0
      }
    } : {}),
    sourceFormat: "phaser-atlas",
    atlasMetadataPath: `/assets/${relativePath.replace(/\.[^.]+$/, ".json")}`,
    ...(clipsByName.size ? { atlasClips: Object.fromEntries(clipsByName) } : {})
  };
}
