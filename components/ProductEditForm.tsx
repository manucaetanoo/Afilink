"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_COLOR_PRESETS,
  parseProductColors,
  type ProductColorOption,
} from "@/lib/product-color";
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

type ProductCategory = (typeof productCategories)[number]["value"];

type ProductFormProduct = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  stock: number;
  category: ProductCategory;
  sizes: string[];
  colors: ProductColorOption[] | unknown;
  imageUrls: string[];
  isActive: boolean;
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
  platformCommissionValue: number;
  platformCommissionType: "PERCENT" | "FIXED";
};

export default function ProductEditForm({ product }: { product: ProductFormProduct }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: product.name,
    desc: product.desc ?? "",
    price: String(product.price),
    stock: String(product.stock),
    category: product.category,
    sizes: product.sizes,
    colors: parseProductColors(product.colors),
    imageUrls: product.imageUrls,
    isActive: product.isActive,
    commissionValue: String(product.commissionValue),
  });
  const [customSize, setCustomSize] = useState("");
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#111827");

  const selectedCategory = useMemo(
    () => productCategories.find((item) => item.value === form.category),
    [form.category]
  );
  const shouldShowSizes = categoriesWithSizes.has(form.category);
  const price = Number(form.price) || 0;
  const affiliateCommissionValue = Number(form.commissionValue) || 0;
  const sellerNet = getSellerNetAmount({
    price,
    affiliateCommissionValue,
    affiliateCommissionType: product.commissionType,
    platformCommissionValue: product.platformCommissionValue,
    platformCommissionType: product.platformCommissionType,
  });

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });
  }

  function setField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSize(size: string) {
    setField(
      "sizes",
      form.sizes.includes(size)
        ? form.sizes.filter((item) => item !== size)
        : [...form.sizes, size]
    );
  }

  function addCustomSize() {
    const nextSize = customSize.trim().toUpperCase();
    if (!nextSize) return;

    setField("sizes", form.sizes.includes(nextSize) ? form.sizes : [...form.sizes, nextSize]);
    setCustomSize("");
  }

  function toggleColor(color: ProductColorOption) {
    setField(
      "colors",
      form.colors.some((item) => item.name.toLowerCase() === color.name.toLowerCase())
        ? form.colors.filter((item) => item.name.toLowerCase() !== color.name.toLowerCase())
        : [...form.colors, color]
    );
  }

  function addCustomColor() {
    const name = customColorName.trim();
    if (!name) return;

    toggleColor({ name, hex: customColorHex });
    setCustomColorName("");
    setCustomColorHex("#111827");
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;

    setMessage(null);

    try {
      const uploadedImages = await Promise.all(
        Array.from(files)
          .filter((file) => file.type.startsWith("image/"))
          .map(fileToDataUrl)
      );

      setField("imageUrls", [...form.imageUrls, ...uploadedImages].slice(0, 8));
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      name: form.name,
      desc: form.desc,
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category,
      sizes: shouldShowSizes ? form.sizes : [],
      colors: form.colors,
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

        <div>
          <label className="text-sm font-medium text-slate-700">Stock</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(e) => setField("stock", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Se descuenta automaticamente cuando una compra queda aprobada.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Colores</h2>
          <p className="text-sm text-slate-500">
            Opcional. Si no agregas ninguno, el producto queda sin variante de color.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRODUCT_COLOR_PRESETS.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => toggleColor(color)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                form.colors.some((item) => item.name.toLowerCase() === color.name.toLowerCase())
                  ? "border-slate-950 bg-white text-slate-950 ring-2 ring-slate-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span
                className="h-4 w-4 rounded-full border border-slate-300"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={customColorName}
            onChange={(e) => setCustomColorName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomColor();
              }
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
            placeholder="Ej: Negro, Azul marino, Beige"
            maxLength={40}
          />
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <span
                className="h-5 w-5 rounded-full border border-slate-300"
                style={{ backgroundColor: customColorHex }}
              />
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                aria-label="Elegir color"
              />
            </label>
            <button
              type="button"
              onClick={addCustomColor}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar
            </button>
          </div>
        </div>

        {form.colors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.colors.map((color) => (
              <button
                key={`${color.name}-${color.hex}`}
                type="button"
                onClick={() => toggleColor(color)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name} x
              </button>
            ))}
          </div>
        )}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Categoria</label>
          <select
            value={form.category}
            onChange={(e) => {
              const nextCategory = e.target.value as ProductCategory;
              setForm((current) => ({
                ...current,
                category: nextCategory,
                sizes: categoriesWithSizes.has(nextCategory) ? current.sizes : [],
              }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            {productCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
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
            <p className="mt-1 font-semibold">-{formatMoney(sellerNet.affiliateAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Plataforma
            </p>
            <p className="mt-1 font-semibold">-{formatMoney(sellerNet.platformAmount)}</p>
          </div>
        </div>
      </div>

      {shouldShowSizes && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Talles</h2>
              <p className="text-sm text-slate-500">Opciones visibles para compradores.</p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {form.sizes.length} seleccionados
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(selectedCategory?.sizes ?? []).map((size) => {
              const active = form.sizes.includes(size);

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Agregar talle"
            />
            <button
              type="button"
              onClick={addCustomSize}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700">Imagenes</label>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Subir imagen
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => addImages(e.target.files)}
            />
          </label>
        </div>

        {form.imageUrls.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Todavia no hay imagenes cargadas.
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
