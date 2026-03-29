import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CampaignForm from "@/components/campaigns/CampaignForm";

type Props = {
  params: Promise<{ campaignId: string }>;
};

export default async function EditCampaignPage(props: Props) {
  const { campaignId } = await props.params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      sellerId: session.user.id,
    },
  });

  if (!campaign) notFound();

  return (
    <div className="min-h-screen bg-[#fafafa] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold mb-6">
          Editar campaña
        </h1>

        <CampaignForm
          campaignId={campaign.id}
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
    </div>
  );
}