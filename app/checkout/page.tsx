export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";

type Props = {
  searchParams: Promise<{ productId?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const sp = await searchParams; // ✅ unwrap
  const productId = sp.productId;

  console.log("[checkout] productId:", productId);

  const totalProducts = await prisma.product.count();
  console.log("[checkout] total products in DB:", totalProducts);

  const product = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          price: true,
          desc: true,
          commissionValue: true,
          imageUrls: true,
        },
      })
    : null;

  console.log("[checkout] found product?", !!product);

  return <CheckoutClient product={product} />;
}
