import {
  CommissionStatus,
  FulfillmentStatus,
  PayoutMethod,
  PayoutRequestKind,
  PayoutRequestStatus,
  Role,
  SettlementStatus,
  type User,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PayoutUser = Pick<
  User,
  | "payoutMethod"
  | "payoutHolderName"
  | "payoutDocumentType"
  | "payoutDocumentNumber"
  | "payoutEmail"
  | "payoutPhone"
  | "payoutCountry"
  | "payoutCurrency"
  | "bankName"
  | "bankAccountType"
  | "bankAccountNumber"
  | "bankAccountAlias"
>;

function filled(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getMissingPayoutFields(user: PayoutUser) {
  const missing: string[] = [];
  const method = user.payoutMethod ?? PayoutMethod.BANK_TRANSFER;

  if (!filled(user.payoutHolderName)) missing.push("titular");
  if (!filled(user.payoutDocumentType)) missing.push("tipo de documento");
  if (!filled(user.payoutDocumentNumber)) missing.push("numero de documento");
  if (!filled(user.payoutCountry)) missing.push("pais");
  if (!filled(user.payoutCurrency)) missing.push("moneda");

  if (method === PayoutMethod.BANK_TRANSFER) {
    if (!filled(user.bankName)) missing.push("banco");
    if (!filled(user.bankAccountType)) missing.push("tipo de cuenta");
    if (!filled(user.bankAccountNumber) && !filled(user.bankAccountAlias)) {
      missing.push("numero de cuenta o alias");
    }
  }

  if (method === PayoutMethod.DLOCAL_GO) {
    if (!filled(user.payoutEmail) && !filled(user.payoutPhone)) {
      missing.push("email o telefono de dLocal Go");
    }
  }

  return missing;
}

export async function getAvailablePayoutAmount(
  userId: string,
  kind: PayoutRequestKind
) {
  if (kind === PayoutRequestKind.SELLER) {
    const result = await prisma.settlement.aggregate({
      where: {
        sellerId: userId,
        status: SettlementStatus.AVAILABLE,
        fulfillmentStatus: FulfillmentStatus.DELIVERED,
      },
      _sum: {
        netAmount: true,
      },
    });

    return result._sum.netAmount ?? 0;
  }

  const commissions = await prisma.commission.findMany({
    where: {
      affiliateId: userId,
      status: CommissionStatus.APPROVED,
    },
    select: {
      amount: true,
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

  return commissions
    .filter((commission) =>
      commission.order.settlements.some(
        (settlement) =>
          settlement.sellerId === commission.orderItem?.sellerId &&
          settlement.status === SettlementStatus.AVAILABLE &&
          settlement.fulfillmentStatus === FulfillmentStatus.DELIVERED
      )
    )
    .reduce((total, commission) => total + commission.amount, 0);
}

export function getPayoutKindForRole(role: Role) {
  if (role === Role.SELLER) return PayoutRequestKind.SELLER;
  if (role === Role.AFFILIATE) return PayoutRequestKind.AFFILIATE;
  return null;
}

export async function hasPendingPayoutRequest(
  userId: string,
  kind: PayoutRequestKind
) {
  const existing = await prisma.payoutRequest.findFirst({
    where: {
      requesterId: userId,
      kind,
      status: PayoutRequestStatus.PENDING,
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
}
