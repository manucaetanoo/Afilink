import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email";

const supportEmail = process.env.SUPPORT_EMAIL ?? "infoafilink@gmail.com";

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, error: "Body invalido" }, { status: 400 });
  }

  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 191).toLowerCase();
  const kind = cleanText(body.kind, 80) || "Consulta general";
  const subject = cleanText(body.subject, 140) || kind;
  const message = cleanText(body.message, 3000);

  if (!message) {
    return NextResponse.json(
      { ok: false, error: "El mensaje es obligatorio" },
      { status: 400 }
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Email invalido" },
      { status: 400 }
    );
  }

  const safeName = escapeHtml(name || "Sin nombre");
  const safeEmail = escapeHtml(email || "Sin email");
  const safeKind = escapeHtml(kind);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  await sendTransactionalEmail({
    to: supportEmail,
    subject: `[Contacto Afilink] ${subject}`,
    text: [
      `Nombre: ${name || "-"}`,
      `Email: ${email || "-"}`,
      `Tipo: ${kind}`,
      `Asunto: ${subject}`,
      "",
      message,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h2>Nuevo mensaje desde contacto</h2>
        <p><strong>Nombre:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Tipo:</strong> ${safeKind}</p>
        <p><strong>Asunto:</strong> ${safeSubject}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
        <p>${safeMessage}</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
