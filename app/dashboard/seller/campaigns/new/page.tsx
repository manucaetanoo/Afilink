import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CampaignForm from "@/components/campaigns/CampaignForm";

export default async function NewCampaignPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#fafafa] px-6 py-10 text-[#1a1a1a]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/dashboard/seller/campaigns"
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            ← Volver a campañas
          </Link>

          <h1 className="mt-4 text-3xl font-semibold">Nueva campaña</h1>
          <p className="mt-2 text-sm text-gray-500">
            Creá una campaña para destacar promociones, colecciones o productos
            especiales de tu tienda.
          </p>
        </div>

        <CampaignForm />
      </div>
    </div>
  );
}