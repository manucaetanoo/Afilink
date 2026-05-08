import { NextResponse } from "next/server";
import {
  CommissionStatus,
  FulfillmentStatus,
  PayoutRequestKind,
  PayoutRequestStatus,
  SettlementStatus,
  type Prisma,
} from "@prisma/client";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, 1000) : null;
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
    requireRole(user, ["ADMIN"]);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const adminNotes = cleanText(body.adminNotes);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const request = await tx.payoutRequest.findUnique({
        where: { id },
        select: {
          id: true,
          requesterId: true,
          kind: true,
          status: true,
        },
      });

      if (!request) {
        return {
          status: 404 as const,
          body: { ok: false, error: "Solicitud no encontrada" },
        };
      }

      if (request.status !== PayoutRequestStatus.PENDING) {
        return {
          status: 400 as const,
          body: { ok: false, error: "La solicitud ya fue procesada" },
        };
      }

      if (request.kind === PayoutRequestKind.SELLER) {
        await tx.settlement.updateMany({
          where: {
            sellerId: request.requesterId,
            status: SettlementStatus.AVAILABLE,
            fulfillmentStatus: FulfillmentStatus.DELIVERED,
          },
          data: {
            status: SettlementStatus.PAID,
          },
        });
      } else {
        const eligibleCommissions = await tx.commission.findMany({
          where: {
            affiliateId: request.requesterId,
            status: CommissionStatus.APPROVED,
          },
          select: {
            id: true,
            orderItem: {
              select: {
                sellerId: true,
              },
            },
            order: {
              select: {
                settlements: {
                  select: {
                    sellerId: true,
                    status: true,
                    fulfillmentStatus: true,
                  },
                },
              },
            },
          },
        });
        const eligibleCommissionIds = eligibleCommissions
          .filter((commission) =>
            commission.order.settlements.some(
              (settlement) =>
                settlement.sellerId === commission.orderItem?.sellerId &&
                settlement.status === SettlementStatus.AVAILABLE &&
                settlement.fulfillmentStatus === FulfillmentStatus.DELIVERED
            )
          )
          .map((commission) => commission.id);

        await tx.commission.updateMany({
          where: {
            id: {
              in: eligibleCommissionIds,
            },
          },
          data: {
            status: CommissionStatus.PAID,
          },
        });
      }

      const updated = await tx.payoutRequest.update({
        where: { id: request.id },
        data: {
          status: PayoutRequestStatus.PAID,
          paidAt: new Date(),
          adminNotes,
        },
        select: {
          id: true,
          status: true,
          paidAt: true,
        },
      });

      return {
        status: 200 as const,
        body: { ok: true, request: updated },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
