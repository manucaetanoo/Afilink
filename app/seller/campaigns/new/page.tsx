import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import CampaignForm from "@/components/campaigns/CampaignForm";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export default async function NewSellerCampaignPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { storeSlug: true },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <div className="flex min-h-screen pt-16">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3">
              <Link
                href="/seller/campaigns"
                className="inline-block text-sm font-semibold text-black-600 hover:text-gray-700"
              >← Volver a campañas
              </Link>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Gestion de campañas
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  Nueva campaña
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Crea una campaña para destacar promociones, colecciones o productos
                  con una imagen lista para mostrar en la tienda.
                </p>
              </div>
            </div>

            <CampaignForm storeSlug={seller?.storeSlug ?? null} />
          </div>
        </main>
      </div>
    </div>
  );
}
