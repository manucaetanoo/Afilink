

import { prisma } from "@/lib/prisma";
import { BuyButton } from "../../../components/BuyButton";
import Navbar from "../../../components/Navbarv2"
import GetAffiliateLinkButton from "@/components/GetAffiliateLinkButton"
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ProductGallery from "@/components/ProductGallery";
import Link from "next/link";



export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;


  const product = await prisma.product.findUnique({
    where: { id },
  });

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return <div>No estás logueado</div>;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });

  if (!user) return <div>Usuario no encontrado</div>;


  if (!product) return <div>Producto no encontrado</div>;

  if (!user) return <div>Usuario no encontrado</div>;

  return (
    <div className="">
      <div className="mb-13">
        <Navbar />
      </div>

      <div className="lg:max-w-6xl max-w-xl mx-auto">
        <div className="grid items-start grid-cols-1 lg:grid-cols-2 gap-8 max-lg:gap-12 max-sm:gap-8">
          {/* Galería de imágenes */}
          <div>
            <ProductGallery product={product} />
          </div>

          {/* Información del producto */}
          <div className="w-full">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                {product.name}
              </h3>
              <p className="text-slate-500 mt-2 text-sm">
                {product.desc}
              </p>
              <div className="flex items-center flex-wrap gap-4 mt-6">
                <h4 className="text-slate-900 text-2xl sm:text-3xl font-semibold">
                  ${product.price}

                </h4>
                {/*  
                <p className="text-slate-500 text-lg">
                  <del>$16</del>
                  <span className="text-sm ml-1.5">Tax included</span>
                </p>
                */}
              </div>
            </div>

            {/* Botones */}
            <div className="mt-6 block  gap-4">

              {/*<BuyButton productId={product.id} />*/}
                  <Link href={`/checkout?productId=${product.id}`}>
              <button
              type="button" 
              className="px-15 py-3 w-[45%] sm:w-auto rounded-md bg-orange-600 
text-white font-medium tracking-wide shadow-md 
hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 
transition-colors duration-200">
                Comprar
              </button>
              </Link>
              <button
                type="button"
                className="ml-4 px-4 py-3 w-[45%] cursor-pointer border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium"
              >
                Añadir al carrito

              </button>


              {user?.role === "AFFILIATE" && (<> <GetAffiliateLinkButton productId={product.id} affiliateId={user.id} />
                <p className="mt-5 text-lg font-semibold text-red-700 bg-orange-50 border-l-4 border-red-600 px-4 py-3 rounded-md shadow-md"> Actualmente este producto tiene un {product.commissionValue}% de comisión
                </p> </>)}
            </div>

            {/* Talles */}
            <hr className="my-6 border-slate-300" />
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                Talles
              </h3>
              <div className="flex flex-wrap gap-4 mt-4">
                {["XS", "S", "L", "M", "XL"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="w-10 h-9 border border-slate-300 hover:border-purple-600 text-sm flex items-center justify-center"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery 
            <hr className="my-6 border-slate-300" />
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                Select Delivery Location
              </h3>
              <p className="text-slate-500 text-sm mt-2">
                Enter the pincode of your area to check product availability.
              </p>
              <div className="flex items-center gap-2 mt-6 max-w-sm">
                <input
                  type="number"
                  placeholder="Enter pincode"
                  className="bg-slate-100 px-4 py-2.5 text-sm w-full border-0 outline-0"
                />
                <button
                  type="button"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-sm"
                >
                  Apply
                </button>
              </div>
            </div>
            */}

            {/* Reviews */}
            <hr className="my-6 border-slate-300" />
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                Customer Reviews
              </h3>
              <div className="flex items-start mt-6">
                <img
                  src="https://readymadeui.com/team-2.webp"
                  className="w-12 h-12 rounded-full border-2 border-white"
                  alt="Reviewer"
                />
                <div className="ml-3">
                  <h4 className="text-slate-900 text-sm font-semibold">
                    John Doe
                  </h4>
                  <p className="text-sm text-slate-500 mt-4">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </p>
                </div>
              </div>
              <a
                href="#"
                className="block text-purple-600 hover:underline text-sm mt-6 font-semibold"
              >
                Read all reviews
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

