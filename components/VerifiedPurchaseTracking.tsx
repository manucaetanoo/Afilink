"use client";
import { useEffect } from "react";
import { trackVerifiedPurchase } from "@/lib/purchase-tracking";

export default function VerifiedPurchaseTracking({ orderId, productId, total }: { orderId: string; productId: string; total: number }) {
  useEffect(() => { trackVerifiedPurchase(orderId, productId, total); }, [orderId, productId, total]);
  return null;
}
