export function subscribeToBrowserStorage(callback) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.storageArea === window.localStorage || event.key === null) callback();
  };
  const onLocalStorageChange = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener("farm-storage-change", onLocalStorageChange);
  window.addEventListener("farm-language-change", onLocalStorageChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("farm-storage-change", onLocalStorageChange);
    window.removeEventListener("farm-language-change", onLocalStorageChange);
  };
}

export function readStorageSnapshot(key, fallback = "") {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
