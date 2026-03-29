import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CampaignProductCard from "@/components/campaigns/CampaignProductCard";

type Props = {
  params: Promise<{
    storeSlug: string;
    campaignSlug: string;
  }>;
};

export default async function CampaignPublicPage(props: Props) {
  const { storeSlug, campaignSlug } = await props.params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      slug: campaignSlug,
      seller: {
        storeSlug,
      },
      isActive: true,
    },
    include: {
      seller: true,
      products: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!campaign) return notFound();

  const products = campaign.products.map((cp) => cp.product);

  return (
    <div className="min-h-screen bg-[#fafafa] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 rounded-3xl bg-orange-500 p-10 text-white">
          <h1 className="text-4xl font-bold">{campaign.title}</h1>

          {campaign.description && (
            <p className="mt-3 max-w-2xl text-white/90">
              {campaign.description}
            </p>
          )}
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            No hay productos en esta campaña.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <CampaignProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  desc: product.desc,
                  imageUrl: product.imageUrls?.[0] || null,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}