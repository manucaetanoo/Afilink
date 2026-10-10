import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPurchaseSession, getDevice, isKnownBot, recordPurchaseEvent } from "@/lib/purchase-analytics";
import { rateLimit } from "@/lib/rate-limit";

const stages = ["product_view", "buy_click", "checkout_started", "payment_ready", "checkout_error"];
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ ok: false }, { status: 403 });
  if (isKnownBot(req.headers.get("user-agent"))) return NextResponse.json({ ok: true });
  const limit = rateLimit(req, { key: "analytics:purchase", limit: 120, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (!stages.includes(body?.name)) return NextResponse.json({ ok: false }, { status: 400 });
  const sessionId = await getPurchaseSession();
  let productId = typeof body.productId === "string" && body.productId.length < 191 ? body.productId : null;
  const orderId = typeof body.orderId === "string" && body.orderId.length < 191 ? body.orderId : null;
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { sessionId: true, productId: true } });
    if (!order || order.sessionId !== sessionId) return NextResponse.json({ ok: false }, { status: 403 });
    productId = order.productId;
  } else if (!productId || !(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await recordPurchaseEvent({ name: body.name, eventKey: `${sessionId}:${body.name}:${orderId ?? productId}`, sessionId, productId, orderId, device: getDevice(req.headers.get("user-agent")) });
  return NextResponse.json({ ok: true });
}
