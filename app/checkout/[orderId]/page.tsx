import { notFound } from "next/navigation";
import { getDlocalGoSmartFieldsConfig } from "@/lib/payments/dlocalgo";
import { prisma } from "@/lib/prisma";
import DlocalGoCheckoutClient from "./DlocalGoCheckoutClient";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function CheckoutOrderPage({ params }: Props) {
  const { orderId } = await params;

  const checkoutOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      status: true,
      paymentStatus: true,
      buyerName: true,
      buyerEmail: true,
      buyerPhone: true,
      shippingStreet: true,
      shippingNumber: true,
      shippingApartment: true,
      shippingCity: true,
      shippingState: true,
      shippingPostalCode: true,
      shippingCountry: true,
      shippingNotes: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          total: true,
          selectedSize: true,
          product: {
            select: {
              name: true,
              desc: true,
              imageUrls: true,
            },
          },
        },
      },
      product: {
        select: {
          name: true,
          desc: true,
          imageUrls: true,
        },
      },
    },
  });

  if (!checkoutOrder) {
    notFound();
  }

  const items = checkoutOrder.items.length
    ? checkoutOrder.items
    : [
        {
          id: checkoutOrder.id,
          total: checkoutOrder.total,
          selectedSize: null,
          product: checkoutOrder.product,
        },
      ];
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.max(0, checkoutOrder.total - subtotal);

  const order = {
    id: orderId,
    total: checkoutOrder.total,
    subtotal,
    taxAmount,
    status: checkoutOrder.status,
    paymentStatus: checkoutOrder.paymentStatus,
    shipping: {
      buyerName: checkoutOrder.buyerName ?? "",
      buyerEmail: checkoutOrder.buyerEmail ?? "",
      buyerPhone: checkoutOrder.buyerPhone ?? "",
      shippingStreet: checkoutOrder.shippingStreet ?? "",
      shippingNumber: checkoutOrder.shippingNumber ?? "",
      shippingApartment: checkoutOrder.shippingApartment ?? "",
      shippingCity: checkoutOrder.shippingCity ?? "",
      shippingState: checkoutOrder.shippingState ?? "",
      shippingPostalCode: checkoutOrder.shippingPostalCode ?? "",
      shippingCountry: checkoutOrder.shippingCountry ?? "UY",
      shippingNotes: checkoutOrder.shippingNotes ?? "",
    },
    items: items.map((item) => ({
      id: item.id,
      total: item.total,
      selectedSize: item.selectedSize,
      product: item.product,
    })),
  };
  const smartFieldsConfig = getDlocalGoSmartFieldsConfig();

  return (
    <main className="min-h-screen bg-[#fffaf5] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <DlocalGoCheckoutClient
          order={order}
          smartFieldsApiKey={smartFieldsConfig.smartFieldsApiKey}
          sdkUrl={smartFieldsConfig.sdkUrl}
        />
      </div>
    </main>
  );
}
