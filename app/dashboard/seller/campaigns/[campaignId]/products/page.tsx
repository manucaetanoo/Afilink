import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CampaignProductsManager from "@/components/campaigns/CampaignProductsManager";

type PageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function CampaignProductsPage(props: PageProps) {
  const { campaignId } = await props.params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER") {
    redirect("/");
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      sellerId: session.user.id,
    },
    include: {
      products: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const sellerProducts = await prisma.product.findMany({
    where: {
      sellerId: session.user.id,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const linkedProductIds = new Set(
    campaign.products.map((cp) => cp.productId)
  );

  const availableProducts = sellerProducts.filter(
    (product) => !linkedProductIds.has(product.id)
  );

  return (
    <div className="min-h-screen bg-[#fafafa] px-6 py-10 text-[#1a1a1a]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/dashboard/seller/campaigns"
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            ← Volver a campañas
          </Link>

          <h1 className="mt-4 text-3xl font-semibold">
            Productos de la campaña
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Administrá los productos que van a formar parte de{" "}
            <span className="font-medium text-gray-700">{campaign.title}</span>.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
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

          <p className="mt-2 text-sm text-gray-600">
            Slug: <span className="font-medium">{campaign.slug}</span>
          </p>

          {campaign.description ? (
            <p className="mt-2 text-sm text-gray-600">{campaign.description}</p>
          ) : null}
        </div>

        <CampaignProductsManager
          campaignId={campaign.id}
          linkedProducts={campaign.products.map((cp) => cp.product)}
          availableProducts={availableProducts}
        />
      </div>
    </div>
  );
}