import { randomUUID } from "crypto";
import { financialTransaction } from "@/lib/financial-transaction";
import { recordPurchaseEvent } from "@/lib/purchase-analytics";

export const terminalAttemptStatuses = ["rejected", "cancelled", "failed", "refunded", "charged_back"];
export class PaymentConflict extends Error {}

// The serializable transaction writes the order too, so competing tabs cannot
// prepare or claim different active attempts for the same order.
export async function preparePaymentAttempt(orderId: string) {
  return financialTransaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === "PAID") throw new PaymentConflict("La orden ya fue pagada o no existe");
    if (order.status === "CANCELED") {
      if (order.paymentStatus !== "rejected") throw new PaymentConflict("La orden fue cancelada");
      // Compatibility with orders rejected by the previous implementation.
      await tx.commission.updateMany({ where: { orderId, status: "CANCELED" }, data: { status: "PENDING" } });
      await tx.settlement.updateMany({ where: { orderId, status: "CANCELED" }, data: { status: "PENDING" } });
    }
    const active = await tx.paymentAttempt.findFirst({
      where: { orderId, status: { notIn: terminalAttemptStatuses } }, orderBy: { createdAt: "desc" },
    });
    // Legacy payments pending at the provider must be reconciled before retrying.
    if (!active && order.paymentId && ["pending", "in_process", "authorized"].includes(order.paymentStatus ?? "")) {
      throw new PaymentConflict("Hay un pago pendiente. Consultá su estado antes de volver a pagar");
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "PENDING" } });
    return active ?? tx.paymentAttempt.create({ data: { id: randomUUID(), orderId } });
  });
}

export async function claimPaymentAttempt(orderId: string, attemptId: string, requestHash: string, method: string) {
  return financialTransaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId } });
    if (!order || !attempt || attempt.orderId !== orderId) throw new PaymentConflict("Intento de pago inválido");
    if (attempt.requestHash && attempt.requestHash !== requestHash) {
      throw new PaymentConflict("Este intento sigue en verificación. No cambies los datos ni inicies otro pago todavía");
    }
    if (attempt.paymentId) return { attempt, send: false };
    if (order.status !== "PENDING") throw new PaymentConflict("La orden no está disponible para pago");
    if (terminalAttemptStatuses.includes(attempt.status)) throw new PaymentConflict("Prepará un nuevo intento de pago");
    // Wallet is a native redirect, without a server payment POST to replay using
    // our idempotency key. Once released, never grant a second redirect.
    if (attempt.method === "wallet" && attempt.status !== "ready") return { attempt, send: false };
    const other = await tx.paymentAttempt.findFirst({ where: { orderId, id: { not: attemptId }, status: { notIn: terminalAttemptStatuses } } });
    if (other) throw new PaymentConflict("Ya hay otro intento de pago en curso");
    if (attempt.status === "processing" && attempt.startedAt && Date.now() - attempt.startedAt.getTime() < 60_000) {
      return { attempt, send: false };
    }
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "processing" } });
    const claimed = await tx.paymentAttempt.update({ where: { id: attemptId }, data: {
      requestHash, method, status: "processing", startedAt: new Date(),
    } });
    await recordPurchaseEvent({ name: "payment_submitted", eventKey: `attempt:${attemptId}:submitted`, orderId, sessionId: order.sessionId, productId: order.productId }, tx);
    return { attempt: claimed, send: true };
  });
}
