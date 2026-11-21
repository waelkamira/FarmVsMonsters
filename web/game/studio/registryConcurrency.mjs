export function assertExpectedContentSha(expectedSha, actualSha) {
  if (expectedSha === undefined) return true;
  if ((expectedSha ?? null) === (actualSha ?? null)) return true;
  const error = new Error("Studio data changed while saving. Reload the library and retry.");
  error.code = "STUDIO_WRITE_CONFLICT";
  throw error;
}
