import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { prisma } from "@/lib/prisma";
import { SessionDebug } from "@/components/SessionDebug";

function money(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

// ⚠️ En MVP, hardcodeá affiliateId o traelo de tu auth cuando la tengas.
// Por ahora: poné el id del afiliado logueado (ej: desde cookie/session).
const affiliateId = "cmjkqubjx0001y4j4ruwsmqvc";

export default async function Page() {
  // 1) Traer links del afiliado + clicks
  const links: Link[] = await prisma.affiliateLink.findMany({
    where: { affiliateId },
    select: {
      id: true,
      code: true,
      product: { select: { id: true, name: true, price: true } },
      _count: { select: { clicks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2) Traer comisiones del afiliado
  const commissions: Commission[] = await prisma.commission.findMany({
    where: { affiliateId },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      order: { select: { id: true, total: true, product: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  interface Link {
    id: string; 
    code: string; 
    product: { id: string; name: string; price: number; }; 
    _count: { clicks: number; }; }


interface Commission {
  id: string;
  amount: number;
  status: "PENDING" | "AVAILABLE" | "PAID";
  affiliateId: string;  
  createdAt: Date;
  order: { id: string; total: number; product: { name: string; }; };
}



  // 3) Calcular métricas (MVP)
  const totalClicks = links.reduce((acc, l) => acc + l._count.clicks, 0);
  const totalSales = commissions.length; // ventas atribuidas = comisiones creadas (en tu lógica actual)
  const totalCommission = commissions.reduce((acc, c) => acc + c.amount, 0);
  const pendingCommission = commissions
    .filter((c) => c.status === "PENDING")
    .reduce((acc, c) => acc + c.amount, 0);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
    <SessionDebug />
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              Dashboard de Afiliado
            </h1>

            <Link
              href="/products"
              className="text-sm font-medium text-gray-900 underline underline-offset-4"
            >
              Ver productos
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Tus métricas y comisiones en un solo lugar.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Resumen */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm text-gray-600">Clicks</div>
            <div className="mt-1 text-2xl font-semibold">{totalClicks}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm text-gray-600">Ventas atribuidas</div>
            <div className="mt-1 text-2xl font-semibold">{totalSales}</div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm text-gray-600">Comisión total</div>
            <div className="mt-1 text-2xl font-semibold">
              $ {money(totalCommission)}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm text-gray-600">Pendiente</div>
            <div className="mt-1 text-2xl font-semibold">
              $ {money(pendingCommission)}
            </div>
          </div>
        </section>

        {/* Mis links */}
        <section className="rounded-xl border bg-white">
          <div className="border-b px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Mis links</h2>
              <Link
                href="/products"
                className="text-sm font-medium text-gray-900 underline underline-offset-4"
              >
                Generar nuevo link
              </Link>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Copiá y compartí tus links para ganar comisión.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Producto</th>
                  <th className="px-4 py-3 sm:px-6">Link</th>
                  <th className="px-4 py-3 sm:px-6">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {links.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 sm:px-6 text-gray-600" colSpan={3}>
                      Todavía no generaste links. Entrá a Productos y creá uno.
                    </td>
                  </tr>
                ) : (
                  links.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 sm:px-6">
                        <div className="font-medium text-gray-900">
                          {l.product?.name ?? "Producto"}
                        </div>
                        <div className="text-gray-600">
                          ${money(l.product?.price ?? 0)}
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="font-mono text-xs text-gray-700">
                          {baseUrl}/l/{l.code}
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        {l._count.clicks}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Comisiones */}
        <section className="rounded-xl border bg-white">
          <div className="border-b px-4 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Últimas comisiones
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Se generan cuando la orden pasa por tu endpoint /pay.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Fecha</th>
                  <th className="px-4 py-3 sm:px-6">Producto</th>
                  <th className="px-4 py-3 sm:px-6">Venta</th>
                  <th className="px-4 py-3 sm:px-6">Comisión</th>
                  <th className="px-4 py-3 sm:px-6">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 sm:px-6 text-gray-600" colSpan={5}>
                      Todavía no tenés comisiones. Probá comprar desde un link
                      afiliado y después llamar /orders/[id]/pay.
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 sm:px-6">
                        {new Date(c.createdAt).toLocaleDateString("es-UY")}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        {c.order?.product?.name ?? "-"}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        ${money(c.order?.total ?? 0)}
                      </td>
                      <td className="px-4 py-4 sm:px-6 font-medium">
                        ${money(c.amount)}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
