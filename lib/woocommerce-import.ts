import { Prisma, ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createWooCommerceClient,
  decryptWooCommerceSecret,
  getWooCommercePrice,
  getWooCommerceStock,
  getWooCommerceVariantMetadata,
  stripWooCommerceHtml,
  type WooCommerceProduct,
  type WooCommerceVariation,
} from "@/lib/woocommerce";

const CLOTHING_SIZE_VALUES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);
const SHOE_SIZE_PATTERN = /^(3[5-9]|4[0-4])$/;

function mapCategory(product: WooCommerceProduct) {
  const source = [
    product.name,
    ...(product.categories ?? []).map((category) => category.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(ropa|camisa|remera|pantal[oó]n|vestido|buzo|hoodie|shirt|dress)/.test(source)) {
    return ProductCategory.CLOTHING;
  }

  if (/(calzado|zapato|zapatilla|sneaker|shoe|boot|sandalia)/.test(source)) {
    return ProductCategory.SHOES;
  }

  if (/(accesorio|accessory|bolso|cartera|mochila|reloj|gorro|cap)/.test(source)) {
    return ProductCategory.ACCESSORIES;
  }

  if (/(belleza|beauty|skin|makeup|cosmetic|perfume)/.test(source)) {
    return ProductCategory.BEAUTY;
  }

  if (/(hogar|home|deco|decor|furniture|mueble)/.test(source)) {
    return ProductCategory.HOME;
  }

  if (/(digital|curso|ebook|software|download)/.test(source)) {
    return ProductCategory.DIGITAL;
  }

  return ProductCategory.OTHER;
}

function getVariantSizes(variations: WooCommerceVariation[], category: ProductCategory) {
  if (category !== ProductCategory.CLOTHING && category !== ProductCategory.SHOES) {
    return [];
  }

  const values = variations
    .flatMap((variation) => variation.attributes ?? [])
    .map((attribute) => attribute.option?.trim().toUpperCase())
    .filter((value): value is string => Boolean(value));

  return Array.from(
    new Set(
      values.filter((value) =>
        category === ProductCategory.CLOTHING
          ? CLOTHING_SIZE_VALUES.has(value)
          : SHOE_SIZE_PATTERN.test(value)
      )
    )
  ).slice(0, 20);
}

function getProductPrice(product: WooCommerceProduct, variations: WooCommerceVariation[]) {
  const variationPrices = variations
    .map(getWooCommercePrice)
    .filter(
      (price): price is number =>
        price !== null && Number.isFinite(price) && price > 0
    );

  if (variationPrices.length > 0) return Math.min(...variationPrices);
  return getWooCommercePrice(product);
}

function getProductStock(product: WooCommerceProduct, variations: WooCommerceVariation[]) {
  if (variations.length > 0) {
    return variations.reduce((sum, variation) => sum + getWooCommerceStock(variation), 0);
  }

  return getWooCommerceStock(product);
}

export async function importWooCommerceProductsForSeller({
  sellerId,
  commissionValue,
}: {
  sellerId: string;
  commissionValue: number;
}) {
  if (!Number.isFinite(commissionValue) || commissionValue <= 0 || commissionValue > 100) {
    throw new Error("Comision invalida");
  }

  const [connection, sellerSettings] = await Promise.all([
    prisma.wooCommerceConnection.findUnique({
      where: { userId: sellerId },
      select: {
        storeUrl: true,
        consumerKey: true,
        consumerSecret: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        platformCommissionValue: true,
        platformCommissionType: true,
      },
    }),
  ]);

  if (!connection) {
    throw new Error("Conecta WooCommerce antes de importar");
  }

  if (!sellerSettings) {
    throw new Error("Vendedor no encontrado");
  }

  const client = createWooCommerceClient({
    storeUrl: connection.storeUrl,
    consumerKey: decryptWooCommerceSecret(connection.consumerKey),
    consumerSecret: decryptWooCommerceSecret(connection.consumerSecret),
  });

  const wooProducts = await client.request<WooCommerceProduct[]>(
    "products?per_page=100&status=publish"
  );

  const existingProducts = await prisma.product.findMany({
    where: { sellerId },
    select: { id: true, name: true },
  });
  const existingByName = new Map(
    existingProducts.map((product) => [product.name.trim().toLowerCase(), product])
  );

  let imported = 0;
  let skipped = 0;

  for (const wooProduct of wooProducts) {
    const name = String(wooProduct.name ?? "").trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const variations = wooProduct.variations?.length
      ? await client.request<WooCommerceVariation[]>(
          `products/${wooProduct.id}/variations?per_page=100`
        )
      : [];
    const price = getProductPrice(wooProduct, variations);

    if (!price) {
      skipped += 1;
      continue;
    }

    const category = mapCategory(wooProduct);
    const primaryVariation = variations.find((variation) => variation.id) ?? null;
    const wooCommerceVariants = getWooCommerceVariantMetadata(variations);
    const existingProduct = existingByName.get(name.toLowerCase());
    const externalData = {
      wooCommerceStoreUrl: client.storeUrl,
      wooCommerceProductId: String(wooProduct.id),
      wooCommerceVariationId: primaryVariation?.id
        ? String(primaryVariation.id)
        : null,
      wooCommerceVariants: wooCommerceVariants.length
        ? wooCommerceVariants
        : Prisma.JsonNull,
    };

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: externalData,
      });
      skipped += 1;
      continue;
    }

    await prisma.product.create({
      data: {
        sellerId,
        name: name.slice(0, 140),
        desc:
          stripWooCommerceHtml(
            wooProduct.description || wooProduct.short_description
          ) || null,
        price,
        stock: getProductStock(wooProduct, variations),
        category,
        sizes: getVariantSizes(variations, category),
        commissionValue,
        commissionType: "PERCENT",
        platformCommissionValue: sellerSettings.platformCommissionValue,
        platformCommissionType: sellerSettings.platformCommissionType,
        imageUrls: (wooProduct.images ?? [])
          .map((image) => image.src?.trim())
          .filter((src): src is string => Boolean(src))
          .slice(0, 8),
        isActive: wooProduct.status === "publish",
        ...externalData,
      },
    });

    existingByName.set(name.toLowerCase(), { id: "", name });
    imported += 1;
  }

  return { imported, skipped };
}

