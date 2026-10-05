import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Optimistic check: send visitors without a valid session to the login page. Pages re-check on the server. */
export async function proxy(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (req.nextUrl.pathname.startsWith("/admin") && session.role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/health|api/images|_next|images|logo.svg|icon.svg|favicon.ico).*)"],
};
