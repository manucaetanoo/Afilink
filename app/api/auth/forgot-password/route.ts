import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";

const RESET_TOKEN_MINUTES = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAppUrl(req: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL;

  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ error: "Email obligatorio" }, { status: 400 });
  }

  const genericMessage =
    "Si el email existe, te enviamos instrucciones para recuperar tu contrasena.";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isActive: true },
  });

  if (!user?.isActive) {
    return NextResponse.json({ message: genericMessage });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  const resetUrl = `${getAppUrl(req)}/reset-password?token=${token}`;
  const emailResult = await sendTransactionalEmail({
    to: user.email,
    subject: "Recuperar contrasena",
    text: `Para crear una nueva contrasena, abri este link: ${resetUrl}`,
    html: `
      <p>Hola${user.name ? ` ${user.name}` : ""},</p>
      <p>Recibimos una solicitud para recuperar tu contrasena.</p>
      <p><a href="${resetUrl}">Crear nueva contrasena</a></p>
      <p>Este link vence en ${RESET_TOKEN_MINUTES} minutos. Si no fuiste vos, ignora este email.</p>
    `,
  });

  return NextResponse.json({
    message: genericMessage,
    resetUrl:
      process.env.NODE_ENV !== "production" && "skipped" in emailResult
        ? resetUrl
        : undefined,
  });
}
