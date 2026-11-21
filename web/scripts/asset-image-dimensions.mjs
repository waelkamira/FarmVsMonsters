function positiveDimension(value) {
  const dimension = Number(value);
  return Number.isFinite(dimension) && dimension > 0 ? dimension : null;
}

export function imageDimensions(buffer, extension) {
  if (extension === ".png" && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (extension === ".webp" && buffer.length >= 30 && buffer.toString("ascii", 12, 16) === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  if (extension === ".svg") {
    const source = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
    const rootTag = source.match(/<svg\b[^>]*>/i)?.[0] || source;
    const viewBox = rootTag.match(/\bviewBox=["']\s*[-+]?(?:\d*\.)?\d+\s+[-+]?(?:\d*\.)?\d+\s+([-+]?(?:\d*\.)?\d+)\s+([-+]?(?:\d*\.)?\d+)["']/i);
    if (viewBox) {
      const width = positiveDimension(viewBox[1]);
      const height = positiveDimension(viewBox[2]);
      if (width && height) return { width, height };
    }

    const widthAttribute = rootTag.match(/(?:^|\s)width\s*=\s*["']([^"']+)["']/i);
    const heightAttribute = rootTag.match(/(?:^|\s)height\s*=\s*["']([^"']+)["']/i);
    if (widthAttribute && heightAttribute) {
      const width = positiveDimension(Number.parseFloat(widthAttribute[1]));
      const height = positiveDimension(Number.parseFloat(heightAttribute[1]));
      if (width && height) return { width, height };
    }
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return null;
}
