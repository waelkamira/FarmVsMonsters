/** Runtime Studio storage boundary: development is always local, production reads GitHub. */
export function getStudioStorageDriver(env = process.env) {
  return env.NODE_ENV === "production" ? "github" : "local";
}

export function isStudioLocalDevelopment(env = process.env) {
  return env.NODE_ENV !== "production";
}

export function canWriteStudioStorage(env = process.env) {
  return isStudioLocalDevelopment(env);
}
