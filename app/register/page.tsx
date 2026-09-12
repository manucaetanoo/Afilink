"use client";

import { useRef, useState } from "react";
import { trackAffiliateRegistration } from "@/lib/meta-pixel";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const submitting = useRef(false);
  const completed = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current || completed.current) return;
    setError(null);
    

    // Validaciones front
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!terms) {
      setError("Debés aceptar los términos y condiciones");
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "AFFILIATE" }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "No se pudo crear la cuenta");
        return;
      }

      completed.current = true;
      trackAffiliateRegistration(res.status, data);
      setConfirmationEmail(data?.email ?? email);
    } catch {
      setError("No se pudo crear la cuenta. Intentá nuevamente.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }

  }

  if (confirmationEmail) {
    return (
      <div className="flex min-h-screen flex-col justify-center px-4 py-12">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-[0_20px_60px_rgba(251,146,60,0.12)]">
          <img
            alt="Afilink"
            src="/img/logosbg.png"
            className="mx-auto h-10 w-auto"
          />
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-slate-950">
            Revisa tu email
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Te enviamos un link de confirmacion a{" "}
            <span className="font-semibold text-slate-900">{confirmationEmail}</span>.
            Tenes que verificarlo antes de iniciar sesion.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex w-full justify-center rounded-md bg-[#F78211] px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Ir a iniciar sesion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>

      </div>
    <div className="flex min-h-screen flex-col justify-center px-4 py-10 sm:py-12">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Afilink"
          src="/img/logosbg.png"
          className="mx-auto h-12 w-auto object-contain"
        />
        <h2 className="mt-8 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Registrarse como afiliado
        </h2>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">
          Creá tu cuenta para promocionar productos digitales y ganar comisiones.
        </p>
      </div>
      
      <div className="max-w-md w-full mx-auto  rounded-2xl p-8">


        {/* FORM REAL */}
        <form onSubmit={onSubmit}>
          <div className="space-y-6">
            <div>
              <label className="text-slate-900 text-sm font-medium mb-2 block">
                Nombre
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-[#F78211]"
                placeholder="Ingresar nombre"
              />
            </div>

               <div>
              <label className="text-slate-900 text-sm font-medium mb-2 block">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-[#F78211]"
                placeholder="Ingresar email"
              />
            </div>

            <div>
              <label className="text-slate-900 text-sm font-medium mb-2 block">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-[#F78211]"
                placeholder="Ingresar contraseña"
              />
            </div>

            <div>
              <label className="text-slate-900 text-sm font-medium mb-2 block">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-[#F78211]"
                placeholder="Confirmar contraseña"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-slate-600 ml-3 block text-sm">
                 Acepto{" "}
                 <Link target="_blank" href={"/terms"}>
                <span  className="text-[#F78211] font-medium"> 
                  terminos y condiciones
                </span>
                </Link>
              </label>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-red-600 text-sm mt-4 text-center">{error}</p>
          )}

          <div className="mt-12">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm tracking-wider font-medium rounded-md text-white bg-[#F78211] hover:bg-orange-500 disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </div>

          <p className="text-slate-600 text-sm mt-6 text-center">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-[#F78211] font-medium hover:underline ml-1"
            >
              Iniciar sesion
            </Link>
          </p>
        </form>

      </div>
    </div>
    </div>
  );
}
