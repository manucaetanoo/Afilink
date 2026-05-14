import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import CampaignProductsManager from "@/components/campaigns/CampaignProductsManager";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function SellerCampaignProductsPage({ params }: PageProps) {
  const { campaignId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, sellerId: session.user.id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isActive: true,
      products: {
        select: {
          productId: true,
          product: {
            select: {
              id: true,
              name: true,
              desc: true,
              price: true,
              imageUrls: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) notFound();

  const sellerProducts = await prisma.product.findMany({
    where: { sellerId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      desc: true,
      price: true,
      imageUrls: true,
      isActive: true,
    },
  });

  const linkedProductIds = new Set(campaign.products.map((item) => item.productId));
  const availableProducts = sellerProducts.filter(
    (product) => !linkedProductIds.has(product.id)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link
                href="/seller/campaigns"
                className="text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                Volver a campañas
              </Link>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Productos de la campaña
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Administra los productos que forman parte de {campaign.title}.
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-orange-100 bg-orange-50 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold">{campaign.title}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    campaign.isActive
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {campaign.isActive ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">/{campaign.slug}</p>
              {campaign.description ? (
                <p className="mt-2 text-sm text-slate-600">{campaign.description}</p>
              ) : null}
            </div>

            <CampaignProductsManager
              campaignId={campaign.id}
              linkedProducts={campaign.products.map((item) => item.product)}
              availableProducts={availableProducts}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
