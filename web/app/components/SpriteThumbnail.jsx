import { resolveSpriteThumbnailGrid } from "../../game/studio/spriteSheetGrid.mjs";

export default function SpriteThumbnail({
  src,
  rows = 1,
  columns = 1,
  frameCount,
  alt = "",
  className = "",
  decorative = false,
  loading = "lazy",
  onError
}) {
  if (!src) return null;
  const count = Math.max(1, Number(frameCount) || (Number(rows) || 1) * (Number(columns) || 1));
  const isSpriteSheet = count > 1;
  if (!isSpriteSheet) {
    return <img className={className} src={src} alt={decorative ? "" : alt} aria-hidden={decorative ? true : undefined} loading={loading} onError={onError} />;
  }
  const grid = resolveSpriteThumbnailGrid(count, rows, columns);
  return <span
    className={className + " is-sprite-sheet"}
    role={decorative ? undefined : "img"}
    aria-label={decorative ? undefined : alt}
    aria-hidden={decorative ? true : undefined}
    style={{
      backgroundImage: `url("${src}")`,
      backgroundSize: `${grid.columns * 100}% ${grid.rows * 100}%`,
      backgroundPosition: "left top",
      backgroundRepeat: "no-repeat"
    }}
  />;
}
