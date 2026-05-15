import { NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FulfillmentStatus,
  SettlementStatus,
} from "@/lib/prisma-enums";

const statusValues = new Set(Object.values(FulfillmentStatus));

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const { id } = await params;
    const body = await req.json();
    const fulfillmentStatus = String(body.fulfillmentStatus ?? "")
      .trim()
      .toUpperCase();

    if (!statusValues.has(fulfillmentStatus as FulfillmentStatus)) {
      return NextResponse.json(
        { ok: false, error: "Estado logistico invalido" },
        { status: 400 }
      );
    }

    const where = user.role === "ADMIN" ? { id } : { id, sellerId: user.id };
    const current = await prisma.settlement.findFirst({
      where,
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        shippedAt: true,
        deliveredAt: true,
      },
    });

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Liquidacion no encontrada" },
        { status: 404 }
      );
    }

    if (current.status === SettlementStatus.PAID) {
      return NextResponse.json(
        { ok: false, error: "La liquidacion ya fue pagada" },
        { status: 400 }
      );
    }

    if (
      current.fulfillmentStatus === FulfillmentStatus.DELIVERED &&
      fulfillmentStatus !== FulfillmentStatus.DELIVERED
    ) {
      return NextResponse.json(
        { ok: false, error: "Una entrega confirmada no puede volver atras" },
        { status: 400 }
      );
    }

    if (user.role === "SELLER" && fulfillmentStatus === FulfillmentStatus.DELIVERED) {
      return NextResponse.json(
        { ok: false, error: "Solo la plataforma puede confirmar entregas" },
        { status: 403 }
      );
    }

    if (user.role === "SELLER" && fulfillmentStatus === FulfillmentStatus.CANCELED) {
      return NextResponse.json(
        { ok: false, error: "Solo la plataforma puede cancelar liquidaciones" },
        { status: 403 }
      );
    }

    const shippingCarrier = cleanText(body.shippingCarrier, 80);
    const trackingCode = cleanText(body.trackingCode, 120);
    const trackingUrl = cleanText(body.trackingUrl, 300);
    const sellerNotes = cleanText(body.sellerNotes, 1000);

    if (
      fulfillmentStatus === FulfillmentStatus.SHIPPED &&
      (!shippingCarrier || (!trackingCode && !trackingUrl && !sellerNotes))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Para marcar enviado debes cargar empresa y tracking, o una nota si es envio propio",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const data: Prisma.SettlementUpdateInput = {
      fulfillmentStatus: fulfillmentStatus as FulfillmentStatus,
      shippingCarrier,
      trackingCode,
      trackingUrl,
      sellerNotes,
    };

    if (fulfillmentStatus === FulfillmentStatus.SHIPPED) {
      data.shippedAt = current.shippedAt ?? now;
    }

    if (fulfillmentStatus === FulfillmentStatus.DELIVERY_REQUESTED) {
      data.shippedAt = current.shippedAt ?? now;
    }

    if (fulfillmentStatus === FulfillmentStatus.DELIVERED) {
      data.deliveredAt = current.deliveredAt ?? now;
      data.status = SettlementStatus.AVAILABLE;

      data.shippedAt = current.shippedAt ?? now;
    }

    if (fulfillmentStatus === FulfillmentStatus.CANCELED) {
      data.status = SettlementStatus.CANCELED;
    }

    const settlement = await prisma.settlement.update({
      where: { id: current.id },
      data,
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        shippingCarrier: true,
        trackingCode: true,
        trackingUrl: true,
        shippedAt: true,
        deliveredAt: true,
        sellerNotes: true,
      },
    });

    return NextResponse.json({ ok: true, settlement });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
