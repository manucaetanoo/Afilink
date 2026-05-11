import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.role !== "SELLER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        sellerId: session.user.id,
      },
      include: {
        products: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaña no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("GET campaign products error:", error);
    return NextResponse.json(
      { error: "Error obteniendo productos de la campaña" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.role !== "SELLER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const productId = body?.productId?.trim();

    if (!productId) {
      return NextResponse.json(
        { error: "productId es obligatorio" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        sellerId: session.user.id,
      },
      select: {
        id: true,
        sellerId: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaña no encontrada" },
        { status: 404 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: session.user.id,
      },
      select: {
        id: true,
        sellerId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado o no pertenece al seller" },
        { status: 404 }
      );
    }

    const existing = await prisma.campaignProduct.findUnique({
      where: {
        campaignId_productId: {
          campaignId,
          productId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ese producto ya está en la campaña" },
        { status: 409 }
      );
    }

    const campaignProduct = await prisma.campaignProduct.create({
      data: {
        campaignId,
        productId,
      },
    });

    revalidateTag("campaigns");
    revalidateTag("stores");
    revalidatePath("/campaigns");
    revalidatePath("/store");

    return NextResponse.json({ campaignProduct }, { status: 201 });
  } catch (error) {
    console.error("POST campaign product error:", error);
    return NextResponse.json(
      { error: "Error agregando producto a la campaña" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.role !== "SELLER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const productId = body?.productId?.trim();

    if (!productId) {
      return NextResponse.json(
        { error: "productId es obligatorio" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        sellerId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaña no encontrada" },
        { status: 404 }
      );
    }

    const existing = await prisma.campaignProduct.findUnique({
      where: {
        campaignId_productId: {
          campaignId,
          productId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Ese producto no está asociado a la campaña" },
        { status: 404 }
      );
    }

    await prisma.campaignProduct.delete({
      where: {
        campaignId_productId: {
          campaignId,
          productId,
        },
      },
    });

    revalidateTag("campaigns");
    revalidateTag("stores");
    revalidatePath("/campaigns");
    revalidatePath("/store");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE campaign product error:", error);
    return NextResponse.json(
      { error: "Error quitando producto de la campaña" },
      { status: 500 }
    );
  }
}
