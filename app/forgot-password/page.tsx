"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "No se pudo enviar el email");
      return;
    }

    setMessage(data?.message || "Revisa tu email para continuar.");
    if (data?.resetUrl) setDevResetUrl(data.resetUrl);
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="MarketFill"
          src="/img/logosbg.png"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Recuperar contrasena
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
              Correo electronico
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-orange-600 sm:text-sm/6"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          {devResetUrl && (
            <p className="break-words text-xs text-gray-500">
              Link de prueba local:{" "}
              <Link href={devResetUrl} className="text-orange-600 hover:text-orange-500">
                {devResetUrl}
              </Link>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-orange-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-orange-500 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar instrucciones"}
          </button>
        </form>

        <p className="mt-10 text-center text-sm/6 text-gray-500">
          <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-500">
            Volver a iniciar sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
