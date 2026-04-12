import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PaymentBrickClient from "./PaymentBrickClient";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function CheckoutOrderPage({ params }: Props) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      status: true,
      paymentStatus: true,
      product: {
        select: {
          name: true,
          desc: true,
          imageUrls: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl">
        <PaymentBrickClient
          order={order}
          publicKey={process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? ""}
        />
      </div>
    </main>
  );
}
