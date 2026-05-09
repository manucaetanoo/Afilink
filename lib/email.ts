type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "Afilink";

  if (!apiKey || !fromEmail) {
    console.warn(
      "Email omitido: falta BREVO_API_KEY o BREVO_FROM_EMAIL en variables de entorno"
    );
    return { skipped: true };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: fromName,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo rechazo el email: ${errorText}`);
  }

  return response.json();
}
