import type { CommissionType } from "@/lib/prisma-enums";

type CalculateSplitInput = {
  total: number;
  affiliateValue: number;
  affiliateType: CommissionType;
  platformValue: number;
  platformType: CommissionType;
  hasAffiliate: boolean;
};

type CalculateSplitResult = {
  affiliateAmount: number;
  platformAmount: number;
  sellerAmount: number;
};

function resolveCommissionAmount(
  total: number,
  value: number,
  type: CommissionType
): number {
  if (type === "PERCENT") {
    if (value < 0 || value > 100) {
      throw new Error("El porcentaje debe estar entre 0 y 100");
    }

    return Math.round(total * (value / 100));
  }

  if (value < 0) {
    throw new Error("La comisión fija no puede ser negativa");
  }

  return value;
}

export function calculateSplit({
  total,
  affiliateValue,
  affiliateType,
  platformValue,
  platformType,
  hasAffiliate,
}: CalculateSplitInput): CalculateSplitResult {
  const affiliateAmount = hasAffiliate
    ? resolveCommissionAmount(total, affiliateValue, affiliateType)
    : 0;

  const platformAmount = resolveCommissionAmount(
    total,
    platformValue,
    platformType
  );

  const sellerAmount = total - affiliateAmount - platformAmount;

  if (sellerAmount < 0) {
    throw new Error("La suma de comisiones no puede ser mayor al total");
  }

  return {
    affiliateAmount,
    platformAmount,
    sellerAmount,
  };
}
