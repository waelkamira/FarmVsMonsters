import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const STATE_COOKIE = "farm_google_oauth_state";
const VERIFIER_COOKIE = "farm_google_pkce_verifier";

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function GET(request) {
  const config = getConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/account?google_error=cloud_unconfigured", request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const callback = new URL("/api/player/account/google/callback", request.url);\n  callback.searchParams.set("state", state);\n  const callbackUrl = callback.toString();
  const authorizeUrl = new URL(config.url + "/auth/v1/authorize");
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", callbackUrl);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "s256");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600
  });
  response.cookies.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 600
  });
  return response;
}
