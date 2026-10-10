import { notFound, redirect } from "next/navigation";
import { getMercadoPagoPublicConfig } from "@/lib/payments/mercadopago";
import { prisma } from "@/lib/prisma";
import MercadoPagoCheckoutClient from "./MercadoPagoCheckoutClient";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function CheckoutOrderPage({ params }: Props) {
  const { orderId } = await params;

  const checkoutOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      productId: true,
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
          selectedColor: true,
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
  if (checkoutOrder.status === "PAID") redirect(`/orders/${orderId}/success`);

  const items = checkoutOrder.items.length
    ? checkoutOrder.items
    : [
        {
          id: checkoutOrder.id,
          total: checkoutOrder.total,
          selectedSize: null,
          selectedColor: null,
          product: checkoutOrder.product,
        },
      ];
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  const order = {
    id: orderId,
    total: checkoutOrder.total,
    subtotal,
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
      selectedColor: item.selectedColor,
      product: item.product,
    })),
  };
  const mercadoPagoConfig = getMercadoPagoPublicConfig();

  return (
    <main className="min-h-screen bg-[#fffaf5] px-2 py-10 sm:px-4 md:px-8">
      <div className="mx-auto max-w-6xl">
        <MercadoPagoCheckoutClient
          order={order}
          productId={checkoutOrder.productId}
          publicKey={mercadoPagoConfig.publicKey}
          sdkUrl={mercadoPagoConfig.sdkUrl}
        />
      </div>
    </main>
  );
}
