"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CubeIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import Navbar from "@/components/Navbar";
import { CommissionRange } from "@/components/CommissionRange";
import ProgresBar from "@/components/ProgresBar";

// ✅ Subida directa a Cloudinary
const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "products_preset");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dyxooovx5/image/upload",
    { method: "POST", body: formData }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Error subiendo imagen");
  }

  return data.secure_url as string;
};

export default function NewProductPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [commissionValue, setCommissionValue] = useState(10);
  const [commissionType, setCommissionType] = useState<"PERCENT" | "FIXED">(
    "PERCENT"
  );

  const imagePreviews = useMemo(() => {
    return imageFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [imageFiles]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);

    try {
      const name = String(fd.get("name") || "").trim();
      const desc = String(fd.get("desc") || "").trim();
      const price = Number(fd.get("price") || 0);

      if (!name) {
        throw new Error("Debes ingresar el nombre del producto");
      }

      if (!price || price <= 0) {
        throw new Error("Debes ingresar un precio válido");
      }

      let imageUrls: string[] = [];

      if (imageFiles.length > 0) {
        imageUrls = await Promise.all(imageFiles.map(uploadImage));
      }

      const payload = {
        name,
        desc,
        price,
        commissionValue,
        commissionType,
        imageUrls,
      };

      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      router.push(`/onboarding/campaings?productId=${data?.productId}`);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error al crear el producto");
      }

      setMessage("Producto creado correctamente ✅");
      //router.push("/onboarding/campaings");
    } catch (err: any) {
      setMessage(err?.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7f0]s">

      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(251,146,60,0.12)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 px-6 py-8 text-white sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <CubeIcon className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-medium text-orange-100">
                    Catálogo de productos
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Creá tu producto
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-xl text-sm text-orange-50/90">
                Agregá la información principal de tu producto, subí imágenes y
                definí la comisión para afiliados.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="px-6 py-8 sm:px-8">
              <div className="space-y-8">
                {message && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                    {message}
                  </div>
                )}

                {/* Nombre */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <CubeIcon className="h-4 w-4 text-orange-500" />
                    Nombre del producto
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Ej: Zapatillas Urban Pro"
                    className="block w-full rounded-2xl border border-orange-200 bg-orange-50/40 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label
                    htmlFor="desc"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <DocumentTextIcon className="h-4 w-4 text-orange-500" />
                    Descripción
                  </label>

                  <textarea
                    id="desc"
                    name="desc"
                    rows={5}
                    placeholder="Contá qué hace especial a tu producto, materiales, beneficios, etc."
                    className="block w-full rounded-2xl border border-orange-200 bg-orange-50/40 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                {/* Imágenes */}
                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-900">
                    Imágenes del producto
                  </label>

                  <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-6 transition hover:border-orange-300">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
                        <PhotoIcon className="h-8 w-8 text-orange-400" />
                      </div>

                      <h3 className="mt-4 text-sm font-semibold text-slate-900">
                        Subí fotos de tu producto
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        PNG, JPG o WEBP. Podés seleccionar varias imágenes.
                      </p>

                      <label className="mt-5 inline-flex cursor-pointer items-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-medium text-orange-700 transition hover:bg-orange-50">
                        Seleccionar imágenes
                        <input
                          type="file"
                          name="images"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            setImageFiles(files);
                          }}
                        />
                      </label>
                    </div>

                    {imageFiles.length > 0 && (
                      <div className="mt-6">
                        <div className="mb-3 text-sm font-medium text-slate-700">
                          {imageFiles.length} imagen
                          {imageFiles.length > 1 ? "es seleccionadas" : " seleccionada"}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {imagePreviews.slice(0, 6).map((image) => (
                            <div
                              key={image.name}
                              className="overflow-hidden rounded-2xl border border-orange-100 bg-white"
                            >
                              <div className="aspect-square w-full bg-orange-50">
                                <img
                                  src={image.url}
                                  alt={image.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="truncate px-3 py-2 text-xs text-slate-500">
                                {image.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Precio */}
                <div>
                  <label
                    htmlFor="price"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <CurrencyDollarIcon className="h-4 w-4 text-orange-500" />
                    Precio
                  </label>

                  <div className="flex overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/40 transition focus-within:border-orange-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                    <span className="flex items-center border-r border-orange-200 bg-orange-100 px-4 text-sm font-medium text-orange-700">
                      $
                    </span>

                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder="0"
                      className="w-full bg-transparent px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                {/* Comisión */}
                <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-5">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Comisión para afiliados
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Definí cuánto ganan los afiliados por promocionar este
                      producto.
                    </p>
                  </div>

                  <CommissionRange
                    type={commissionType}
                    min={5}
                    max={90}
                    step={5}
                    initialValue={commissionValue}
                    onChange={(val, type) => {
                      setCommissionValue(val);
                      setCommissionType(type);
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-xl border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-orange-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Crear producto"}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-20 w-140 mx-auto">
            <ProgresBar />
          </div>
        </div>
      </div>
    </div>
  );
}