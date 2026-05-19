import { createHash, randomBytes } from "crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";

const EMAIL_VERIFICATION_HOURS = 24;

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getAppUrl(req: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL;

  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export function getPostVerificationPath(role: Role) {
  return role === "SELLER" ? "/onboarding/seller" : "/products";
}

export async function sendEmailVerification({
  req,
  user,
}: {
  req: Request;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    }),
  ]);

  const verifyUrl = `${getAppUrl(req)}/verify-email?token=${token}`;
  const emailResult = await sendTransactionalEmail({
    to: user.email,
    subject: "Confirmar email en Afilink",
    text: `Para confirmar tu email, abri este link: ${verifyUrl}`,
    html: `
      <div style="background:#f5f7fb;padding:40px 20px;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <h1 style="margin:0 0 20px;color:#111827;font-size:28px;">
            Confirmar email
          </h1>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;">
            Hola${user.name ? ` ${user.name}` : ""}, necesitamos confirmar que este email existe antes de activar tu cuenta.
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;">
            Hace click en el boton para verificar tu email y continuar.
          </p>
          <div style="margin:32px 0;">
            <a href="${verifyUrl}" style="background:#FFA500;color:white;text-decoration:none;padding:14px 24px;border-radius:10px;display:inline-block;font-weight:bold;">
              Verificar email
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;">
            Este link vence en ${EMAIL_VERIFICATION_HOURS} horas.
          </p>
          <p style="color:#9ca3af;font-size:13px;margin-top:30px;">
            Si no creaste esta cuenta, podes ignorar este email.
          </p>
        </div>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production" && "skipped" in emailResult) {
    console.log("[DEV] Email verification URL:", verifyUrl);
  }

  return emailResult;
}
