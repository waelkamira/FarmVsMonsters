import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ACCESS_COOKIE = "farm_player_access";
const REFRESH_COOKIE = "farm_player_refresh";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

function unavailable() {
  return NextResponse.json({
    error: "Cloud accounts are not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to the web environment."
  }, { status: 503 });
}

function setSessionCookies(response, session) {
  const secure = process.env.NODE_ENV === "production";
  const accessMaxAge = Math.max(60, Number(session.expires_in) || 3600);
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: accessMaxAge
  });
  if (session.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30
    });
  }
}

function clearSessionCookies(response) {
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

async function getUser(api, accessToken) {
  const response = await fetch(api.url + "/auth/v1/user", {
    headers: { apikey: api.key, Authorization: "Bearer " + accessToken },
    cache: "no-store"
  });
  if (!response.ok) return null;
  return response.json();
}

export async function GET(request) {
  const api = config();
  if (!api) return NextResponse.json({ user: null, cloudAvailable: false });

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (accessToken) {
    const user = await getUser(api, accessToken);
    if (user) return NextResponse.json({ user });
  }

  if (!refreshToken) return NextResponse.json({ user: null });
  const refreshed = await fetch(api.url + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { apikey: api.key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store"
  });
  if (!refreshed.ok) {
    const response = NextResponse.json({ user: null });
    clearSessionCookies(response);
    return response;
  }
  const session = await refreshed.json();
  const response = NextResponse.json({ user: session.user });
  setSessionCookies(response, session);
  return response;
}

export async function POST(request) {
  const api = config();
  if (!api) return unavailable();

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const action = body.action;
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return NextResponse.json({ error: "Enter a valid email and a password with at least 8 characters." }, { status: 400 });
  }
  if (action !== "signin" && action !== "signup") {
    return NextResponse.json({ error: "Unsupported account action." }, { status: 400 });
  }
  if (action === "signup") {
    return NextResponse.json({
      error: "New player registration is temporarily paused until secure cloud progress saving is available.",
      code: "PLAYER_REGISTRATION_PAUSED"
    }, { status: 410 });
  }

  const endpoint = api.url + "/auth/v1/token?grant_type=password";
  const authResponse = await fetch(endpoint, {
    method: "POST",
    headers: { apikey: api.key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });
  const payload = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok) {
    return NextResponse.json({
      error: payload.msg || payload.message || payload.error_description || payload.error || "Account request failed."
    }, { status: authResponse.status });
  }

  if (!payload.access_token) {
    return NextResponse.json({
      user: payload.user || null,
      needsEmailConfirmation: true
    });
  }

  const response = NextResponse.json({ user: payload.user });
  setSessionCookies(response, payload);
  return response;
}

export async function DELETE(request) {
  const api = config();
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (api && accessToken) {
    await fetch(api.url + "/auth/v1/logout", {
      method: "POST",
      headers: { apikey: api.key, Authorization: "Bearer " + accessToken },
      cache: "no-store"
    }).catch(() => null);
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
