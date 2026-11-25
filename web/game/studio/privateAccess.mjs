export function isStudioPrivateAccessAllowed(request, env = process.env) {
  if (env.NODE_ENV !== "production") return true;

  const allowedIps = String(env.STUDIO_ALLOWED_IPS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowedIps.length === 0) return false;

  // Trust only the reverse-proxy supplied address, never a client-provided
  // X-Forwarded-For chain, for production allowlist decisions.
  const clientIp = request.headers.get("x-real-ip")?.trim();
  return Boolean(clientIp && allowedIps.includes(clientIp));
}
