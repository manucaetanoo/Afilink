// lib/auth.ts
import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 


export type AuthUser = {
  id: string;
  role: Role;
  email?: string | null;
};

export async function requireUser(): Promise<AuthUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    id: session.user.id,
    role: session.user.role as Role,
    email: session.user.email ?? null,
  };
}

export function requireRole(user: AuthUser, roles: Role[]) {
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
}
