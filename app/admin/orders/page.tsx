import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SellerOrdersClient from "@/components/seller/SellerOrdersClient";
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

  const settlements = await prisma.settlement.findMany({
    where: {
      order: {
        status: "PAID",
      },
    },
    orderBy: [{ fulfillmentStatus: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      grossAmount: true,
      platformFee: true,
      affiliateFee: true,
      netAmount: true,
      status: true,
      fulfillmentStatus: true,
      shippingCarrier: true,
      trackingCode: true,
      trackingUrl: true,
      sellerNotes: true,
      shippedAt: true,
      deliveredAt: true,
      createdAt: true,
      seller: {
        select: {
          name: true,
          email: true,
          storeSlug: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
          shippingStreet: true,
          shippingNumber: true,
          shippingApartment: true,
          shippingCity: true,
          shippingState: true,
          shippingPostalCode: true,
          shippingCountry: true,
          shippingNotes: true,
          items: {
            select: {
              id: true,
              quantity: true,
              selectedSize: true,
              total: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const orders = settlements.map((settlement) => ({
    ...settlement,
    createdAt: settlement.createdAt.toISOString(),
    shippedAt: settlement.shippedAt?.toISOString() ?? null,
    deliveredAt: settlement.deliveredAt?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <div className="flex min-h-screen pt-16">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Plataforma
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Control de entregas
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Revisa el tracking cargado por sellers y confirma entregas. Al
                  confirmar una entrega, el dinero queda por liquidar al seller.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                {orders.length} envios pagos
              </div>
            </div>

            <section className="mt-8">
              <SellerOrdersClient orders={orders} canConfirmDelivery />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
