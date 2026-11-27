import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  createStudioSession,
  verifyStudioSession,
  STUDIO_SESSION_TTL_MS
} from "../../../../game/studio/signedSession.mjs";
import { consumeStudioLoginAttempt } from "../../../../game/studio/loginRateLimit.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "fvm_studio_session";
const MIN_SECRET_LENGTH = 32;

function adminToken() {
  const value = process.env.STUDIO_ADMIN_TOKEN || "";
  return value.length >= MIN_SECRET_LENGTH ? value : "";
}

function sessionSecret() {
  const value = process.env.STUDIO_SESSION_SECRET || "";
  return value.length >= MIN_SECRET_LENGTH ? value : "";
}

function validSession(value) {
  return verifyStudioSession(sessionSecret(), value);
}

function sessionUnavailable() {
  return NextResponse.json({
    error: "Studio authentication is not configured. Set separate 32-character STUDIO_ADMIN_TOKEN and STUDIO_SESSION_SECRET values."
  }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request) {
  if (!validSession(request.cookies.get(COOKIE)?.value)) {
    return NextResponse.json({ authenticated: false }, {
      status: 401,
      headers: { "Cache-Control": "no-store" }
    });
  }
  return NextResponse.json({
    authenticated: true,
    storage: process.env.STUDIO_STORAGE_DRIVER || "local"
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const limit = await consumeStudioLoginAttempt(request);
  if (limit.unavailable) {
    return NextResponse.json({
      error: "Studio login protection is unavailable. Configure the shared rate-limit store before enabling production login."
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!limit.allowed) {
    return NextResponse.json({
      error: "Too many Studio login attempts. Try again after 15 minutes."
    }, {
      status: 429,
      headers: {
        "Retry-After": String(limit.retryAfterSeconds),
        "Cache-Control": "no-store"
      }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }

  const expected = adminToken();
  const signingSecret = sessionSecret();
  if (!expected || !signingSecret || expected === signingSecret) return sessionUnavailable();

  const supplied = typeof body?.token === "string" ? body.token : "";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  const valid = expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes);

  if (!valid) {
    return NextResponse.json({ error: "Invalid administrator credentials." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const session = createStudioSession(signingSecret);
  const response = NextResponse.json({
    authenticated: true,
    storage: process.env.STUDIO_STORAGE_DRIVER || "local"
  }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/studio",
    maxAge: STUDIO_SESSION_TTL_MS / 1000
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" }
  });
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/studio",
    maxAge: 0
  });
  return response;
}
