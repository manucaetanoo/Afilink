import {
  DEFAULT_PLATFORM_COMMISSION_TYPE,
  DEFAULT_PLATFORM_COMMISSION_VALUE,
} from "@/lib/platform-commission";

export type CommissionType = "PERCENT" | "FIXED";

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getCommissionAmount(
  price: number,
  commissionValue: number,
  commissionType: CommissionType = "PERCENT"
) {
  if (!Number.isFinite(price) || !Number.isFinite(commissionValue)) return 0;

  if (commissionType === "FIXED") {
    return Math.max(0, Math.round(commissionValue));
  }

  return Math.max(0, Math.round((price * commissionValue) / 100));
}

type SellerNetAmountInput = {
  price: number;
  affiliateCommissionValue: number;
  affiliateCommissionType?: CommissionType;
  platformCommissionValue?: number;
  platformCommissionType?: CommissionType;
};

export function getSellerNetAmount({
  price,
  affiliateCommissionValue,
  affiliateCommissionType = "PERCENT",
  platformCommissionValue = DEFAULT_PLATFORM_COMMISSION_VALUE,
  platformCommissionType = DEFAULT_PLATFORM_COMMISSION_TYPE,
}: SellerNetAmountInput) {
  const affiliateAmount = getCommissionAmount(
    price,
    affiliateCommissionValue,
    affiliateCommissionType
  );
  const platformAmount = getCommissionAmount(
    price,
    platformCommissionValue,
    platformCommissionType
  );
  const netAmount = Math.max(0, Math.round(price - affiliateAmount - platformAmount));

  return {
    affiliateAmount,
    platformAmount,
    netAmount,
  };
}
