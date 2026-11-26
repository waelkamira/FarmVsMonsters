export const ACCOUNT_TAB_MODES = Object.freeze(["signin", "signup"]);

export function getAccountTabForKey(currentMode, key, locale = "en") {
  const currentIndex = ACCOUNT_TAB_MODES.indexOf(currentMode);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;
  if (key === "Home") return ACCOUNT_TAB_MODES[0];
  if (key === "End") return ACCOUNT_TAB_MODES[ACCOUNT_TAB_MODES.length - 1];

  const nextKey = locale === "ar" ? "ArrowLeft" : "ArrowRight";
  const previousKey = locale === "ar" ? "ArrowRight" : "ArrowLeft";
  if (key === nextKey) return ACCOUNT_TAB_MODES[(safeIndex + 1) % ACCOUNT_TAB_MODES.length];
  if (key === previousKey) return ACCOUNT_TAB_MODES[(safeIndex + ACCOUNT_TAB_MODES.length - 1) % ACCOUNT_TAB_MODES.length];
  return null;
}
