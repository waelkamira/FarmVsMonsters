import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ACCESS_COOKIE = "farm_player_access";
const REFRESH_COOKIE = "farm_player_refresh";
const STATE_COOKIE = "farm_google_oauth_state";
const VERIFIER_COOKIE = "farm_google_pkce_verifier";

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

function matchesState(received, expected) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clearOAuthCookies(response) {
  response.cookies.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(VERIFIER_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

function fail(request, reason) {
  const response = NextResponse.redirect(new URL("/account?google_error=" + encodeURIComponent(reason), request.url));
  clearOAuthCookies(response);
  return response;
}

export async function GET(request) {
  const config = getConfig();
  if (!config) return fail(request, "cloud_unconfigured");

  const params = new URL(request.url).searchParams;
  if (params.get("error")) return fail(request, "google_denied");
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  if (!code || !matchesState(state, expectedState) || !verifier) {
    return fail(request, "oauth_invalid_state");
  }

  const tokenResponse = await fetch(config.url + "/auth/v1/token?grant_type=pkce", {
    method: "POST",
    headers: { apikey: config.key, "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    cache: "no-store"
  });
  const session = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !session.access_token || !session.user) {
    return fail(request, "oauth_exchange_failed");
  }

  const response = NextResponse.redirect(new URL("/account?google=connected", request.url));
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true, secure, sameSite: "lax", path: "/",
    maxAge: Math.max(60, Number(session.expires_in) || 3600)
  });
  if (session.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30
    });
  }
  clearOAuthCookies(response);
  return response;
}
