import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SellerCampaignsList, {
  type SellerCampaignListItem,
} from "@/components/campaigns/SellerCampaignsList";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const SELLER_CAMPAIGNS_PAGE_LIMIT = 50;

export default async function SellerCampaignsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const campaigns = await prisma.campaign.findMany({
    where: { sellerId: session.user.id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "desc" },
    take: SELLER_CAMPAIGNS_PAGE_LIMIT + 1,
  });

  const initialCampaigns: SellerCampaignListItem[] = campaigns
    .slice(0, SELLER_CAMPAIGNS_PAGE_LIMIT)
    .map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      description: campaign.description,
      isActive: campaign.isActive,
      startsAt: campaign.startsAt?.toISOString() ?? null,
      endsAt: campaign.endsAt?.toISOString() ?? null,
      productsCount: campaign._count.products,
    }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
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
                <h6 className="mt-2 text-sm text-slate-600">
                  Los afiliados que promocionen tu campaña recibiran un porcentaje
                  de comision por cada venta realizada de los productos.
                </h6>
              </div>

              <Link
                href="/seller/campaigns/new"
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Nueva campaña
              </Link>
            </div>

            <SellerCampaignsList
              campaigns={initialCampaigns}
              storeSlug={session.user.storeSlug}
              pageSize={SELLER_CAMPAIGNS_PAGE_LIMIT}
              hasMoreInitial={campaigns.length > SELLER_CAMPAIGNS_PAGE_LIMIT}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
