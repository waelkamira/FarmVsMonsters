import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ACCESS_COOKIE = "farm_player_access";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

async function authenticatedUser(request, api) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const response = await fetch(api.url + "/auth/v1/user", {
    headers: { apikey: api.key, Authorization: "Bearer " + token },
    cache: "no-store"
  });
  return response.ok ? response.json() : null;
}

export async function GET(request) {
  const api = config();
  if (!api) return NextResponse.json({ error: "Cloud accounts are not configured." }, { status: 503 });
  const user = await authenticatedUser(request, api);
  if (!user?.id) return NextResponse.json({ error: "Sign in to load cloud progress." }, { status: 401 });

  const query = new URLSearchParams({
    select: "unlocked_stage,completed_stages,coins,coins_verified,updated_at",
    user_id: "eq." + user.id,
    limit: "1"
  });
  const response = await fetch(api.url + "/rest/v1/player_progress?" + query.toString(), {
    headers: { apikey: api.key, Authorization: "Bearer " + request.cookies.get(ACCESS_COOKIE).value },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) return NextResponse.json({ error: "Could not load player progress." }, { status: response.status });
  return NextResponse.json({ progress: payload[0] || null });
}

export async function PUT() {
  return NextResponse.json({
    error: "Cloud progress writes are temporarily paused while server-verified progression is implemented. Local play and local saves are unaffected."
  }, { status: 410 });
}
