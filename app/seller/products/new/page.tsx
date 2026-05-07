"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CubeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhotoIcon,
  Squares2X2Icon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import Navbar from "@/components/Navbar";
import { CommissionRange } from "@/components/CommissionRange";
import {
  DEFAULT_PLATFORM_COMMISSION_TYPE,
  DEFAULT_PLATFORM_COMMISSION_VALUE,
} from "@/lib/platform-commission";
import { formatMoney, getSellerNetAmount } from "@/lib/pricing";

const productCategories = [
  { value: "CLOTHING", label: "Ropa", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  {
    value: "SHOES",
    label: "Calzado",
    sizes: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"],
  },
  { value: "ACCESSORIES", label: "Accesorios", sizes: [] },
  { value: "BEAUTY", label: "Belleza", sizes: [] },
  { value: "HOME", label: "Hogar", sizes: [] },
  { value: "DIGITAL", label: "Digital", sizes: [] },
  { value: "OTHER", label: "Otro", sizes: [] },
] as const;

const categoriesWithSizes = new Set(["CLOTHING", "SHOES"]);

const uploadImage = async (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Error leyendo imagen"));
    reader.readAsDataURL(file);
  });
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error";
}

export default function NewProductPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("OTHER");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [commissionValue, setCommissionValue] = useState(10);
  const [priceValue, setPriceValue] = useState("");

  const imagePreviews = useMemo(() => {
    return imageFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [imageFiles]);

  const selectedCategory = productCategories.find((item) => item.value === category);
  const suggestedSizes = selectedCategory?.sizes ?? [];
  const shouldShowSizes = categoriesWithSizes.has(category);
  const sellerNet = getSellerNetAmount({
    price: Number(priceValue) || 0,
    affiliateCommissionValue: commissionValue,
    platformCommissionValue: DEFAULT_PLATFORM_COMMISSION_VALUE,
    platformCommissionType: DEFAULT_PLATFORM_COMMISSION_TYPE,
  });

  function toggleSize(size: string) {
    setSelectedSizes((current) =>
      current.includes(size)
        ? current.filter((item) => item !== size)
        : [...current, size]
    );
  }

  function addCustomSize() {
    const nextSize = customSize.trim().toUpperCase();
    if (!nextSize) return;

    setSelectedSizes((current) =>
      current.includes(nextSize) ? current : [...current, nextSize]
    );
    setCustomSize("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);

    try {
      const name = String(fd.get("name") || "").trim();
      const desc = String(fd.get("desc") || "").trim();
      const price = Number(fd.get("price") || 0);
      const stock = Number(fd.get("stock") || 0);

      if (!name) throw new Error("Debes ingresar el nombre del producto");
      if (!price || price <= 0) throw new Error("Debes ingresar un precio valido");
      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error("Debes ingresar un stock valido");
      }

      const imageUrls =
        imageFiles.length > 0 ? await Promise.all(imageFiles.map(uploadImage)) : [];

      const payload = {
        name,
        desc,
        price,
        stock,
        category,
        sizes: shouldShowSizes ? selectedSizes : [],
        commissionValue,
        commissionType: "PERCENT",
        imageUrls,
      };

      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error al crear el producto");
      }

      setMessage("Producto creado correctamente");
      router.push("/seller/products");
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7f0] pt-16">
      <Navbar />

      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(251,146,60,0.12)]">
            <div className="bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 px-6 py-8 text-white sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <CubeIcon className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-medium text-orange-100">
                    Catalogo de productos
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Crea tu producto
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-xl text-sm text-orange-50/90">
                Agrega la informacion principal, sube imagenes, define talles si
                aplica y configura la comision para afiliados.
              </p>
            </div>

            <form onSubmit={onSubmit} className="px-6 py-8 sm:px-8">
              <div className="space-y-8">
                {message && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                    {message}
                  </div>
                )}

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

                <div>
                  <label
                    htmlFor="category"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <Squares2X2Icon className="h-4 w-4 text-orange-500" />
                    Categoria
                  </label>

                  <select
                    id="category"
                    name="category"
                    value={category}
                    onChange={(e) => {
                      const nextCategory = e.target.value;
                      setCategory(nextCategory);
                      if (!categoriesWithSizes.has(nextCategory)) {
                        setSelectedSizes([]);
                      }
                    }}
                    className="block w-full rounded-2xl border border-orange-200 bg-orange-50/40 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  >
                    {productCategories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  {shouldShowSizes && (
                    <div className="mt-4 rounded-3xl border border-orange-100 bg-white p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Talles disponibles
                          </h3>
                          <p className="text-sm text-slate-500">
                            Elegi las opciones que va a ver el comprador.
                          </p>
                        </div>
                        <span className="text-xs font-medium text-orange-700">
                          {selectedSizes.length} seleccionados
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {suggestedSizes.map((size) => {
                          const active = selectedSizes.includes(size);

                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => toggleSize(size)}
                              className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                active
                                  ? "border-orange-500 bg-orange-500 text-white"
                                  : "border-orange-200 bg-orange-50 text-slate-700 hover:border-orange-300"
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <input
                          type="text"
                          value={customSize}
                          onChange={(e) => setCustomSize(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomSize();
                            }
                          }}
                          placeholder="Agregar talle"
                          className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={addCustomSize}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Agregar
                        </button>
                      </div>

                      {selectedSizes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedSizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => toggleSize(size)}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              {size} x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="desc"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <DocumentTextIcon className="h-4 w-4 text-orange-500" />
                    Descripcion
                  </label>

                  <textarea
                    id="desc"
                    name="desc"
                    rows={5}
                    placeholder="Conta que hace especial a tu producto, materiales, beneficios, etc."
                    className="block w-full rounded-2xl border border-orange-200 bg-orange-50/40 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-900">
                    Imagenes del producto
                  </label>

                  <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 p-6 transition hover:border-orange-300">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
                        <PhotoIcon className="h-8 w-8 text-orange-400" />
                      </div>

                      <h3 className="mt-4 text-sm font-semibold text-slate-900">
                        Sube fotos de tu producto
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        PNG, JPG o WEBP. Puedes seleccionar varias imagenes.
                      </p>

                      <label className="mt-5 inline-flex cursor-pointer items-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-medium text-orange-700 transition hover:bg-orange-50">
                        Seleccionar imagenes
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      required
                      placeholder="0"
                      className="w-full bg-transparent px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="stock"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                  >
                    <ArchiveBoxIcon className="h-4 w-4 text-orange-500" />
                    Stock disponible
                  </label>

                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="0"
                    className="block w-full rounded-2xl border border-orange-200 bg-orange-50/40 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    Se descuenta automaticamente cuando una compra queda aprobada.
                  </p>
                </div>

                <div className="rounded-3xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-5">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Comision para afiliados
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Define cuanto ganan los afiliados por promocionar este producto.
                    </p>
                  </div>

                  <CommissionRange
                    type="PERCENT"
                    min={5}
                    max={90}
                    step={5}
                    initialValue={commissionValue}
                    onChange={(val) => {
                      setCommissionValue(val);
                    }}
                  />
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm font-semibold text-emerald-900">
                    Ganancia neta: {formatMoney(sellerNet.netAmount)}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-emerald-950 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Precio
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatMoney(Number(priceValue) || 0)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Afiliado
                      </p>
                      <p className="mt-1 font-semibold">
                        -{formatMoney(sellerNet.affiliateAmount)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/70 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Plataforma
                      </p>
                      <p className="mt-1 font-semibold">
                        -{formatMoney(sellerNet.platformAmount)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-emerald-700">
                    Calculado como precio menos comision de afiliado menos comision de plataforma.
                  </p>
                </div>
              </div>

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
        </div>
      </div>
    </div>
  );
}
