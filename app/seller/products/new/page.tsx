"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { PhotoIcon } from "@heroicons/react/24/solid";
import { CommissionRange } from "@/components/CommissionRange";

// ✅ Subida directa a Cloudinary (frontend)
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Varias imágenes
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Estados para la comisión
  const [commissionValue, setCommissionValue] = useState(10);
  const [commissionType, setCommissionType] = useState<"PERCENT" | "FIXED">(
    "PERCENT"
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    // ✅ 1) Subir TODAS las imágenes (si hay)
    let imageUrls: string[] = [];
    try {
      if (imageFiles.length > 0) {
        imageUrls = await Promise.all(imageFiles.map(uploadImage));
        console.log("imageUrls:", imageUrls);
      }
    } catch (err: any) {
      setLoading(false);
      return setError(err?.message || "No se pudieron subir las imágenes");
    }

    // ✅ 2) Crear payload con imageUrls
    const payload = {
      name: String(fd.get("name") || ""),
      desc: String(fd.get("desc") || ""),
      price: Number(fd.get("price") || 0),
      commissionValue,
      commissionType,
      imageUrls, // 👈 NUEVO (array)
    };

    console.log("payload:", payload);

    const res = await fetch("/api/seller/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.ok) return setError(data.error || "Error");
    window.location.href = "/products";
  }

  return (
    <div>
      <Navbar />
      <div className="flex justify-center py-12">
        <form
          className="w-full max-w-2xl space-y-12 bg-white p-8 shadow rounded-md"
          onSubmit={onSubmit}
        >
          <div className="space-y-12">
            <div className="border-b border-gray-900/10 pb-12">
              <h2 className="text-base font-semibold text-gray-900">
                Agregar Producto
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Añade información de tu producto a vender.
              </p>

              <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                {/* Nombre */}
                <div className="sm:col-span-4">
                  <label className="block text-sm font-medium text-gray-900">
                    Nombre
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="mt-2 block w-full rounded-md border p-2 text-gray-900"
                  />
                </div>

                {/* Descripción */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-900">
                    Descripción
                  </label>
                  <textarea
                    name="desc"
                    rows={3}
                    className="mt-2 block w-full rounded-md border p-2 text-gray-900"
                  />
                </div>

                {/* Fotos */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-900">
                    Fotos del producto
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                    <div className="text-center">
                      <PhotoIcon
                        aria-hidden="true"
                        className="mx-auto h-12 w-12 text-gray-300"
                      />
                      <div className="mt-4 flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-semibold text-orange-600 hover:text-orange-500"
                        >
                          <span>Subir imágenes</span>
                          <input
                            id="file-upload"
                            name="images"
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              setImageFiles(files);
                            }}
                          />
                        </label>
                        <p className="pl-1">o arrastra y soltá</p>
                      </div>

                      <p className="text-xs text-gray-600">
                        PNG, JPG, GIF hasta 10MB
                      </p>

                      {/* ✅ Mostrar cantidad y nombres */}
                      {imageFiles.length > 0 && (
                        <div className="mt-3 text-xs text-gray-700">
                          <p>Seleccionadas: {imageFiles.length}</p>
                          <ul className="mt-1 list-disc list-inside space-y-1">
                            {imageFiles.slice(0, 3).map((f) => (
                              <li key={f.name}>{f.name}</li>
                            ))}
                            {imageFiles.length > 3 && <li>...</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Precio */}
                <div className="sm:col-span-4">
                  <label className="block text-sm font-medium text-gray-900">
                    Precio
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    required
                    className="mt-2 block w-full rounded-md border p-2 text-gray-900"
                  />
                </div>
              </div>

              {/* Slider de comisión */}
              <CommissionRange
                type={commissionType}
                min={5}
                max={100}
                step={5}
                initialValue={commissionValue}
                onChange={(val, type) => {
                  setCommissionValue(val);
                  setCommissionType(type);
                }}
              />

              {error && (
                <div className="text-red-600 text-sm mt-8">{error}</div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="mt-6 flex items-center justify-end gap-x-6">
            <button type="button" className="text-sm font-semibold text-gray-900">
              Cancelar
            </button>
            <button
              disabled={loading}
              type="submit"
              className="rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
