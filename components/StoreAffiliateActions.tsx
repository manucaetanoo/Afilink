"use client";

import { useSession } from "next-auth/react";
import GetAffiliateLinkButton from "@/components/GetAffiliateLinkButton";
import GetCampaignAffiliateLinkButton from "@/components/campaigns/GetCampaignAffiliateLinkButton";

export function StoreCampaignAffiliateAction({
  campaignId,
  sellerId,
}: {
  campaignId: string;
  sellerId: string;
}) {
  const { data } = useSession();
  const user = data?.user;

  if (user?.role !== "AFFILIATE" || !user.id || user.id === sellerId) return null;

  return (
    <GetCampaignAffiliateLinkButton
      campaignId={campaignId}
      affiliateId={user.id}
    />
  );
}

export function StoreProductAffiliateAction({
  productId,
  sellerId,
}: {
  productId: string;
  sellerId: string;
}) {
  const { data } = useSession();
  const user = data?.user;

  if (user?.role !== "AFFILIATE" || !user.id || user.id === sellerId) return null;

  return (
    <div className="mt-3">
      <GetAffiliateLinkButton
        productId={productId}
        affiliateId={user.id}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
