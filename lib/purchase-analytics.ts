import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sessionCookie, isSessionId, sessionCookieOptions } from "@/lib/purchase-session";
export { sessionCookie, isSessionId, sessionCookieOptions } from "@/lib/purchase-session";

export async function getPurchaseSession() {
  const store = await cookies();
  const existing = store.get(sessionCookie)?.value;
  const id = isSessionId(existing) ? existing! : randomUUID();
  store.set(sessionCookie, id, sessionCookieOptions());
  return id;
}
export function getDevice(userAgent?: string | null) {
  return /ipad|tablet/i.test(userAgent ?? "") ? "tablet" : /mobile|android|iphone/i.test(userAgent ?? "") ? "mobile" : userAgent ? "desktop" : "unknown";
}
export const isKnownBot = (ua?: string | null) => /bot|crawler|spider|facebookexternalhit|facebot|whatsapp|slack|discord|pinterest/i.test(ua ?? "");
type EventInput = { name: string; eventKey: string; sessionId?: string | null; productId?: string | null; orderId?: string | null; device?: string };
export async function recordPurchaseEvent(input: EventInput, db: Pick<Prisma.TransactionClient, "purchaseEvent"> = prisma) {
  // skipDuplicates is safe under concurrent requests and does not abort a transaction.
  await db.purchaseEvent.createMany({ data: [input], skipDuplicates: true });
}
export async function recordBrowserEvent(input: EventInput) {
  try { await recordPurchaseEvent(input); }
  catch (error) { console.error("Purchase analytics unavailable", error instanceof Error ? error.name : "error"); }
}
