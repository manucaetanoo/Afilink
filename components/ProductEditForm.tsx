"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProductCategorySelect from "@/components/ProductCategorySelect";
import { normalizeProductCategory } from "@/lib/product-categories";
import { formatMoney, getSellerNetAmount } from "@/lib/pricing";
import {
  ProductDigitalAccessType,
  normalizeProductDigitalAccessType,
} from "@/lib/product-access";

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

type ProductFormProduct = {
  id: string;
  name: string;
  desc: string | null;
  category: string;
  digitalAccessInstructions: string | null;
  digitalAccessType: ProductDigitalAccessType | null;
  price: number;
  imageUrls: string[];
  isActive: boolean;
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
  platformCommissionValue: number;
  platformCommissionType: "PERCENT" | "FIXED";
};

export default function ProductEditForm({
  product,
}: {
  product: ProductFormProduct;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: product.name,
    desc: product.desc ?? "",
    category: normalizeProductCategory(product.category) ?? "otros",
    digitalAccessInstructions: product.digitalAccessInstructions ?? "",
    digitalAccessType: normalizeProductDigitalAccessType(
      product.digitalAccessType
    ),
    price: String(product.price),
    imageUrls: product.imageUrls.slice(0, 1),
    isActive: product.isActive,
    commissionValue: String(product.commissionValue),
  });

  const price = Number(form.price) || 0;
  const affiliateCommissionValue = Number(form.commissionValue) || 0;
  const sellerNet = getSellerNetAmount({
    price,
    affiliateCommissionValue,
    affiliateCommissionType: product.commissionType,
    platformCommissionValue: product.platformCommissionValue,
    platformCommissionType: product.platformCommissionType,
  });

  async function uploadProductImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/seller/product-images", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok || !data?.url) {
      throw new Error(data?.error || "No se pudo subir la imagen");
    }

    return String(data.url);
  }

  function setField<Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;

    setMessage(null);

    try {
      const imageFile = Array.from(files).find((file) =>
        file.type.startsWith("image/")
      );

      if (!imageFile) return;

      const uploadedImage = await uploadProductImage(imageFile);
      setField("imageUrls", [uploadedImage]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error cargando imagen");
    }
  }

  function removeImage(index: number) {
    setField(
      "imageUrls",
      form.imageUrls.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function applyAccessExample(text: string) {
    setField("digitalAccessInstructions", text);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      name: form.name,
      desc: form.desc,
      category: form.category,
      digitalAccessInstructions: form.digitalAccessInstructions,
      digitalAccessType: form.digitalAccessType,
      price: Number(form.price),
      imageUrls: form.imageUrls,
      isActive: form.isActive,
      commissionValue: Number(form.commissionValue),
      commissionType: "PERCENT",
    };

    const res = await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.ok) {
      setMessage(data?.error || "Error guardando producto");
      return;
    }

    router.push("/seller/products");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      {message && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Precio</label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Descripcion</label>
        <textarea
          value={form.desc}
          onChange={(e) => setField("desc", e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </div>

      <ProductCategorySelect value={form.category} onChange={(value) => setField("category", normalizeProductCategory(value) ?? "otros")} />

      <div className="rounded-lg border border-orange-100 bg-orange-50/70 p-4">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">
            Tipo de acceso
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-orange-100 bg-white p-3 text-sm text-slate-700 transition hover:border-orange-200">
              <input
                type="radio"
                name="digitalAccessType"
                value={ProductDigitalAccessType.IMMEDIATE}
                checked={
                  form.digitalAccessType === ProductDigitalAccessType.IMMEDIATE
                }
                onChange={(e) =>
                  setField(
                    "digitalAccessType",
                    normalizeProductDigitalAccessType(e.target.value)
                  )
                }
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
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-orange-100 bg-white p-3 text-sm text-slate-700 transition hover:border-orange-200">
              <input
                type="radio"
                name="digitalAccessType"
                value={ProductDigitalAccessType.EMAIL_WITHIN_24_BUSINESS_HOURS}
                checked={
                  form.digitalAccessType ===
                  ProductDigitalAccessType.EMAIL_WITHIN_24_BUSINESS_HOURS
                }
                onChange={(e) =>
                  setField(
                    "digitalAccessType",
                    normalizeProductDigitalAccessType(e.target.value)
                  )
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
              className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50"
            >
              {example.title}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-900">
          Instrucciones de acceso para el comprador
        </label>
        <textarea
          value={form.digitalAccessInstructions}
          onChange={(e) => setField("digitalAccessInstructions", e.target.value)}
          rows={7}
          className="mt-2 w-full rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm leading-6"
          placeholder="Explica exactamente que pasa despues del pago: link, usuario, clave, tiempo de alta manual o contacto de soporte."
        />
        <p className="mt-2 text-xs leading-5 text-orange-900">
          Esta informacion se envia al comprador cuando el pago queda confirmado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
            Producto digital
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Comision (%)</label>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={form.commissionValue}
            onChange={(e) => setField("commissionValue", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Porcentaje que gana el afiliado por cada venta.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">
          Ganancia neta: {formatMoney(sellerNet.netAmount)}
        </p>
        <div className="mt-3 grid gap-3 text-sm text-emerald-950 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Precio
            </p>
            <p className="mt-1 font-semibold">{formatMoney(price)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Afiliado
            </p>
            <p className="mt-1 font-semibold">
              -{formatMoney(sellerNet.affiliateAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Plataforma
            </p>
            <p className="mt-1 font-semibold">
              -{formatMoney(sellerNet.platformAmount)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700">
            Imagen principal
          </label>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Elegir imagen
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => addImages(e.target.files)}
            />
          </label>
        </div>

        {form.imageUrls.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Todavia no hay imagen cargada.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {form.imageUrls.map((imageUrl, index) => (
              <div
                key={`${imageUrl.slice(0, 32)}-${index}`}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Imagen ${index + 1}`}
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="w-full border-t border-slate-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setField("isActive", e.target.checked)}
        />
        Producto activo
      </label>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar producto"}
        </button>
      </div>
    </form>
  );
}
