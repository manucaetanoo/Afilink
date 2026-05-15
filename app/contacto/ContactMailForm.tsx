"use client";

import { FormEvent, useState } from "react";
import { FiMail, FiSend } from "react-icons/fi";

type ContactMailFormProps = {
  supportEmail: string;
};

export default function ContactMailForm({ supportEmail }: ContactMailFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState("Consulta general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setSending(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, kind, message }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo enviar el mensaje");
      }

      setName("");
      setEmail("");
      setSubject("");
      setKind("Consulta general");
      setMessage("");
      setStatus("Mensaje enviado. Te vamos a responder por mail.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
          <FiMail className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Enviar ticket</h2>
          <p className="text-sm text-slate-500">{supportEmail}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {status && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {status}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Nombre
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="kind" className="text-sm font-medium text-slate-700">
              Tipo de consulta
            </label>
            <select
              id="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            >
              <option>Consulta general</option>
              <option>Cuenta y acceso</option>
              <option>Productos y campañas</option>
              <option>Pagos y comisiones</option>
              <option>Ordenes y entregas</option>
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="text-sm font-medium text-slate-700">
              Asunto
            </label>
            <input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              placeholder="Resumen breve"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="text-sm font-medium text-slate-700">
            Mensaje
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            rows={7}
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            placeholder="Contanos que duda tenes o que necesitas resolver."
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <FiSend className="h-4 w-4" />
          {sending ? "Enviando..." : "Enviar por mail"}
        </button>
      </form>
    </div>
  );
}
