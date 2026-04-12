
import Link from "next/link";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  MegaphoneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CampaignForm from "@/components/campaigns/CampaignForm";
import Navbar from "@/components/Navbar";
import ProgresBar from "@/components/ProgresBar";
import { prisma } from "@/lib/prisma";




export default async function NewCampaignPage() {

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER") {
    redirect("/");
  }

  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { storeSlug: true },
  });

  if (!seller?.storeSlug) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#fff7f0] mt-15">
      <Navbar />

      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">

          <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(251,146,60,0.12)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 px-6 py-8 text-white sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <MegaphoneIcon className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-medium text-orange-100">
                    Gestión de campañas
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Creá una nueva campaña
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-orange-50/90 sm:text-[15px]">
                Armá una campaña para destacar promociones, colecciones o
                productos especiales de tu tienda y hacer que se vea más
                profesional para tus afiliados y clientes.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium text-white/95 backdrop-blur-sm">
                  <SparklesIcon className="h-4 w-4" />
                  Más visibilidad para tus productos
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium text-white/95 backdrop-blur-sm">
                  Campañas más ordenadas
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-medium text-white/95 backdrop-blur-sm">
                  Mejor presentación para afiliados
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-8 sm:px-8">
              <div className="mb-6 rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Configuración de la campaña
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Completá la información principal y despues elegí los productos que
                  querés incluir. Luego vas a poder compartirla y usarla como
                  parte del marketing de tu tienda.
                </p>
              </div>

              <CampaignForm storeSlug={seller.storeSlug} />
            </div>
          </div>

          <div className="mt-6">
            <ProgresBar />
          </div>
        </div>
      </div>
    </div>
  );
}