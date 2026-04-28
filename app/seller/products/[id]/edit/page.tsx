import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ProductEditForm from "@/components/ProductEditForm";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const product = await prisma.product.findFirst({
    where:
      session.user.role === "ADMIN"
        ? { id }
        : { id, sellerId: session.user.id },
    select: {
      id: true,
      name: true,
      desc: true,
      price: true,
      category: true,
      sizes: true,
      imageUrls: true,
      isActive: true,
      commissionValue: true,
      commissionType: true,
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <div className="flex min-h-screen pt-16">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
              <Link
                href="/seller/products"
                className="text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                Volver a productos
              </Link>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Editar producto
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Ajusta informacion, precio, talles, estado y comision.
              </p>
            </div>

            <ProductEditForm product={product} />
          </div>
        </main>
      </div>
    </div>
  );
}
