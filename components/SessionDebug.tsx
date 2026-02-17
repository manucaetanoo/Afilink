'use client';

import { useSession } from "next-auth/react";

export function SessionDebug() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Cargando sesión...</p>;

  if (status === "unauthenticated") return <p>No estás logueado</p>;

  return (
    <div style={{ padding: 12, border: "1px solid #ccc", marginBottom: 12 }}>
      <p>✅ Bienvenido {session?.user?.name}</p>
      <p>Email: {session?.user?.email}</p>
    </div>
  );
}
