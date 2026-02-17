import { NextResponse } from "next/server";   // Utilidad de Next.js para responder en formato JSON
import { prisma } from "@/lib/prisma";        // Cliente Prisma para interactuar con la base de datos
import { requireUser, requireRole } from "@/lib/auth"; // Helpers de autenticación/autorización

// Handler para la ruta PATCH /api/seller/products/[id]
// Sirve para editar un producto existente
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    // 1. Obtener el usuario logueado
    const user = await requireUser();

    // 2. Validar que el usuario tenga rol SELLER o ADMIN
    requireRole(user, ["SELLER", "ADMIN"]);

    // 3. Parsear el body JSON de la petición
    const body = await req.json();

    // 4. Construir objeto "data" con los campos a actualizar
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name).trim(); // si viene "name", lo guarda limpio
    if (body.desc !== undefined) data.desc = String(body.desc).trim() || null; // si viene "desc", lo guarda o null
    if (body.price !== undefined) {
      const price = Number(body.price);
      // Validar que el precio sea entero y mayor a 0
      if (!Number.isInteger(price) || price <= 0) {
        return NextResponse.json({ ok: false, error: "Precio inválido" }, { status: 400 });
      }
      data.price = price;
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive); // activar/desactivar producto

    // 5. Condición de ownership:
    // - Si es ADMIN, puede editar cualquier producto (solo filtra por id)
    // - Si es SELLER, solo puede editar productos que le pertenecen (id + sellerId)
    const where = user.role === "ADMIN" ? { id: params.id } : { id: params.id, sellerId: user.id };

    // 6. Ejecutar actualización en la base de datos
    const updated = await prisma.product.update({
      where,   // filtro según rol
      data,    // campos a actualizar
      select: {id: true, name: true, desc: true, price: true, isActive: true, commissionValue: true, commissionType: true,  sellerId: true, imageUrls:true }, // solo devuelve el id del producto actualizado
    });

    // 7. Responder con éxito y el id del producto actualizado
    return NextResponse.json({ ok: true, product:updated });
  } catch (e: any) {
    // 8. Manejo de errores
    const msg = e?.message || "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
