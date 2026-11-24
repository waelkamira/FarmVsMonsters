export function getBrowserStorage(host) {
  try {
    const storage = host?.localStorage;
    return storage && (
      typeof storage.getItem === "function" ||
      typeof storage.setItem === "function"
    ) ? storage : null;
  } catch {
    return null;
  }
}

export function readStorageValue(host, key, fallback = null) {
  const storage = getBrowserStorage(host);
  if (!storage || typeof storage.getItem !== "function") return fallback;
  try {
    const value = storage.getItem(key);
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

export function writeStorageValue(host, key, value) {
  const storage = getBrowserStorage(host);
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function readBrowserLocale(host, fallback = "ar") {
  const locale = readStorageValue(host, "farmVsMonsters.language", fallback);
  return locale === "ar" || locale === "en" ? locale : fallback;
}
