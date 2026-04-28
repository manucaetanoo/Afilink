"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
type CommissionType = "PERCENT" | "FIXED";

type ProductFormProduct = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  category: ProductCategory;
  sizes: string[];
  imageUrls: string[];
  isActive: boolean;
  commissionValue: number;
  commissionType: CommissionType;
};

export default function ProductEditForm({ product }: { product: ProductFormProduct }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: product.name,
    desc: product.desc ?? "",
    price: String(product.price),
    category: product.category,
    sizes: product.sizes,
    imageUrls: product.imageUrls,
    isActive: product.isActive,
    commissionValue: String(product.commissionValue),
    commissionType: product.commissionType,
  });
  const [customSize, setCustomSize] = useState("");

  const selectedCategory = useMemo(
    () => productCategories.find((item) => item.value === form.category),
    [form.category]
  );
  const shouldShowSizes = categoriesWithSizes.has(form.category);

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
      category: form.category,
      sizes: shouldShowSizes ? form.sizes : [],
      imageUrls: form.imageUrls,
      isActive: form.isActive,
      commissionValue: Number(form.commissionValue),
      commissionType: form.commissionType,
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

      <div className="grid gap-4 md:grid-cols-3">
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
          <label className="text-sm font-medium text-slate-700">Comision</label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.commissionValue}
            onChange={(e) => setField("commissionValue", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <select
            value={form.commissionType}
            onChange={(e) => setField("commissionType", e.target.value as CommissionType)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            <option value="PERCENT">Porcentaje</option>
            <option value="FIXED">Fijo</option>
          </select>
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
