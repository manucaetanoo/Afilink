import { notFound } from "next/navigation";
import { getDlocalGoSmartFieldsConfig } from "@/lib/payments/dlocalgo";
import { prisma } from "@/lib/prisma";
import { getCheckoutTotalWithTax } from "@/lib/taxes";
import DlocalGoCheckoutClient from "./[orderId]/DlocalGoCheckoutClient";

type DraftCheckoutItem = {
  productId: string;
  quantity?: number;
  selectedSize?: string | null;
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
  searchParams: Promise<{ items?: string | string[] }>;
}) {
  const { items: encodedItems } = await searchParams;
  const draftItems = decodeCheckoutItems(encodedItems);

  if (draftItems.length === 0) {
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
      stock: true,
      sizes: true,
      imageUrls: true,
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const checkoutItems = draftItems.map((item) => {
    const product = productById.get(item.productId);

    if (!product) notFound();
    if (product.stock < item.quantity) notFound();
    if (product.sizes.length > 0 && !product.sizes.includes(item.selectedSize || "")) {
      notFound();
    }

    return {
      id: `${item.productId}:${item.selectedSize || "no-size"}`,
      total: product.price * item.quantity,
      selectedSize: item.selectedSize,
      product: {
        name: product.name,
        desc: product.desc,
        imageUrls: product.imageUrls,
      },
    };
  });
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.total, 0);
  const { total, taxAmount } = getCheckoutTotalWithTax(subtotal);
  const smartFieldsConfig = getDlocalGoSmartFieldsConfig();

  return (
    <main className="min-h-screen bg-[#fffaf5] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <DlocalGoCheckoutClient
          order={{
            id: "pendiente",
            total,
            subtotal,
            taxAmount,
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
          smartFieldsApiKey={smartFieldsConfig.smartFieldsApiKey}
          sdkUrl={smartFieldsConfig.sdkUrl}
        />
      </div>
    </main>
  );
}
