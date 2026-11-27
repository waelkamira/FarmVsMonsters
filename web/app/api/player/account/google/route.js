import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request) {
  return NextResponse.redirect(new URL("/account?google_error=registration_paused", request.url));
}
