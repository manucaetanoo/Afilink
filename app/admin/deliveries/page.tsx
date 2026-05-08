import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SellerOrdersClient, {
  type SellerOrder,
} from "@/components/seller/SellerOrdersClient";
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

  const [allOrders, settlements] = await Promise.all([
    prisma.order.findMany({
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
    }),
    prisma.settlement.findMany({
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
    }),
  ]);

  type DeliverySettlement = Omit<
    SellerOrder,
    "createdAt" | "shippedAt" | "deliveredAt"
  > & {
    createdAt: Date;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  };

  const deliveryOrders: SellerOrder[] = (settlements as DeliverySettlement[]).map((settlement) => ({
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
                 Entregas
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Revisa todas las ordenes y confirma
                  entregas cuando corresponda.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                {allOrders.length} ordenes registradas
              </div>
            </div>

            

            <section className="mt-10">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-950">
                  Control de entregas
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Revisa el tracking cargado por sellers y confirma entregas. Al
                  confirmar una entrega, el dinero queda por liquidar al seller.
                </p>
              </div>
              <SellerOrdersClient orders={deliveryOrders} canConfirmDelivery />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
