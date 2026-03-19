export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";

type Props = {
  searchParams: Promise<{ productId?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const sp = await searchParams; 
  const productId = sp.productId; //Obtenemos el productId de la URL





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
      //renderiza el componente
  return <CheckoutClient product={product} />;
}
