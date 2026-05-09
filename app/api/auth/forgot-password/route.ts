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
  subject: "Recuperar contraseña",
  text: `Para crear una nueva contraseña, abrí este link: ${resetUrl}`,

  html: `
    <div style="
      background:#f5f7fb;
      padding:40px 20px;
      font-family:Arial,sans-serif;
    ">
      <div style="
        max-width:600px;
        margin:auto;
        background:white;
        border-radius:16px;
        padding:40px;
        box-shadow:0 4px 20px rgba(0,0,0,0.08);
      ">
        
        <h1 style="
          margin:0 0 20px;
          color:#111827;
          font-size:28px;
        ">
          Recuperar contraseña
        </h1>

        <p style="
          color:#4b5563;
          font-size:16px;
          line-height:1.6;
        ">
          Hola${user.name ? ` ${user.name}` : ""}, recibimos una solicitud
          para restablecer tu contraseña.
        </p>

        <p style="
          color:#4b5563;
          font-size:16px;
          line-height:1.6;
        ">
          Hacé click en el botón para crear una nueva contraseña:
        </p>

        <div style="margin:32px 0;">
          <a
            href="${resetUrl}"
            style="
              background:#FFA500 ;
              color:white;
              text-decoration:none;
              padding:14px 24px;
              border-radius:10px;
              display:inline-block;
              font-weight:bold;
            "
          >
            Crear nueva contraseña
          </a>
        </div>

        <p style="
          color:#6b7280;
          font-size:14px;
          line-height:1.6;
        ">
          Este link vence en ${RESET_TOKEN_MINUTES} minutos.
        </p>

        <p style="
          color:#9ca3af;
          font-size:13px;
          margin-top:30px;
        ">
          Si no fuiste vos, podés ignorar este email.
        </p>
      </div>
    </div>
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
