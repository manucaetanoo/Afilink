import type { NextRequest } from "next/server";
import authMiddleware from "next-auth/middleware";

// Next.js 16: proxy.ts debe exportar una función (default o named proxy)
export { default } from "next-auth/middleware";

// Esto limita dónde se aplica el “portero”
export const config = {
  matcher: ["/afiliate/:path*"],
};
