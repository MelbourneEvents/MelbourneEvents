import { NextResponse, NextRequest } from "next/server";

// Minimal gate for /admin/* — a single shared username/password via HTTP
// Basic Auth, not a real multi-user auth system (that's flagged as
// future work in the README). Fails closed: if the credentials aren't
// configured, admin routes are refused rather than left open.
export function middleware(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse(
      "Admin review is disabled — set ADMIN_USERNAME and ADMIN_PASSWORD to enable it.",
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);
    if (user === username && pass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Melbourne Events Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
