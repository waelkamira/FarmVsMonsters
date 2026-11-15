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
    select: "unlocked_stage,completed_stages,coins,updated_at",
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

export async function PUT(request) {
  const api = config();
  if (!api) return NextResponse.json({ error: "Cloud accounts are not configured." }, { status: 503 });
  const user = await authenticatedUser(request, api);
  if (!user?.id) return NextResponse.json({ error: "Sign in to save cloud progress." }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid progress payload." }, { status: 400 }); }
  const unlockedStage = body.unlockedStage;
  const completedStages = Array.isArray(body.completedStages)
    ? [...new Set(body.completedStages.filter((value) => Number.isInteger(value) && value >= 1 && value <= 10))].sort((a, b) => a - b)
    : [];
  const coins = body.coins;
  if (!Number.isInteger(unlockedStage) || unlockedStage < 1 || unlockedStage > 10 ||
      !Number.isSafeInteger(coins) || coins < 0) {
    return NextResponse.json({ error: "Player progress values are invalid." }, { status: 400 });
  }

  const token = request.cookies.get(ACCESS_COOKIE).value;
  const response = await fetch(api.url + "/rest/v1/player_progress?on_conflict=user_id", {
    method: "POST",
    headers: {
      apikey: api.key,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      user_id: user.id,
      unlocked_stage: unlockedStage,
      completed_stages: completedStages,
      coins,
      updated_at: new Date().toISOString()
    }),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: "Could not save player progress." }, { status: response.status });
  return NextResponse.json({ progress: Array.isArray(payload) ? payload[0] : payload });
}
