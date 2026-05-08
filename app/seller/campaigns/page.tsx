import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import DeleteCampaignButton from "@/components/campaigns/DeleteCampaignButton";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | null) {
  if (!date) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(date);
}

export default async function SellerCampaignsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const campaigns = await prisma.campaign.findMany({
    where: { sellerId: session.user.id },
    include: { products: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <div className="flex min-h-screen pt-16">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Gestion
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  Campañas
                </h1>
                <p className="mt-2 text-sm font-bold text-black">
                  Mira tus campañas, edita su contenido y administra productos asociados.
                </p>
                <h6 className=" mt-2 text-sm text-slate-600">Los afiliados que promocionen tu campaña recibirán un porcentaje de comisión por cada venta realizada de los productos.</h6>
              </div>

              <Link
                href="/seller/campaigns/new"
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Nueva campaña
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold">Todavia no tenes campañas</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Crea tu primera campaña para destacar productos o promociones.
                </p>
                <Link
                  href="/seller/campaigns/new"
                  className="mt-6 inline-flex rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  Crear campaña
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold">{campaign.title}</h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              campaign.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {campaign.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">/{campaign.slug}</p>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                          {campaign.description || "Sin descripcion."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-500">
                          <span>Inicio: {formatDate(campaign.startsAt)}</span>
                          <span>Fin: {formatDate(campaign.endsAt)}</span>
                          <span>Productos: {campaign.products.length}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/seller/campaigns/${campaign.id}`}
                          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/seller/campaigns/${campaign.id}/products`}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Productos
                        </Link>
                        <Link
                          href={`/store/${session.user.storeSlug}/campaign/${campaign.slug}?preview=public`}
                          className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                        >
                          Vista previa
                        </Link>
                        <DeleteCampaignButton
                          campaignId={campaign.id}
                          campaignTitle={campaign.title}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
