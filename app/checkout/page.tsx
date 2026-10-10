import { notFound } from "next/navigation";
import { getMercadoPagoPublicConfig } from "@/lib/payments/mercadopago";
import { prisma } from "@/lib/prisma";
import MercadoPagoCheckoutClient from "./[orderId]/MercadoPagoCheckoutClient";
import { randomUUID } from "crypto";
import { isSessionId } from "@/lib/purchase-analytics";

type DraftCheckoutItem = {
  productId: string;
  quantity?: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

function decodeCheckoutItems(value?: string | string[]) {
  const encoded = Array.isArray(value) ? value[0] : value;

  if (!encoded) return [];

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as DraftCheckoutItem[];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.productId === "string")
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Math.min(20, Number(item.quantity || 1))),
        selectedSize:
          typeof item.selectedSize === "string" ? item.selectedSize : null,
        selectedColor:
          typeof item.selectedColor === "string" ? item.selectedColor : null,
        clickId: typeof item.clickId === "string" ? item.clickId : undefined,
        campaignClickId:
          typeof item.campaignClickId === "string"
            ? item.campaignClickId
            : undefined,
      }));
  } catch {
    return [];
  }
}

export default async function DraftCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string | string[]; checkoutId?: string }>;
}) {
  const { items: encodedItems, checkoutId } = await searchParams;
  const draftItems = decodeCheckoutItems(encodedItems);

  if (draftItems.length !== 1) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: draftItems.map((item) => item.productId),
      },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      desc: true,
      price: true,
      imageUrls: true,
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const checkoutItems = draftItems.map((item) => {
    const product = productById.get(item.productId);

    if (!product) notFound();

    return {
      id: `${item.productId}:digital`,
      total: product.price * item.quantity,
      selectedSize: null,
      selectedColor: null,
      product: {
        name: product.name,
        desc: product.desc,
        imageUrls: product.imageUrls,
      },
    };
  });
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;
  const mercadoPagoConfig = getMercadoPagoPublicConfig();

  return (
    <main className="min-h-screen bg-[#fffaf5] px-2 py-10 sm:px-4 md:px-8">
      <div className="mx-auto max-w-6xl">
        <MercadoPagoCheckoutClient
          order={{
            id: "pendiente",
            total,
            subtotal,
            status: "DRAFT",
            paymentStatus: null,
            shipping: {
              buyerName: "",
              buyerEmail: "",
              buyerPhone: "",
              shippingStreet: "",
              shippingNumber: "",
              shippingApartment: "",
              shippingCity: "",
              shippingState: "",
              shippingPostalCode: "",
              shippingCountry: "UY",
              shippingNotes: "",
            },
            items: checkoutItems,
          }}
          draftItems={draftItems}
          checkoutId={isSessionId(checkoutId) ? checkoutId : randomUUID()}
          productId={draftItems[0].productId}
          publicKey={mercadoPagoConfig.publicKey}
          sdkUrl={mercadoPagoConfig.sdkUrl}
        />
      </div>
    </main>
  );
}
