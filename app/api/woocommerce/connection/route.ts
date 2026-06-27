import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createWooCommerceClient,
  deleteWooCommerceStockWebhooks,
  decryptWooCommerceSecret,
  encryptWooCommerceSecret,
  ensureWooCommerceStockWebhooks,
  normalizeWooCommerceStoreUrl,
} from "@/lib/woocommerce";

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const connection = await prisma.wooCommerceConnection.findUnique({
      where: { userId: user.id },
      select: {
        storeUrl: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    const msg = getErrorMessage(error);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const body = await req.json();
    const storeUrl = normalizeWooCommerceStoreUrl(body.storeUrl);
    const consumerKey = cleanString(body.consumerKey, 300);
    const consumerSecret = cleanString(body.consumerSecret, 300);

    if (!storeUrl) {
      return NextResponse.json(
        { ok: false, error: "URL de WooCommerce invalida" },
        { status: 400 }
      );
    }

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        { ok: false, error: "Consumer key y consumer secret son requeridos" },
        { status: 400 }
      );
    }

    const client = createWooCommerceClient({
      storeUrl,
      consumerKey,
      consumerSecret,
    });

    await client.request("products?per_page=1");

    const connection = await prisma.wooCommerceConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        storeUrl,
        consumerKey: encryptWooCommerceSecret(consumerKey),
        consumerSecret: encryptWooCommerceSecret(consumerSecret),
      },
      update: {
        storeUrl,
        consumerKey: encryptWooCommerceSecret(consumerKey),
        consumerSecret: encryptWooCommerceSecret(consumerSecret),
        connectedAt: new Date(),
      },
      select: {
        storeUrl: true,
        connectedAt: true,
        updatedAt: true,
      },
    });

    await ensureWooCommerceStockWebhooks(client).catch((error) => {
      console.error("WooCommerce webhook setup failed", error);
    });

    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    const msg = getErrorMessage(error);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const connection = await prisma.wooCommerceConnection.findUnique({
      where: { userId: user.id },
      select: {
        storeUrl: true,
        consumerKey: true,
        consumerSecret: true,
      },
    });

    if (connection) {
      const client = createWooCommerceClient({
        storeUrl: connection.storeUrl,
        consumerKey: decryptWooCommerceSecret(connection.consumerKey),
        consumerSecret: decryptWooCommerceSecret(connection.consumerSecret),
      });

      await deleteWooCommerceStockWebhooks(client).catch((error) => {
        console.error("WooCommerce webhook cleanup failed", error);
      });

      await prisma.wooCommerceConnection.deleteMany({
        where: { userId: user.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = getErrorMessage(error);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function HEAD() {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const connection = await prisma.wooCommerceConnection.findUnique({
      where: { userId: user.id },
      select: {
        storeUrl: true,
        consumerKey: true,
        consumerSecret: true,
      },
    });

    if (!connection) {
      return new Response(null, { status: 404 });
    }

    const client = createWooCommerceClient({
      storeUrl: connection.storeUrl,
      consumerKey: decryptWooCommerceSecret(connection.consumerKey),
      consumerSecret: decryptWooCommerceSecret(connection.consumerSecret),
    });

    await client.request("products?per_page=1");

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
