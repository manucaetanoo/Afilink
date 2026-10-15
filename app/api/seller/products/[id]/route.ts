import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { normalizeProductImageUrls } from "@/lib/product-images";
import { normalizeProductDigitalAccessType } from "@/lib/product-access";
import { normalizeProductCategory } from "@/lib/product-categories";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const { id } = await params;
    const body = await req.json();

    const data: {
      name?: string;
      desc?: string | null;
      category?: string;
      digitalAccessInstructions?: string | null;
      digitalAccessType?: ReturnType<typeof normalizeProductDigitalAccessType>;
      price?: number;
      isActive?: boolean;
      commissionValue?: number;
      commissionType?: "PERCENT";
      imageUrls?: string[];
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (name.length < 3) {
        return NextResponse.json(
          { ok: false, error: "Nombre muy corto" },
          { status: 400 }
        );
      }

      data.name = name;
    }

    if (body.desc !== undefined) data.desc = String(body.desc).trim() || null;
    if (body.category !== undefined) {
      const category = normalizeProductCategory(body.category);
      if (!category) {
        return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
      }
      data.category = category;
    }

    if (body.digitalAccessInstructions !== undefined) {
      data.digitalAccessInstructions =
        String(body.digitalAccessInstructions).trim() || null;
    }

    if (body.digitalAccessType !== undefined) {
      data.digitalAccessType = normalizeProductDigitalAccessType(
        body.digitalAccessType
      );
    }

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isInteger(price) || price <= 0) {
        return NextResponse.json(
          { ok: false, error: "Precio invalido" },
          { status: 400 }
        );
      }

      data.price = price;
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (body.commissionValue !== undefined) {
      const commissionValue = Number(body.commissionValue);

      if (!Number.isInteger(commissionValue) || commissionValue <= 0 || commissionValue > 100) {
        return NextResponse.json(
          { ok: false, error: "Comision invalida" },
          { status: 400 }
        );
      }

      data.commissionValue = commissionValue;
      data.commissionType = "PERCENT";
    }

    if (body.commissionType !== undefined) {
      const commissionType = String(body.commissionType).trim().toUpperCase();

      if (commissionType !== "PERCENT") {
        return NextResponse.json(
          { ok: false, error: "La comision debe ser por porcentaje" },
          { status: 400 }
        );
      }

      data.commissionType = "PERCENT";
    }

    if (body.imageUrls !== undefined) {
      data.imageUrls = normalizeProductImageUrls(body.imageUrls).slice(0, 1);
    }

    const where = user.role === "ADMIN" ? { id } : { id, sellerId: user.id };

    const updated = await prisma.product.update({
      where,
      data,
      select: {
        id: true,
        name: true,
        desc: true,
        category: true,
        digitalAccessInstructions: true,
        digitalAccessType: true,
        price: true,
        isActive: true,
        commissionValue: true,
        commissionType: true,
        sellerId: true,
        imageUrls: true,
        updatedAt: true,
      },
    });

    revalidateTag("products", "max");
    revalidateTag("campaigns", "max");
    revalidateTag("stores", "max");
    revalidatePath("/products");
    revalidatePath(`/products/${updated.id}`);

    return NextResponse.json({ ok: true, product: updated });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const { id } = await params;
    const where = user.role === "ADMIN" ? { id } : { id, sellerId: user.id };

    const product = await prisma.product.findFirst({
      where,
      select: {
        id: true,
        _count: {
          select: {
            orders: true,
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    if (product._count.orders > 0 || product._count.orderItems > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se puede eliminar un producto con ordenes registradas. Desactivalo para ocultarlo sin perder el historial.",
        },
        { status: 409 }
      );
    }

    await prisma.product.delete({
      where: { id: product.id },
    });

    revalidateTag("products", "max");
    revalidateTag("campaigns", "max");
    revalidateTag("stores", "max");
    revalidatePath("/products");
    revalidatePath(`/products/${product.id}`);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
