import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import CampaignForm from "@/components/campaigns/CampaignForm";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function NewSellerCampaignPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <div className="flex min-h-screen pt-16">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link
                href="/seller/campaigns"
                className="text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                Volver a campanas
              </Link>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Nueva campana
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Crea una campana para destacar promociones, colecciones o productos.
              </p>
            </div>

            <CampaignForm />
          </div>
        </main>
      </div>
    </div>
  );
}
