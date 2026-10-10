import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { sessionCookie, isSessionId, sessionCookieOptions } from "@/lib/purchase-session";

const protectedPrefixes = [
  "/admin",
  "/dashboard",
  "/onboarding",
  "/perfil",
  "/seller",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const token = await getToken({ req });

  if (isProtectedPath(pathname) && !token) {
    return redirectToLogin(req);
  }

  const existingSession = req.cookies.get(sessionCookie)?.value;
  const sessionId = isSessionId(existingSession) ? existingSession! : crypto.randomUUID();
  // Establish the cookie on the document response before parallel browser events.
  req.cookies.set(sessionCookie, sessionId);
  const headers = new Headers(req.headers);
  headers.set("cookie", req.cookies.toString());
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(sessionCookie, sessionId, sessionCookieOptions());
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
