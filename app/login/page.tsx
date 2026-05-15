"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { PulseLoader } from "react-spinners";


export default function Example() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    
    if (!res?.ok) {
      setError("Email o contraseña incorrectos.");
      return;
    }
    
    setLoading(true);
    
    router.push("/products"); // la ruta real
  }

  return (
    <div>
     {loading ? (<div className="flex justify-center items-center h-screen"><PulseLoader color="#ff9e42"/></div>) : 
    (
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="/img/logosbg.png"
          className="mx-auto h-10 w-auto"
          />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Iniciar Sesión
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {/*onSubmit manda al backend */}
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
              Correo electrónico
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
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#F78211] sm:text-sm/6"
                />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                Contraseña
              </label>
              <div className="text-sm">
                <Link href="/forgot-password" className="font-semibold text-[#F78211] hover:text-[#F78211]">
                  Olvide mi contraseña
                </Link>
              </div>
            </div>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}                           // ✅
                onChange={(e) => setPassword(e.target.value)} // ✅
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#F78211] sm:text-sm/6"
                />
            </div>
          </div>

          {/* ✅ Mostrar error si falla */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-[#F78211] px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
              
              Iniciar Sesión
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm/6 text-gray-500">
         ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-[#F78211] hover:text-orange-500">
            Registrarse
          </Link>
     </p>
      </div>
    </div>
    )}
      
    </div>
    
  );
}
