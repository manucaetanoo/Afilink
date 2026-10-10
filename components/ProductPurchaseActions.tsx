"use client";

import { useSearchParams } from "next/navigation";
import { BuyButton } from "@/components/BuyButton";
import { useEffect } from "react";
import { trackPurchaseStage } from "@/lib/purchase-tracking";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
  };
  refCode?: string | null;
  disabled?: boolean;
};

export default function ProductPurchaseActions({
  product,
  refCode,
  disabled = false,
}: Props) {
  const searchParams = useSearchParams();
  const resolvedRefCode = refCode ?? searchParams.get("ref");
  const disabledReason = disabled ? "No disponible" : undefined;
  useEffect(() => { trackPurchaseStage("product_view", product.id); }, [product.id]);

  return (
    <div className="mt-7">
      <BuyButton
        productId={product.id}
        refCode={resolvedRefCode}
        selectedSize={null}
        selectedColor={null}
        disabled={disabled}
        disabledReason={disabledReason}
      />
    </div>
  );
}
