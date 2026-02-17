import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";


export const authOptions: NextAuthOptions = {
  // 👇 Usamos JWT (OBLIGATORIO con Credentials)
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
          image: user.image ?? null,
        } as any;
      },
    }),
  ],

  callbacks: {
    // 👉 Se ejecuta al crear/leer el JWT
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.email = (user as any).email;
        token.name = (user as any).name;
        token.picture = (user as any).image; // si lo devolvés en authorize
      }

        // updateSession() desde el client
    if (trigger === "update" && session?.user) {
    // solo actualizamos lo que venga
    if (session.user.name !== undefined) token.name = session.user.name;
    if ((session.user as any).image !== undefined) token.picture = (session.user as any).image;
    if (session.user.email !== undefined) token.email = session.user.email;
    if ((session.user as any).role !== undefined) token.role = (session.user as any).role;
  }



      return token;
    },

    // 👉 Se ejecuta cuando pedís la sesión (useSession / getServerSession)
    async session({ session, token }) {
      if (session.user) {
    (session.user as any).id = token.id as string;
    (session.user as any).role = token.role as string;
    session.user.email = token.email as string;
    session.user.name = token.name as string;
    (session.user as any).image = token.picture as string;
      }
      return session;
    },
  },

  // 👉 Página de login propia
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
