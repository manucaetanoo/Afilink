import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { ProductCategory } from "@prisma/client";
import { requireRole, requireUser } from "@/lib/auth";
import { demoFenicioProducts } from "@/lib/demo-import-products";
import { prisma } from "@/lib/prisma";

type FenicioItem = {
  productCode: string;
  productName: string;
  description: string;
  productType: string;
  price: number | null;
  availability: string;
  sizeName: string;
  sampleImage: string;
  images: string[];
};

type FenicioProduct = {
  name: string;
  desc: string;
  category: ProductCategory;
  price: number;
  stock: number;
  sizes: string[];
  imageUrls: string[];
  isActive: boolean;
};

const CLOTHING_SIZE_VALUES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);
const SHOE_SIZE_PATTERN = /^(3[5-9]|4[0-4])$/;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

function normalizeDomain(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(raw)) return null;

  return raw;
}

function cleanText(value: string) {
  return decodeXml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getTagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanText(match[1]) : "";
}

function getImages(xml: string) {
  const imagesMatch = xml.match(/<images>([\s\S]*?)<\/images>/i);
  if (!imagesMatch) return [];

  return Array.from(imagesMatch[1].matchAll(/<link>([\s\S]*?)<\/link>/gi))
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function parsePrice(value: string) {
  const match = value.match(/[\d.,]+/);
  if (!match) return null;

  const normalized = match[0].replace(/\./g, "").replace(",", ".");
  const price = Number(normalized);

  return Number.isFinite(price) && price > 0 ? Math.round(price) : null;
}

function mapCategory(productType: string) {
  const source = productType.toLowerCase();

  if (/(ropa|vestimenta|camisa|remera|pantal[oó]n|vestido|buzo|campera)/.test(source)) {
    return ProductCategory.CLOTHING;
  }

  if (/(calzado|zapato|zapatilla|sneaker|bota|sandalia)/.test(source)) {
    return ProductCategory.SHOES;
  }

  if (/(accesorio|bolso|cartera|mochila|reloj|gorro)/.test(source)) {
    return ProductCategory.ACCESSORIES;
  }

  if (/(belleza|cosmetica|cosm[eé]tica|perfume|maquillaje)/.test(source)) {
    return ProductCategory.BEAUTY;
  }

  if (/(hogar|decoraci[oó]n|mueble|cocina|jardin|jard[ií]n)/.test(source)) {
    return ProductCategory.HOME;
  }

  if (/(digital|curso|ebook|software|workshop)/.test(source)) {
    return ProductCategory.DIGITAL;
  }

  return ProductCategory.OTHER;
}

function normalizeSize(value: string, category: ProductCategory) {
  const size = value.trim().toUpperCase();

  if (!size || size === "TALLE UNICO" || size === "UNICO" || size === "U") return null;

  if (category === ProductCategory.CLOTHING && CLOTHING_SIZE_VALUES.has(size)) return size;
  if (category === ProductCategory.SHOES && SHOE_SIZE_PATTERN.test(size)) return size;

  return null;
}

function parseFenicioItems(xml: string) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map((match) => {
    const itemXml = match[1];

    return {
      productCode: getTagValue(itemXml, "productCode"),
      productName: getTagValue(itemXml, "productName") || getTagValue(itemXml, "name"),
      description: getTagValue(itemXml, "description"),
      productType: getTagValue(itemXml, "productType"),
      price: parsePrice(getTagValue(itemXml, "salePrice") || getTagValue(itemXml, "price")),
      availability: getTagValue(itemXml, "availability"),
      sizeName: getTagValue(itemXml, "sizeName"),
      sampleImage: getTagValue(itemXml, "sampleImage"),
      images: getImages(itemXml),
    };
  });
}

function groupFenicioProducts(items: FenicioItem[]) {
  const grouped = new Map<string, FenicioProduct>();

  for (const item of items) {
    if (!item.productName || !item.price) continue;

    const key = item.productCode || item.productName;
    const category = mapCategory(item.productType);
    const current =
      grouped.get(key) ??
      ({
        name: item.productName,
        desc: item.description,
        category,
        price: item.price,
        stock: 0,
        sizes: [],
        imageUrls: [],
        isActive: false,
      } satisfies FenicioProduct);

    current.price = Math.min(current.price, item.price);
    current.isActive = current.isActive || item.availability.toUpperCase() === "IN_STOCK";

    if (item.availability.toUpperCase() === "IN_STOCK") {
      current.stock += 1;
    }

    const size = normalizeSize(item.sizeName, category);
    if (size && !current.sizes.includes(size)) {
      current.sizes.push(size);
    }

    for (const imageUrl of [item.sampleImage, ...item.images]) {
      if (imageUrl && !current.imageUrls.includes(imageUrl)) {
        current.imageUrls.push(imageUrl);
      }
    }

    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((product) => ({
    ...product,
    stock: product.stock || (product.isActive ? 1 : 0),
    sizes: product.sizes.slice(0, 20),
    imageUrls: product.imageUrls.slice(0, 8),
  }));
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const body = await req.json();
    const storeDomain = normalizeDomain(body.storeDomain);
    const commerceCode = String(body.commerceCode ?? "").trim();
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

      for (const product of demoFenicioProducts) {
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

    if (!storeDomain) {
      return NextResponse.json(
        { ok: false, error: "Dominio de Fenicio invalido" },
        { status: 400 }
      );
    }

    if (!commerceCode) {
      return NextResponse.json(
        { ok: false, error: "Codigo de comercio requerido" },
        { status: 400 }
      );
    }

    const feedRes = await fetch(
      `https://${storeDomain}/feeds/productos/${encodeURIComponent(commerceCode)}/fenicio`,
      { cache: "no-store" }
    );

    if (!feedRes.ok) {
      return NextResponse.json(
        { ok: false, error: "No se pudo leer el feed de Fenicio" },
        { status: 400 }
      );
    }

    const feedXml = await feedRes.text();
    const products = groupFenicioProducts(parseFenicioItems(feedXml));
    const existingProducts = await prisma.product.findMany({
      where: { sellerId: user.id },
      select: { name: true },
    });
    const existingNames = new Set(
      existingProducts.map((product) => product.name.trim().toLowerCase())
    );

    let imported = 0;
    let skipped = 0;

    for (const product of products) {
      if (existingNames.has(product.name.toLowerCase())) {
        skipped += 1;
        continue;
      }

      await prisma.product.create({
        data: {
          sellerId: user.id,
          name: product.name.slice(0, 140),
          desc: product.desc || null,
          price: product.price,
          stock: product.stock,
          category: product.category,
          sizes:
            product.category === ProductCategory.CLOTHING ||
            product.category === ProductCategory.SHOES
              ? product.sizes
              : [],
          imageUrls: product.imageUrls,
          isActive: product.isActive,
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
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
