import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { importWooCommerceProductsForSeller } from "@/lib/woocommerce-import";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

function revalidateProductSurfaces() {
  revalidateTag("products", "max");
  revalidateTag("campaigns", "max");
  revalidateTag("stores", "max");
  revalidatePath("/products");
  revalidatePath("/campaigns");
  revalidatePath("/store");
  revalidatePath("/seller/products");
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const commissionValue = Number(body?.commissionValue ?? 10);
    const result = await importWooCommerceProductsForSeller({
      sellerId: user.id,
      commissionValue,
    });

    revalidateProductSurfaces();

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const msg = getErrorMessage(error);
    const status =
      msg === "UNAUTHORIZED"
        ? 401
        : msg === "Debes tener rol de vendedor"
          ? 403
          : msg === "Vendedor no encontrado"
            ? 404
            : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

