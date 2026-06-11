export { default as proxy } from "next-auth/middleware";

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/perfil/:path*",
    "/seller/:path*",
  ],
};
