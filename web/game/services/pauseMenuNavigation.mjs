const MOVEMENT_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);

export function getPauseMenuControlIndex(controls, currentIndex, key) {
  if (!Array.isArray(controls) || controls.length === 0) return -1;

  const current = Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < controls.length
    ? currentIndex
    : 0;

  if (key === "Home") return 0;
  if (key === "End") return controls.length - 1;
  if (!MOVEMENT_KEYS.has(key)) return current;

  const active = controls[current];
  if (!active || !Number.isFinite(active.row) || !Number.isFinite(active.column)) return current;

  if (key === "ArrowLeft" || key === "ArrowRight") {
    const rowControls = controls
      .map((control, index) => ({ control, index }))
      .filter(({ control }) => control.row === active.row)
      .sort((a, b) => a.control.column - b.control.column);
    if (rowControls.length < 2) return current;

    const position = rowControls.findIndex(({ index }) => index === current);
    if (position < 0) return current;
    const direction = key === "ArrowRight" ? 1 : -1;
    return rowControls[(position + direction + rowControls.length) % rowControls.length].index;
  }

  const rows = [...new Set(controls.map((control) => control.row))].sort((a, b) => a - b);
  if (rows.length < 2) return current;
  const rowPosition = rows.indexOf(active.row);
  if (rowPosition < 0) return current;

  const direction = key === "ArrowDown" ? 1 : -1;
  const targetRow = rows[(rowPosition + direction + rows.length) % rows.length];
  const candidates = controls
    .map((control, index) => ({ control, index }))
    .filter(({ control }) => control.row === targetRow)
    .sort((a, b) => {
      const distance = Math.abs(a.control.column - active.column) - Math.abs(b.control.column - active.column);
      return distance || a.control.column - b.control.column;
    });

  return candidates[0]?.index ?? current;
}

export function isPauseMenuActivationKey(key, code) {
  return key === "Enter" || key === " " || key === "Spacebar" || code === "Space";
}
