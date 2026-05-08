import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayoutRequestStatus } from "@/lib/prisma-enums";
import {
  getAvailablePayoutAmount,
  getMissingPayoutFields,
  getPayoutKindForRole,
  hasPendingPayoutRequest,
} from "@/lib/payouts";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function POST() {
  try {
    const authUser = await requireUser();
    const kind = getPayoutKindForRole(authUser.role);

    if (!kind) {
      return NextResponse.json(
        { ok: false, error: "Tu rol no puede solicitar liquidaciones" },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        payoutMethod: true,
        payoutHolderName: true,
        payoutDocumentType: true,
        payoutDocumentNumber: true,
        payoutEmail: true,
        payoutPhone: true,
        payoutCountry: true,
        payoutCurrency: true,
        bankName: true,
        bankAccountType: true,
        bankAccountNumber: true,
        bankAccountAlias: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const missing = getMissingPayoutFields(user);

    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Completa tus datos de cobro: ${missing.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const amount = await getAvailablePayoutAmount(authUser.id, kind);

    if (amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "No tienes dinero disponible para liquidar" },
        { status: 400 }
      );
    }

    if (await hasPendingPayoutRequest(authUser.id, kind)) {
      return NextResponse.json(
        { ok: false, error: "Ya tienes una solicitud de liquidacion pendiente" },
        { status: 400 }
      );
    }

    const request = await prisma.payoutRequest.create({
      data: {
        requesterId: authUser.id,
        kind,
        amount,
        status: PayoutRequestStatus.PENDING,
      },
      select: {
        id: true,
        amount: true,
        kind: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, request }, { status: 201 });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg === "UNAUTHORIZED" ? 401 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
