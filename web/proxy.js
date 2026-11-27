import { NextResponse } from "next/server";
import { isStudioPrivateAccessAllowed } from "./game/studio/privateAccess.mjs";

export function proxy(request) {
  // The public game client reads this published encounter configuration.
  // All Studio editing APIs and the Studio UI remain private in production.
  if (request.method === "GET" && request.nextUrl.pathname === "/api/studio/stage-encounters") {
    return NextResponse.next();
  }

  if (!isStudioPrivateAccessAllowed(request)) {
    return new NextResponse("Not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store" }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/api/studio/:path*"]
};
