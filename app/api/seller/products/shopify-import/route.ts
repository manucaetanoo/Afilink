import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { demoShopifyProducts } from "@/lib/demo-import-products";
import { isShopifyEnabledForEmail } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import {
  decryptShopifyToken,
  encryptShopifyToken,
  getShopifyClientId,
  normalizeShopDomain,
  SHOPIFY_API_VERSION,
} from "@/lib/shopify";

type ShopifyImage = {
  src?: string;
};

type ShopifyVariant = {
  id?: number;
  price?: string;
  inventory_quantity?: number;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
};

type ShopifyProduct = {
  id: number;
  title?: string;
  body_html?: string | null;
  product_type?: string | null;
  status?: string;
  images?: ShopifyImage[];
  variants?: ShopifyVariant[];
};

type ShopifyProductsResponse = {
  products?: ShopifyProduct[];
};

type ShopifyRefreshTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

const CLOTHING_SIZE_VALUES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);
const SHOE_SIZE_PATTERN = /^(3[5-9]|4[0-4])$/;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

function getExpiresAt(seconds: unknown) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Date(Date.now() + value * 1000);
}

function shouldRefreshAccessToken(expiresAt: Date | null | undefined) {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() <= TOKEN_REFRESH_BUFFER_MS;
}

async function refreshShopifyToken(params: {
  userId: string;
  shopDomain: string;
  refreshToken: string;
}) {
  const tokenRes = await fetch(
    `https://${params.shopDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: getShopifyClientId(),
        client_secret: process.env.SHOPIFY_API_SECRET,
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
      }),
      cache: "no-store",
    }
  );

  const tokenData = (await tokenRes.json().catch(() => null)) as
    | ShopifyRefreshTokenResponse
    | null;

  if (!tokenRes.ok || !tokenData?.access_token || !tokenData.refresh_token) {
    console.error("Shopify token refresh error", {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      body: tokenData,
      shopDomain: params.shopDomain,
    });
    throw new Error("Volvé a conectar Shopify para renovar los permisos");
  }

  await prisma.shopifyConnection.update({
    where: { userId: params.userId },
    data: {
      accessToken: encryptShopifyToken(tokenData.access_token),
      accessTokenExpiresAt: getExpiresAt(tokenData.expires_in),
      refreshToken: encryptShopifyToken(tokenData.refresh_token),
      refreshTokenExpiresAt: getExpiresAt(tokenData.refresh_token_expires_in),
    },
  });

  return tokenData.access_token;
}

function stripHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapCategory(product: ShopifyProduct) {
  const source = `${product.product_type ?? ""} ${product.title ?? ""}`.toLowerCase();

  if (/(ropa|camisa|remera|pantal[oó]n|vestido|buzo|hoodie|jacket|shirt|dress)/.test(source)) {
    return "CLOTHING";
  }

  if (/(calzado|zapato|zapatilla|sneaker|shoe|boot|sandalia)/.test(source)) {
    return "SHOES";
  }

  if (/(accesorio|accessory|bolso|cartera|mochila|reloj|gorro|cap)/.test(source)) {
    return "ACCESSORIES";
  }

  if (/(belleza|beauty|skin|makeup|cosmetic|perfume)/.test(source)) {
    return "BEAUTY";
  }

  if (/(hogar|home|deco|decor|furniture|mueble)/.test(source)) {
    return "HOME";
  }

  if (/(digital|curso|ebook|software|download)/.test(source)) {
    return "DIGITAL";
  }

  return "OTHER";
}

function getVariantSizes(product: ShopifyProduct, category: string) {
  if (category !== "CLOTHING" && category !== "SHOES") return [];

  const values = (product.variants ?? [])
    .flatMap((variant) => [variant.option1, variant.option2, variant.option3])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  const sizes = values.filter((value) =>
    category === "CLOTHING"
      ? CLOTHING_SIZE_VALUES.has(value)
      : SHOE_SIZE_PATTERN.test(value)
  );

  return Array.from(new Set(sizes)).slice(0, 20);
}

function getPrice(product: ShopifyProduct) {
  const prices = (product.variants ?? [])
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) return null;

  return Math.round(Math.min(...prices));
}

function getStock(product: ShopifyProduct) {
  return (product.variants ?? []).reduce((total, variant) => {
    const quantity = Number(variant.inventory_quantity ?? 0);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);
}

function getPrimaryVariant(product: ShopifyProduct) {
  return (product.variants ?? []).find((variant) => variant.id) ?? null;
}

function getShopifyVariantMetadata(product: ShopifyProduct) {
  return (product.variants ?? [])
    .filter((variant) => variant.id)
    .map((variant) => ({
      id: String(variant.id),
      option1: variant.option1 ?? null,
      option2: variant.option2 ?? null,
      option3: variant.option3 ?? null,
    }));
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    if (!isShopifyEnabledForEmail(user.email)) {
      return NextResponse.json(
        { ok: false, error: "Shopify no esta habilitado para esta cuenta" },
        { status: 404 }
      );
    }

    const body = await req.json();
    let shopDomain = normalizeShopDomain(body.shopDomain);
    let accessToken = String(body.accessToken ?? "").trim();
    const commissionValue = Number(body.commissionValue ?? 10);
    const demoMode = Boolean(body.demoMode);
    const canUseDemoImports = process.env.ENABLE_DEMO_IMPORTS === "true";

    if (!Number.isFinite(commissionValue) || commissionValue <= 0 || commissionValue > 100) {
      return NextResponse.json(
        { ok: false, error: "Comision invalida" },
        { status: 400 }
      );
    }

    if (demoMode && !canUseDemoImports) {
      return NextResponse.json(
        { ok: false, error: "Importacion demo deshabilitada" },
        { status: 403 }
      );
    }

    const sellerSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        platformCommissionValue: true,
        platformCommissionType: true,
      },
    });

    if (!sellerSettings) {
      return NextResponse.json(
        { ok: false, error: "Vendedor no encontrado" },
        { status: 404 }
      );
    }

    if (demoMode) {
      const existingProducts = await prisma.product.findMany({
        where: { sellerId: user.id },
        select: { name: true },
      });
      const existingNames = new Set(
        existingProducts.map((product) => product.name.trim().toLowerCase())
      );

      let imported = 0;
      let skipped = 0;

      for (const product of demoShopifyProducts) {
        if (existingNames.has(product.name.toLowerCase())) {
          skipped += 1;
          continue;
        }

        await prisma.product.create({
          data: {
            sellerId: user.id,
            ...product,
            commissionValue,
            commissionType: "PERCENT",
            platformCommissionValue: sellerSettings.platformCommissionValue,
            platformCommissionType: sellerSettings.platformCommissionType,
          },
        });

        existingNames.add(product.name.toLowerCase());
        imported += 1;
      }

      revalidateTag("products", "max");
      revalidateTag("campaigns", "max");
      revalidateTag("stores", "max");
      revalidatePath("/products");
      revalidatePath("/campaigns");
      revalidatePath("/store");
      revalidatePath("/seller/products");

      return NextResponse.json({ ok: true, imported, skipped });
    }

    if (!accessToken) {
      const connection = await prisma.shopifyConnection.findUnique({
        where: { userId: user.id },
        select: {
          shopDomain: true,
          accessToken: true,
          accessTokenExpiresAt: true,
          refreshToken: true,
          refreshTokenExpiresAt: true,
        },
      });

      if (connection) {
        shopDomain = connection.shopDomain;
        accessToken = decryptShopifyToken(connection.accessToken);

        if (shouldRefreshAccessToken(connection.accessTokenExpiresAt)) {
          if (
            !connection.refreshToken ||
            (connection.refreshTokenExpiresAt &&
              connection.refreshTokenExpiresAt.getTime() <= Date.now())
          ) {
            return NextResponse.json(
              { ok: false, error: "Volvé a conectar Shopify para renovar los permisos" },
              { status: 401 }
            );
          }

          accessToken = await refreshShopifyToken({
            userId: user.id,
            shopDomain: connection.shopDomain,
            refreshToken: decryptShopifyToken(connection.refreshToken),
          });
        }
      }
    }

    if (!shopDomain) {
      return NextResponse.json(
        { ok: false, error: "Conecta una tienda Shopify antes de importar" },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Conecta una tienda Shopify antes de importar" },
        { status: 400 }
      );
    }

    const shopifyRes = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!shopifyRes.ok) {
      const shopifyErrorBody = await shopifyRes.text().catch(() => "");
      console.error("Shopify import error", {
        status: shopifyRes.status,
        statusText: shopifyRes.statusText,
        body: shopifyErrorBody,
        shopDomain,
      });

      return NextResponse.json(
        {
          ok: false,
          error: `Shopify rechazo la conexion o el token (${shopifyRes.status})`,
        },
        { status: shopifyRes.status === 401 ? 401 : 400 }
      );
    }

    const shopifyData = (await shopifyRes.json()) as ShopifyProductsResponse;
    const shopifyProducts = Array.isArray(shopifyData.products) ? shopifyData.products : [];
    const existingProducts = await prisma.product.findMany({
      where: { sellerId: user.id },
      select: { id: true, name: true },
    });
    const existingByName = new Map(
      existingProducts.map((product) => [product.name.trim().toLowerCase(), product])
    );

    let imported = 0;
    let skipped = 0;

    for (const shopifyProduct of shopifyProducts) {
      const name = String(shopifyProduct.title ?? "").trim();
      const price = getPrice(shopifyProduct);

      if (!name || !price) {
        skipped += 1;
        continue;
      }

      const category = mapCategory(shopifyProduct);
      const primaryVariant = getPrimaryVariant(shopifyProduct);
      const shopifyVariants = getShopifyVariantMetadata(shopifyProduct);
      const existingProduct = existingByName.get(name.toLowerCase());

      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            shopifyShopDomain: shopDomain,
            shopifyProductId: String(shopifyProduct.id),
            shopifyVariantId: primaryVariant?.id ? String(primaryVariant.id) : null,
            shopifyVariants: shopifyVariants.length ? shopifyVariants : Prisma.JsonNull,
          },
        });
        skipped += 1;
        continue;
      }

      await prisma.product.create({
        data: {
          sellerId: user.id,
          name: name.slice(0, 140),
          desc: stripHtml(shopifyProduct.body_html) || null,
          price,
          stock: getStock(shopifyProduct),
          category,
          sizes: getVariantSizes(shopifyProduct, category),
          commissionValue,
          commissionType: "PERCENT",
          platformCommissionValue: sellerSettings.platformCommissionValue,
          platformCommissionType: sellerSettings.platformCommissionType,
          shopifyShopDomain: shopDomain,
          shopifyProductId: String(shopifyProduct.id),
          shopifyVariantId: primaryVariant?.id ? String(primaryVariant.id) : null,
          shopifyVariants: shopifyVariants.length ? shopifyVariants : Prisma.JsonNull,
          imageUrls: (shopifyProduct.images ?? [])
            .map((image) => image.src?.trim())
            .filter((src): src is string => Boolean(src))
            .slice(0, 8),
          isActive: shopifyProduct.status === "active",
        },
      });

      existingByName.set(name.toLowerCase(), { id: "", name });
      imported += 1;
    }

    revalidateTag("products", "max");
    revalidateTag("campaigns", "max");
    revalidateTag("stores", "max");
    revalidatePath("/products");
    revalidatePath("/campaigns");
    revalidatePath("/store");
    revalidatePath("/seller/products");

    return NextResponse.json({ ok: true, imported, skipped });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
