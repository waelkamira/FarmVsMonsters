export function svgImageDimensions(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  const source = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
  const viewBox = source.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)["']/i);
  if (viewBox) {
    const width = Number(viewBox[1]);
    const height = Number(viewBox[2]);
    return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
      ? { width, height }
      : null;
  }

  const width = source.match(/\bwidth=["']([\d.]+)/i);
  const height = source.match(/\bheight=["']([\d.]+)/i);
  if (!width || !height) return null;

  const dimensions = { width: Number(width[1]), height: Number(height[1]) };
  return Number.isFinite(dimensions.width) && dimensions.width > 0 &&
    Number.isFinite(dimensions.height) && dimensions.height > 0
    ? dimensions
    : null;
}
