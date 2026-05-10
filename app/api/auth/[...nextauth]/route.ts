import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Usamos JWT que es como una cookie segura, pero sin necesidad de guardar nada en el servidor
//El cliente guarda el JWT y lo manda en cada petición, y el servidor lo verifica y lee los datos que le pusimos (id, role, etc)


export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase()?.trim();
        const password = credentials?.password;

        // 1) Validación básica
        if (!email || !password) return null;

        // 2) Buscar usuario en DB
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) return null;
        if (!user.isActive) return null;
        if (!user.passwordHash) return null;

        // 3) Comparar password
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // 4) Usuario válido → lo devolvemos
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "",
          role: user.role,
          storeSlug: user.storeSlug,
          image: user.image ?? null,
        } satisfies AppAuthUser;
      },
    }),
  ],
  
  // Se ejecuta al crear/leer el JWT
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const appUser = user as AppAuthUser;
        token.id = appUser.id;
        token.role = appUser.role;
        token.email = appUser.email;
        token.name = appUser.name;
        token.picture = appUser.image;
        token.storeSlug = appUser.storeSlug;
        token.authCheckedAt = Date.now();
      }

      const lastAuthCheck = Number(token.authCheckedAt ?? 0);
      const shouldRefreshAuth =
        Boolean(token.id) && Date.now() - lastAuthCheck > 5 * 60 * 1000;

      if (shouldRefreshAuth) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            email: true,
            name: true,
            image: true,
            storeSlug: true,
            isActive: true,
          },
        });

        token.authCheckedAt = Date.now();

        if (!dbUser?.isActive) return token;

        token.role = dbUser.role;
        token.email = dbUser.email;
        token.name = dbUser.name ?? "";
        token.picture = dbUser.image;
        token.storeSlug = dbUser.storeSlug;
      }

        // updateSession() desde el client
    if (trigger === "update" && session?.user) {
    // solo actualizamos lo que venga
    if (session.user.name !== undefined) token.name = session.user.name;
    if (session.user.image !== undefined) token.picture = session.user.image;
    if (session.user.email !== undefined) token.email = session.user.email;
  }



      return token;
    },

    // Se ejecuta cuando pedís la sesión (useSession / getServerSession)
    async session({ session, token }) {
      if (session.user) {
    session.user.id = token.id as string;
    session.user.role = token.role as string;
    session.user.email = token.email as string;
    session.user.name = token.name as string;
    session.user.storeSlug = token.storeSlug as string;
    session.user.image = token.picture as string;
      }
      return session;
    },
  },


  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
type AppAuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  storeSlug: string | null;
  image: string | null;
};
