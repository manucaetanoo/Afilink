import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, count: 0 }, { status: 401 });
  }

  if (session.user.role !== "SELLER") {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const count = await prisma.settlement.count({
    where: {
      sellerId: session.user.id,
      fulfillmentStatus: {
        in: ["PENDING", "PREPARING"],
      },
      order: {
        status: "PAID",
      },
    },
  });

  return NextResponse.json({ ok: true, count });
}
