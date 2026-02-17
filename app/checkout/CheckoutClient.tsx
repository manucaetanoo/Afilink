"use client";

import React from "react";
import { BuyButton } from "@/components/BuyButton";

type ProductLite = {
  id: string;
  name: string;
  price: number;
  desc: string | null;
  commissionValue: number | null;
  imageUrls: string[];
} | null;

export default function CheckoutClient({ product }: { product: ProductLite }) {
  const shipping = 6;
  const tax = 5;
  const subtotal = product?.price ?? 0;
  const total = subtotal + shipping + tax;

  return (
    <div className="bg-white">
      <div className="flex max-md:flex-col gap-12 max-lg:gap-4 h-full">
        {/* LEFT: Summary / sticky */}
        <div className="bg-gray-100 md:h-screen md:sticky md:top-0 md:min-w-[370px]">
          <div className="relative h-full">
            <div className="px-6 py-8 md:overflow-auto md:h-screen">
              <div className="space-y-4">
                {!product ? (
                  <div className="rounded-md bg-white p-4 border border-gray-200">
                    <p className="text-sm text-slate-700 font-medium">
                      No hay producto seleccionado.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Entrá a checkout con <span className="font-mono">?productId=...</span>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 flex p-3 shrink-0 bg-white rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.imageUrls?.[0] ?? "https://readymadeui.com/images/product14.webp"}
                        className="w-full object-contain"
                        alt={product.name}
                      />
                    </div>

                    <div className="w-full">
                      <h3 className="text-sm text-slate-900 font-semibold">
                        {product.name}
                      </h3>
                      <ul className="text-xs text-slate-900 space-y-2 mt-3">
                        <li className="flex flex-wrap gap-4">
                          Quantity <span className="ml-auto">1</span>
                        </li>
                        <li className="flex flex-wrap gap-4">
                          Total Price{" "}
                          <span className="ml-auto font-semibold">${product.price}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-gray-300 my-8" />

              <div>
                <ul className="text-slate-500 font-medium space-y-4">
                  <li className="flex flex-wrap gap-4 text-sm">
                    Subtotal{" "}
                    <span className="ml-auto font-semibold text-slate-900">
                      ${subtotal.toFixed(2)}
                    </span>
                  </li>
                  <li className="flex flex-wrap gap-4 text-sm">
                    Shipping{" "}
                    <span className="ml-auto font-semibold text-slate-900">
                      ${shipping.toFixed(2)}
                    </span>
                  </li>
                  <li className="flex flex-wrap gap-4 text-sm">
                    Tax{" "}
                    <span className="ml-auto font-semibold text-slate-900">
                      ${tax.toFixed(2)}
                    </span>
                  </li>
                  <hr className="border-slate-300" />
                  <li className="flex flex-wrap gap-4 text-[15px] font-semibold text-slate-900">
                    Total <span className="ml-auto">${total.toFixed(2)}</span>
                  </li>
                </ul>

                <div className="mt-8 space-y-3">
                  {product ? (
                    <BuyButton productId={product.id} />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-md px-4 py-2.5 w-full text-sm font-medium tracking-wide bg-slate-300 text-white cursor-not-allowed"
                    >
                      Completar compra
                    </button>
                  )}

                  <button
                    type="button"
                    className="rounded-md px-4 py-2.5 w-full text-sm font-medium tracking-wide bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    onClick={() => console.log("Complete Purchase")}
                  >
                    Completar compra
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div className="max-w-4xl w-full h-max rounded-md px-4 py-8 max-md:-order-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              console.log("submit");
            }}
          >
            <div>
              <h2 className="text-xl text-slate-900 font-semibold mb-6">
                Detalle de compra
              </h2>

              <div className="grid lg:grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Primer Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Enter First Name"
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Last Name"
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Nro Celular
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter Phone No."
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Domicilio
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Address Line"
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    placeholder="Enter City"
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Barrio
                  </label>
                  <input
                    type="text"
                    placeholder="Enter State"
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-900 font-medium block mb-2">
                    Codigo Postal
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Zip Code"
                    className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="text-xl text-slate-900 font-semibold mb-6">
                Metodo de pago
              </h2>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="bg-gray-100 p-4 rounded-md border border-gray-300 max-w-sm">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="method"
                      className="w-5 h-5 cursor-pointer"
                      id="card"
                      defaultChecked
                    />
                    <label htmlFor="card" className="ml-4 flex gap-2 cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://readymadeui.com/images/visa.webp" className="w-12" alt="visa" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://readymadeui.com/images/american-express.webp" className="w-12" alt="american express" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://readymadeui.com/images/master.webp" className="w-12" alt="mastercard" />
                    </label>
                  </div>
                  <p className="mt-4 text-sm text-slate-500 font-medium">
                    Paga con tu tarjeta de debito o credito
                  </p>
                </div>

                <div className="bg-gray-100 p-4 rounded-md border border-gray-300 max-w-sm">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="method"
                      className="w-5 h-5 cursor-pointer"
                      id="paypal"
                    />
                    <label htmlFor="paypal" className="ml-4 flex gap-2 cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://readymadeui.com/images/paypal.webp" className="w-20" alt="paypal" />
                    </label>
                  </div>
                  <p className="mt-4 text-sm text-slate-500 font-medium">
                    Paga con tu cuenta de paypal
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 max-w-md">
              <p className="text-slate-900 text-sm font-medium mb-2">
                ¿Tienes un codigo promocional?
              </p>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Codigo promocional"
                  className="px-4 py-2.5 bg-white border border-gray-400 text-slate-900 w-full text-sm rounded-md focus:outline-blue-600"
                />
                <button
                  type="button"
                  className="flex items-center justify-center font-medium tracking-wide bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-md text-sm text-white cursor-pointer"
                  onClick={() => console.log("apply promo")}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
