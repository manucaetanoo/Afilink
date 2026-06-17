import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/admin",
  "/dashboard",
  "/onboarding",
  "/perfil",
  "/seller",
];

const onboardingPath = "/onboarding/seller";

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

function redirectToSellerOnboarding(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = onboardingPath;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const token = await getToken({ req });
  const isOnboarding = pathname === onboardingPath;

  if (isProtectedPath(pathname) && !token) {
    return redirectToLogin(req);
  }

  if (token?.role === "SELLER" && !token.storeSlug && !isOnboarding) {
    return redirectToSellerOnboarding(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
