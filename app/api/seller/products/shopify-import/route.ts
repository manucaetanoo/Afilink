import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { demoShopifyProducts } from "@/lib/demo-import-products";
import { prisma } from "@/lib/prisma";

type ShopifyImage = {
  src?: string;
};

type ShopifyVariant = {
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

const SHOPIFY_API_VERSION = "2025-10";
const CLOTHING_SIZE_VALUES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);
const SHOE_SIZE_PATTERN = /^(3[5-9]|4[0-4])$/;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

function normalizeShopDomain(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(raw)) {
    return null;
  }

  return raw;
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

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const body = await req.json();
    const shopDomain = normalizeShopDomain(body.shopDomain);
    const accessToken = String(body.accessToken ?? "").trim();
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

    if (!shopDomain) {
      return NextResponse.json(
        { ok: false, error: "Dominio de Shopify invalido" },
        { status: 400 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Access token de Shopify requerido" },
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
      return NextResponse.json(
        { ok: false, error: "Shopify rechazo la conexion o el token" },
        { status: shopifyRes.status === 401 ? 401 : 400 }
      );
    }

    const shopifyData = (await shopifyRes.json()) as ShopifyProductsResponse;
    const shopifyProducts = Array.isArray(shopifyData.products) ? shopifyData.products : [];
    const existingProducts = await prisma.product.findMany({
      where: { sellerId: user.id },
      select: { name: true },
    });
    const existingNames = new Set(
      existingProducts.map((product) => product.name.trim().toLowerCase())
    );

    let imported = 0;
    let skipped = 0;

    for (const shopifyProduct of shopifyProducts) {
      const name = String(shopifyProduct.title ?? "").trim();
      const price = getPrice(shopifyProduct);

      if (!name || !price || existingNames.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }

      const category = mapCategory(shopifyProduct);

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
          imageUrls: (shopifyProduct.images ?? [])
            .map((image) => image.src?.trim())
            .filter((src): src is string => Boolean(src))
            .slice(0, 8),
          isActive: shopifyProduct.status === "active",
        },
      });

      existingNames.add(name.toLowerCase());
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
