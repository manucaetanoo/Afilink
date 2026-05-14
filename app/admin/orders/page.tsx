import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import AdminOrdersClient, {
  type AdminOrder,
} from "@/components/admin/AdminOrdersClient";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (String(session.user.role).toUpperCase() !== "ADMIN") {
    redirect("/dashboard/seller");
  }

  const allOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      total: true,
      status: true,
      paymentStatus: true,
      paymentProvider: true,
      paymentId: true,
      createdAt: true,
      buyerName: true,
      buyerEmail: true,
      buyerPhone: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          selectedSize: true,
          total: true,
          sellerAmount: true,
          affiliateAmount: true,
          platformAmount: true,
          product: {
            select: {
              name: true,
            },
          },
          seller: {
            select: {
              name: true,
              email: true,
              storeSlug: true,
            },
          },
        },
      },
      commissions: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
      settlements: {
        select: {
          id: true,
          netAmount: true,
          status: true,
          fulfillmentStatus: true,
          seller: {
            select: {
              name: true,
              email: true,
              storeSlug: true,
            },
          },
        },
      },
    },
  });

  type AdminOrderRecord = Omit<AdminOrder, "createdAt"> & {
    createdAt: Date;
  };

  const orders: AdminOrder[] = (allOrders as AdminOrderRecord[]).map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Plataforma
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Ordenes
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Revisa todas las ordenes y cancela casos reembolsados cuando corresponda.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                {orders.length} ordenes registradas
              </div>
            </div>

            <section className="mt-8">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-950">
                  Todas las ordenes
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Historial completo de compras, pagos, sellers y liquidaciones.
                </p>
              </div>
              <AdminOrdersClient orders={orders} />
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
