import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import CampaignForm from "@/components/campaigns/CampaignForm";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ campaignId: string }>;
};

export default async function EditSellerCampaignPage({ params }: Props) {
  const { campaignId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, sellerId: session.user.id },
    include: {
      seller: {
        select: { storeSlug: true },
      },
    },
  });

  if (!campaign) notFound();

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
                Volver a campañas
              </Link>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Editar campaña
              </h1>
            </div>

            <CampaignForm
              campaignId={campaign.id}
              storeSlug={campaign.seller.storeSlug}
              defaultValues={{
                title: campaign.title,
                slug: campaign.slug,
                description: campaign.description || "",
                bannerUrl: campaign.bannerUrl || "",
                isActive: campaign.isActive,
                startsAt: campaign.startsAt?.toISOString().slice(0, 16),
                endsAt: campaign.endsAt?.toISOString().slice(0, 16),
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
