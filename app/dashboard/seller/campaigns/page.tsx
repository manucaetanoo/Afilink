import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function formatDate(date: Date | null) {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "medium",
  }).format(date);
}

export default async function SellerCampaignsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER") {
    redirect("/");
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      sellerId: session.user.id,
    },
    include: {
      products: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-[#fafafa] px-6 py-10 text-[#1a1a1a]">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Campañas</h1>
            <p className="mt-2 text-sm text-gray-500">
              Gestioná las campañas de tu tienda.
            </p>
          </div>

          <Link
            href="/dashboard/seller/campaigns/new"
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-600"
          >
            Nueva campaña
          </Link>
        </div>

        {/* EMPTY STATE */}
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold">
              Todavía no tenés campañas
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Creá tu primera campaña para destacar productos o promociones.
            </p>

            <Link
              href="/dashboard/seller/campaigns/new"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              Crear primera campaña
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* INFO */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold">
                        {campaign.title}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          campaign.isActive
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {campaign.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500">
                      Slug:{" "}
                      <span className="text-gray-700">
                        {campaign.slug}
                      </span>
                    </p>

                    {campaign.description ? (
                      <p className="max-w-3xl text-sm text-gray-600">
                        {campaign.description}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">
                        Sin descripción.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                      <span>Inicio: {formatDate(campaign.startsAt)}</span>
                      <span>Fin: {formatDate(campaign.endsAt)}</span>
                      <span>Productos: {campaign.products.length}</span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/dashboard/seller/campaigns/${campaign.id}`}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                    >
                      Editar
                    </Link>

                    <Link
                      href={`/dashboard/seller/campaigns/${campaign.id}/products`}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
                    >
                      Productos
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}