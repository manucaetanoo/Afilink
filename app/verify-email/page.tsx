import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getPostVerificationPath,
  hashEmailVerificationToken,
} from "@/lib/email-verification";

type VerifyEmailPageProps = {
  searchParams?: Promise<{ token?: string }> | { token?: string };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getToken(searchParams: VerifyEmailPageProps["searchParams"]) {
  const params = await searchParams;
  return typeof params?.token === "string" ? params.token.trim() : "";
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const token = await getToken(searchParams);
  let title = "Link invalido";
  let message = "El link de verificacion no es valido o ya vencio.";
  let callbackUrl = "/products";
  let verified = false;

  if (token) {
    const tokenHash = hashEmailVerificationToken(token);
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      verificationToken &&
      !verificationToken.usedAt &&
      verificationToken.expiresAt >= new Date() &&
      verificationToken.user.isActive
    ) {
      const now = new Date();

      await prisma.$transaction([
        prisma.user.update({
          where: { id: verificationToken.userId },
          data: { emailVerifiedAt: now },
        }),
        prisma.emailVerificationToken.update({
          where: { id: verificationToken.id },
          data: { usedAt: now },
        }),
        prisma.emailVerificationToken.updateMany({
          where: {
            userId: verificationToken.userId,
            usedAt: null,
            id: { not: verificationToken.id },
          },
          data: { usedAt: now },
        }),
      ]);

      verified = true;
      callbackUrl = getPostVerificationPath(verificationToken.user.role);
      title = "Email verificado";
      message =
        verificationToken.user.role === "SELLER"
          ? "Tu email quedo verificado. Inicia sesion para continuar con el onboarding de seller."
          : "Tu email quedo verificado. Inicia sesion para seguir usando Afilink.";
    }
  }

  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff7f0] px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-[0_20px_60px_rgba(251,146,60,0.12)]">
        <img
          alt="Afilink"
          src="/img/logosbg.png"
          className="mx-auto h-10 w-auto"
        />
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>

        <div className="mt-8">
          {verified ? (
            <Link
              href={loginHref}
              className="inline-flex w-full justify-center rounded-md bg-[#F78211] px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Iniciar sesion
            </Link>
          ) : (
            <Link
              href="/register"
              className="inline-flex w-full justify-center rounded-md bg-[#F78211] px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Volver al registro
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
