import Link from "next/link";
import { PackageSearch } from "lucide-react";
import Navbar from "@/components/Navbar";
import OrderLookupForm from "./OrderLookupForm";

export default function PedidoPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
  

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <PackageSearch className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Consulta el estado de tu pedido
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Ingresa el numero de pedido que recibiste al finalizar la compra para
            ver si esta pendiente, en preparacion o enviado.
          </p>

          <OrderLookupForm />

          <p className="mt-6 text-sm text-slate-500">
            Tambien puedes abrir directamente el link{" "}
            <span className="font-medium text-slate-700">/pedido/tu-order-id</span>.
          </p>
        </div>

        <Link
          href="/products"
          className="mt-10 inline-flex w-fit text-sm font-semibold text-orange-700 hover:text-orange-800"
        >
          Volver a la tienda
        </Link>
      </main>
    </div>
  );
}
