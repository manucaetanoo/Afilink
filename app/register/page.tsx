"use client";

import Navbar from "@/components/Navbar"
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toggle from "@/components/Toggle"

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [selected, setSelected] = useState("SELLER");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validaciones front
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!terms) {
      setError("Debés aceptar los términos y condiciones");
      return;
    }

    setLoading(true);

    // Enviamos los datos al backend
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role:selected }),
    });

    setLoading(false);

    const data = await res.json().catch(() => null);

    // ok es una propiedad de la respuesta (res) que es un booleano y indica si el status esta entre 200 y 299
    if (!res.ok) {
      setError(data?.error || "No se pudo crear la cuenta");
      return;
    }

    // Registro OK → login
    router.push("/login");
  }

  return (
    <div>
      <div>

      </div>
    <div className="flex flex-col justify-center sm:h-screen p-4">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="/img/logosbg.png"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Registrarse
        </h2>
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
                type="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-orange-500"
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
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-orange-500"
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
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-orange-500"
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
                className="text-slate-900 bg-white border border-gray-300 w-full text-sm px-4 py-3 rounded-md outline-orange-500"
                placeholder="Confirmar contraseña"
              />
            </div>
            <div>
            <p className="text-slate-900 text-sm font-medium mb-2 block">Seleccionar Rol</p>
            <Toggle selected={selected} setSelected={setSelected} />
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
                 <Link href={"/404"}>
                <span className="text-orange-600 font-medium">
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
              className="w-full py-3 px-4 text-sm tracking-wider font-medium rounded-md text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </div>

          <p className="text-slate-600 text-sm mt-6 text-center">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-orange-600 font-medium hover:underline ml-1"
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
