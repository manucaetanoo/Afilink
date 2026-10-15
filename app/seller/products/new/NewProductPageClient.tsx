"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CubeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Navbar from "@/components/Navbar";
import { CommissionRange } from "@/components/CommissionRange";
import {
  DEFAULT_PLATFORM_COMMISSION_TYPE,
  DEFAULT_PLATFORM_COMMISSION_VALUE,
} from "@/lib/platform-commission";
import { formatMoney, getSellerNetAmount } from "@/lib/pricing";
import Sidebar from "@/components/Sidebar";
import { ProductDigitalAccessType } from "@/lib/product-access";
import ProductCategorySelect from "@/components/ProductCategorySelect";

const accessExamples = [
  {
    title: "Link directo",
    text: "Acceso inmediato: entra a https://...\nUsa este codigo o contraseña: ...\nSoporte: soporte@...",
  },
  {
    title: "Moodle con clave",
    text: "Curso en Moodle: https://...\nCrea tu cuenta con el mismo email usado en la compra.\nClave de matriculacion: ...\nSoporte: soporte@...",
  },
  {
    title: "Alta manual",
    text: "Vamos a crear tu usuario con el email usado en la compra.\nRecibiras los datos de acceso dentro de 24 horas habiles.\nSoporte: soporte@...",
  },
  {
    title: "Licencia o archivo",
    text: "Tu licencia/codigo de activacion es: ...\nDescarga o activa el producto desde: https://...\nSoporte: soporte@...",
  },
];

const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/seller/product-images", {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok || !data?.url) {
    throw new Error(data?.error || "Error subiendo imagen");
  }

  return String(data.url);
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error";
}

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf7f2] text-slate-950">
          <Navbar />
        </div>
      }
    >
      <NewProductPageContent />
    </Suspense>
  );
}

function NewProductPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [commissionValue, setCommissionValue] = useState(10);
  const [platformCommissionValue, setPlatformCommissionValue] = useState(
    DEFAULT_PLATFORM_COMMISSION_VALUE
  );
  const [platformCommissionType, setPlatformCommissionType] = useState<
    "PERCENT" | "FIXED"
  >(DEFAULT_PLATFORM_COMMISSION_TYPE);
  const [priceValue, setPriceValue] = useState("");
  const [digitalAccessInstructions, setDigitalAccessInstructions] =
    useState("");

  const imagePreviews = useMemo(() => {
    return imageFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [imageFiles]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;

        const value = Number(data?.user?.platformCommissionValue);
        const type = data?.user?.platformCommissionType;

        if (Number.isFinite(value) && value >= 0) {
          setPlatformCommissionValue(value);
        }

        if (type === "PERCENT" || type === "FIXED") {
          setPlatformCommissionType(type);
        }
      })
      .catch(() => {
        // Si no se puede leer el perfil, mantenemos el default local.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sellerNet = getSellerNetAmount({
    price: Number(priceValue) || 0,
    affiliateCommissionValue: commissionValue,
    platformCommissionValue,
    platformCommissionType,
  });

  function removeImage(index: number) {
    setImageFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function applyAccessExample(text: string) {
    setDigitalAccessInstructions(text);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);

    try {
      const name = String(fd.get("name") || "").trim();
      const desc = String(fd.get("desc") || "").trim();
      const digitalAccessInstructions = String(
        fd.get("digitalAccessInstructions") || ""
      ).trim();
      const digitalAccessType = String(
        fd.get("digitalAccessType") || ProductDigitalAccessType.IMMEDIATE
      );
      const price = Number(fd.get("price") || 0);

      if (!name) throw new Error("Debes ingresar el nombre del producto");
      if (!price || price <= 0) throw new Error("Debes ingresar un precio valido");

      const imageUrls =
        imageFiles.length > 0 ? [await uploadImage(imageFiles[0])] : [];

      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          desc,
          category: String(fd.get("category") || "otros"),
          digitalAccessInstructions,
          digitalAccessType,
          price,
          commissionValue,
          commissionType: "PERCENT",
          imageUrls,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error al crear el producto");
      }

      setMessage("Producto creado correctamente");
      router.push(`/seller/products?created=${data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] text-slate-950">
      <Navbar />

      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <div className="border-b border-slate-200 bg-slate-950 px-6 py-7 text-white sm:px-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                      <CubeIcon className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-orange-200">
                        Catalogo digital
                      </p>
                      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Crea tu producto digital
                      </h1>
                    </div>
                  </div>
                </div>

                <form onSubmit={onSubmit} className="px-5 py-6 sm:px-8 sm:py-8">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-6">
                      {message && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
                          {message}
                        </div>
                      )}

                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-5">
                          <h2 className="text-base font-semibold text-slate-950">
                            Informacion principal
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Datos visibles en la tienda y en los links de afiliados.
                          </p>
                        </div>

                        <div className="space-y-5">
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
                              placeholder="Ej: Curso online de marketing"
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-900">
                              Tipo
                            </label>
                            <div className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">
                              Producto digital
                            </div>
                          </div>

                          <ProductCategorySelect />

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
                              placeholder="Conta que incluye el producto digital, para quien es y que resultado ayuda a conseguir."
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                          </div>

                          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                            <fieldset className="mb-5">
                              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <DocumentTextIcon className="h-4 w-4 text-orange-500" />
                                Tipo de acceso
                              </legend>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm transition hover:border-orange-200">
                                  <input
                                    type="radio"
                                    name="digitalAccessType"
                                    value={ProductDigitalAccessType.IMMEDIATE}
                                    defaultChecked
                                    required
                                    className="mt-1"
                                  />
                                  <span>
                                    <span className="block font-semibold text-slate-900">
                                      Acceso inmediato
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                      El comprador recibe el acceso al confirmarse el pago.
                                    </span>
                                  </span>
                                </label>
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-orange-100 bg-white px-3 py-3 text-sm transition hover:border-orange-200">
                                  <input
                                    type="radio"
                                    name="digitalAccessType"
                                    value={
                                      ProductDigitalAccessType.EMAIL_WITHIN_24_BUSINESS_HOURS
                                    }
                                    required
                                    className="mt-1"
                                  />
                                  <span>
                                    <span className="block font-semibold text-slate-900">
                                      Acceso enviado por correo dentro de las 24 horas hábiles
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                      El vendedor envía las instrucciones por email luego del pago.
                                    </span>
                                  </span>
                                </label>
                              </div>
                            </fieldset>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              {accessExamples.map((example) => (
                                <button
                                  key={example.title}
                                  type="button"
                                  onClick={() => applyAccessExample(example.text)}
                                  className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50"
                                >
                                  {example.title}
                                </button>
                              ))}
                            </div>

                            <label
                              htmlFor="digitalAccessInstructions"
                              className="mb-2 mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900"
                            >
                              <DocumentTextIcon className="h-4 w-4 text-orange-500" />
                              Instrucciones de acceso para el comprador
                            </label>

                            <textarea
                              id="digitalAccessInstructions"
                              name="digitalAccessInstructions"
                              value={digitalAccessInstructions}
                              onChange={(e) =>
                                setDigitalAccessInstructions(e.target.value)
                              }
                              rows={7}
                              placeholder="Explica exactamente que pasa despues del pago: link, usuario, clave, tiempo de alta manual o contacto de soporte."
                              className="block w-full rounded-xl border border-orange-100 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                            <p className="mt-2 text-sm leading-6 text-orange-900">
                              Esta informacion es privada y se envia al comprador cuando el pago queda confirmado.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="text-base font-semibold text-slate-950">
                              Imagen principal del producto
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                              PNG, JPG o WEBP. Se muestra una sola imagen en la ficha publica.
                            </p>
                          </div>

                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                            <PlusIcon className="h-4 w-4" />
                            Elegir imagen
                            <input
                              type="file"
                              name="images"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                setImageFiles(file ? [file] : []);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>

                        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 transition hover:border-orange-300 sm:p-4">
                          {imageFiles.length === 0 ? (
                            <div className="flex min-h-48 flex-col items-center justify-center text-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                                <PhotoIcon className="h-7 w-7 text-orange-500" />
                              </div>

                              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                                Todavia no hay imagen cargada
                              </h3>
                              <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Agrega una imagen clara para identificar el producto.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-slate-900">
                                  Imagen seleccionada
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  Reemplazala eligiendo otra imagen
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {imagePreviews.map((image, index) => (
                                  <div
                                    key={`${image.name}-${index}`}
                                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => removeImage(index)}
                                      className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600"
                                      aria-label={`Eliminar imagen ${index + 1}`}
                                      title="Eliminar imagen"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                    <div className="aspect-square w-full bg-slate-100">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={image.url}
                                        alt={image.name}
                                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                                      />
                                    </div>
                                    <div className="truncate border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                                      {index + 1}. {image.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-5">
                          <h2 className="text-base font-semibold text-slate-950">
                            Precio
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Valor usado para ventas y calculo de ganancia.
                          </p>
                        </div>

                        <label
                          htmlFor="price"
                          className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"
                        >
                          <CurrencyDollarIcon className="h-4 w-4 text-orange-500" />
                          Precio
                        </label>

                        <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-orange-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
                          <span className="flex items-center border-r border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
                            $
                          </span>

                          <input
                            id="price"
                            name="price"
                            type="number"
                            min="50"
                            step="1"
                            value={priceValue}
                            onChange={(e) => setPriceValue(e.target.value)}
                            required
                            placeholder="0"
                            className="w-full bg-transparent px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none"
                          />
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-3">
                          <h2 className="text-base font-semibold text-slate-950">
                            Comision para afiliados
                          </h2>
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
                          onChange={setCommissionValue}
                        />
                      </section>

                      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
                        <p className="text-sm font-semibold text-emerald-950">
                          Ganancia neta: {formatMoney(sellerNet.netAmount)}
                        </p>
                        <div className="mt-4 grid gap-3 text-sm text-emerald-950 sm:grid-cols-3">
                          <div className="rounded-xl bg-white/75 px-4 py-3 ring-1 ring-emerald-100">
                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                              Precio
                            </p>
                            <p className="mt-1 font-semibold">
                              {formatMoney(Number(priceValue) || 0)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white/75 px-4 py-3 ring-1 ring-emerald-100">
                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                              Afiliado
                            </p>
                            <p className="mt-1 font-semibold">
                              -{formatMoney(sellerNet.affiliateAmount)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white/75 px-4 py-3 ring-1 ring-emerald-100">
                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                              Plataforma
                            </p>
                            <p className="mt-1 font-semibold">
                              -{formatMoney(sellerNet.platformAmount)}
                            </p>
                          </div>
                        </div>
                      </section>
                    </aside>
                  </div>

                  <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Guardando..." : "Crear producto"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
