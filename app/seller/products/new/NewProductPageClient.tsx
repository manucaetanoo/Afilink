"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CubeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PhotoIcon,
  Squares2X2Icon,
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Navbar from "@/components/Navbar";
import { CommissionRange } from "@/components/CommissionRange";
import {
  DEFAULT_PLATFORM_COMMISSION_TYPE,
  DEFAULT_PLATFORM_COMMISSION_VALUE,
} from "@/lib/platform-commission";
import { PRODUCT_COLOR_PRESETS, type ProductColorOption } from "@/lib/product-color";
import { formatMoney, getSellerNetAmount } from "@/lib/pricing";
import Sidebar from "@/components/Sidebar";

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

type ShopifyConnection = {
  shopDomain: string;
  scope?: string | null;
  installedAt?: string;
  updatedAt?: string;
};

type WooCommerceConnection = {
  storeUrl: string;
  connectedAt?: string;
  updatedAt?: string;
};

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

export default function NewProductPage({
  shopifyImportEnabled = false,
}: {
  shopifyImportEnabled?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf7f2] text-slate-950">
          <Navbar />
        </div>
      }
    >
      <NewProductPageContent shopifyImportEnabled={shopifyImportEnabled} />
    </Suspense>
  );
}

function NewProductPageContent({
  shopifyImportEnabled,
}: {
  shopifyImportEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("OTHER");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [colors, setColors] = useState<ProductColorOption[]>([]);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#111827");
  const [showColorVariants, setShowColorVariants] = useState(false);
  const [commissionValue, setCommissionValue] = useState(10);
  const [platformCommissionValue, setPlatformCommissionValue] = useState(
    DEFAULT_PLATFORM_COMMISSION_VALUE
  );
  const [platformCommissionType, setPlatformCommissionType] = useState<
    "PERCENT" | "FIXED"
  >(DEFAULT_PLATFORM_COMMISSION_TYPE);
  const [priceValue, setPriceValue] = useState("");
  const [showShopifyImport, setShowShopifyImport] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyConnection, setShopifyConnection] =
    useState<ShopifyConnection | null>(null);
  const [shopifyCommissionValue, setShopifyCommissionValue] = useState(10);
  const [shopifyDemoMode, setShopifyDemoMode] = useState(false);
  const [connectingShopify, setConnectingShopify] = useState(false);
  const [disconnectingShopify, setDisconnectingShopify] = useState(false);
  const [importingShopify, setImportingShopify] = useState(false);
  const [showWooCommerceImport, setShowWooCommerceImport] = useState(false);
  const [wooCommerceStoreUrl, setWooCommerceStoreUrl] = useState("");
  const [wooCommerceConsumerKey, setWooCommerceConsumerKey] = useState("");
  const [wooCommerceConsumerSecret, setWooCommerceConsumerSecret] = useState("");
  const [wooCommerceConnection, setWooCommerceConnection] =
    useState<WooCommerceConnection | null>(null);
  const [wooCommerceCommissionValue, setWooCommerceCommissionValue] = useState(10);
  const [connectingWooCommerce, setConnectingWooCommerce] = useState(false);
  const [disconnectingWooCommerce, setDisconnectingWooCommerce] = useState(false);
  const [importingWooCommerce, setImportingWooCommerce] = useState(false);
  const [showFenicioImport, setShowFenicioImport] = useState(false);
  const [fenicioDomain, setFenicioDomain] = useState("");
  const [fenicioCommerceCode, setFenicioCommerceCode] = useState("");
  const [fenicioCommissionValue, setFenicioCommissionValue] = useState(10);
  const [fenicioDemoMode, setFenicioDemoMode] = useState(false);
  const [importingFenicio, setImportingFenicio] = useState(false);
  const canUseDemoImports =
    process.env.NEXT_PUBLIC_ENABLE_DEMO_IMPORTS === "true";

  const imagePreviews = useMemo(() => {
    return imageFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }, [imageFiles]);

  useEffect(() => {
    if (!showShopifyImport && !showWooCommerceImport && !showFenicioImport) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showShopifyImport, showWooCommerceImport, showFenicioImport]);

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

  useEffect(() => {
    let cancelled = false;

    fetch("/api/woocommerce/connection", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const connection = data?.connection ?? null;
        setWooCommerceConnection(connection);
        if (connection?.storeUrl) setWooCommerceStoreUrl(connection.storeUrl);
      })
      .catch(() => {
        if (!cancelled) setWooCommerceConnection(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/shopify/connection", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const connection = data?.connection ?? null;
        setShopifyConnection(connection);
        if (connection?.shopDomain) setShopifyDomain(connection.shopDomain);
      })
      .catch(() => {
        if (!cancelled) setShopifyConnection(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const shopifyStatus = searchParams.get("shopify");
    const shop = searchParams.get("shop");

    if (shopifyStatus === "connected") {
      setMessage(`Shopify conectado${shop ? `: ${shop}` : ""}. Ya podes importar productos.`);
      setShowShopifyImport(true);
      router.replace("/seller/products/new");
    }

    if (shopifyStatus === "error") {
      setMessage("No se pudo conectar Shopify. Revisa la configuracion de la app e intenta de nuevo.");
      setShowShopifyImport(true);
      router.replace("/seller/products/new");
    }
  }, [router, searchParams]);

  const selectedCategory = productCategories.find((item) => item.value === category);
  const suggestedSizes = selectedCategory?.sizes ?? [];
  const shouldShowSizes = categoriesWithSizes.has(category);
  const sellerNet = getSellerNetAmount({
    price: Number(priceValue) || 0,
    affiliateCommissionValue: commissionValue,
    platformCommissionValue,
    platformCommissionType,
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

  function toggleColor(color: ProductColorOption) {
    setColors((current) =>
      current.some((item) => item.name.toLowerCase() === color.name.toLowerCase())
        ? current.filter((item) => item.name.toLowerCase() !== color.name.toLowerCase())
        : [...current, color]
    );
  }

  function addCustomColor() {
    const name = customColorName.trim();
    if (!name) return;

    toggleColor({ name, hex: customColorHex });
    setCustomColorName("");
    setCustomColorHex("#111827");
  }

  function removeImage(index: number) {
    setImageFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
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
        colors,
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
      router.push(`/seller/products?created=${data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function importFromShopify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!(canUseDemoImports && shopifyDemoMode) && !shopifyConnection) {
      await connectShopify();
      return;
    }

    setImportingShopify(true);
    setMessage(null);

    try {
      const res = await fetch("/api/seller/products/shopify-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: shopifyConnection?.shopDomain ?? shopifyDomain,
          commissionValue: shopifyCommissionValue,
          demoMode: canUseDemoImports && shopifyDemoMode,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error importando productos desde Shopify");
      }

      setMessage(
        `Importacion lista: ${data.imported} productos creados, ${data.skipped} omitidos.`
      );
      setShowShopifyImport(false);
      router.push("/seller/products");
      router.refresh();
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setImportingShopify(false);
    }
  }

  async function connectShopify() {
    setConnectingShopify(true);
    setMessage(null);

    try {
      const res = await fetch("/api/shopify/oauth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain: shopifyDomain }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.authUrl) {
        throw new Error(data?.error || "No se pudo iniciar la conexion con Shopify");
      }

      window.location.assign(data.authUrl);
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
      setConnectingShopify(false);
    }
  }

  async function disconnectShopify() {
    setDisconnectingShopify(true);
    setMessage(null);

    try {
      const res = await fetch("/api/shopify/connection", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo desconectar Shopify");
      }

      setShopifyConnection(null);
      setShopifyDomain("");
      setMessage("Shopify desconectado. Podes conectar la tienda nuevamente.");
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setDisconnectingShopify(false);
    }
  }

  async function connectWooCommerce() {
    setConnectingWooCommerce(true);
    setMessage(null);

    try {
      const res = await fetch("/api/woocommerce/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeUrl: wooCommerceStoreUrl,
          consumerKey: wooCommerceConsumerKey,
          consumerSecret: wooCommerceConsumerSecret,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.connection) {
        throw new Error(data?.error || "No se pudo conectar WooCommerce");
      }

      setWooCommerceConnection(data.connection);
      setWooCommerceStoreUrl(data.connection.storeUrl);
      setWooCommerceConsumerKey("");
      setWooCommerceConsumerSecret("");
      setMessage("WooCommerce conectado. Ya podes importar productos.");
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setConnectingWooCommerce(false);
    }
  }

  async function disconnectWooCommerce() {
    setDisconnectingWooCommerce(true);
    setMessage(null);

    try {
      const res = await fetch("/api/woocommerce/connection", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo desconectar WooCommerce");
      }

      setWooCommerceConnection(null);
      setWooCommerceStoreUrl("");
      setWooCommerceConsumerKey("");
      setWooCommerceConsumerSecret("");
      setMessage("WooCommerce desconectado.");
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setDisconnectingWooCommerce(false);
    }
  }

  async function importFromWooCommerce(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!wooCommerceConnection) {
      await connectWooCommerce();
      return;
    }

    setImportingWooCommerce(true);
    setMessage(null);

    try {
      const res = await fetch("/api/seller/products/woocommerce-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionValue: wooCommerceCommissionValue,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error importando productos desde WooCommerce");
      }

      setMessage(
        `Importacion lista: ${data.imported} productos creados, ${data.skipped} omitidos.`
      );
      setShowWooCommerceImport(false);
      router.push("/seller/products");
      router.refresh();
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setImportingWooCommerce(false);
    }
  }

  async function importFromFenicio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImportingFenicio(true);
    setMessage(null);

    try {
      const res = await fetch("/api/seller/products/fenicio-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeDomain: fenicioDomain,
          commerceCode: fenicioCommerceCode,
          commissionValue: fenicioCommissionValue,
          demoMode: canUseDemoImports && fenicioDemoMode,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error importando productos desde Fenicio");
      }

      setMessage(
        `Importacion lista: ${data.imported} productos creados, ${data.skipped} omitidos.`
      );
      setShowFenicioImport(false);
      router.push("/seller/products");
      router.refresh();
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setImportingFenicio(false);
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
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                        <CubeIcon className="h-6 w-6" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-orange-200">
                          Catalogo de productos
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                          Crea tu producto
                        </h1>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {shopifyImportEnabled && (
                      <button
                        type="button"
                        onClick={() => setShowShopifyImport(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/img/Shopify-Logo-PNG.png"
                          alt=""
                          className="h-5 w-auto object-contain"
                        />
                        Importar desde Shopify
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowWooCommerceImport(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-50"
                      >
                        <span className="text-base font-black text-[#7f54b3]">W</span>
                        Importar desde WooCommerce
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      {/* <button
                        type="button"
                        onClick={() => setShowFenicioImport(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element 
                        <img
                          src="/img/fenicio-logo.png"
                          alt=""
                          className="h-6 max-w-[92px] object-contain"
                        />
                        Importar desde Fenicio
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button> */}

                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                        Publicacion nueva
                      </div>
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
                              placeholder="Ej: Zapatillas Urban Pro"
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
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
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            >
                              {productCategories.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>

                            {shouldShowSizes && (
                              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                      Talles disponibles
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                      Elegi las opciones que va a ver el comprador.
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
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
                                        className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-semibold transition ${active
                                          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-700"
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
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                  />
                                  <button
                                    type="button"
                                    onClick={addCustomSize}
                                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                      >
                                        {size} x
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                  Variantes de color
                                </h3>
                                <p className="text-sm text-slate-500">
                                  Opcional. Si no agregas ninguna, el producto queda sin variante de color.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowColorVariants((current) => !current)}
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                {showColorVariants ? "Ocultar colores" : "Agregar variante de color"}
                              </button>
                            </div>

                            {colors.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {colors.map((color) => (
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

                            {showColorVariants && (
                              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                                <div className="flex flex-wrap gap-2">
                                  {PRODUCT_COLOR_PRESETS.map((color) => (
                                    <button
                                      key={color.name}
                                      type="button"
                                      onClick={() => toggleColor(color)}
                                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                        colors.some((item) => item.name.toLowerCase() === color.name.toLowerCase())
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
                                    type="text"
                                    value={customColorName}
                                    onChange={(e) => setCustomColorName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        addCustomColor();
                                      }
                                    }}
                                    placeholder="Agregar color personalizado"
                                    maxLength={40}
                                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                  />
                                  <div className="flex gap-2">
                                    <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                                      <span
                                        className="h-6 w-6 rounded-full border border-slate-300"
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
                                      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    >
                                      Agregar
                                    </button>
                                  </div>
                                </div>
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
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="text-base font-semibold text-slate-950">
                              Imagenes del producto
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                              PNG, JPG o WEBP. Puedes seleccionar varias imagenes.
                            </p>
                          </div>

                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                            <PlusIcon className="h-4 w-4" />
                            Agregar imagenes
                            <input
                              type="file"
                              name="images"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                setImageFiles((current) => [...current, ...files]);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
                        </div>

                        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 sm:p-4 transition hover:border-orange-300">
                          {imageFiles.length === 0 ? (
                            <div className="flex min-h-48 flex-col items-center justify-center text-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                                <PhotoIcon className="h-7 w-7 text-orange-500" />
                              </div>

                              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                                Todavia no hay imagenes cargadas
                              </h3>
                              <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Agrega una o varias fotos para mostrar el producto desde distintos angulos.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-slate-900">
                                  {imageFiles.length} imagen
                                  {imageFiles.length > 1 ? "es seleccionadas" : " seleccionada"}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  Las nuevas se suman a las anteriores
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
                                      {index + 1}.{" "}
                                      {image.name}
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
                            Precio y stock
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Valores usados para ventas y calculo de ganancia.
                          </p>
                        </div>

                        <div className="space-y-5">
                          <div>
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
                              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                            <p className="mt-2 text-sm text-slate-500">
                              Se descuenta automaticamente cuando una compra queda aprobada.
                            </p>
                          </div>
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
                          onChange={(val) => {
                            setCommissionValue(val);
                          }}
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
                        <p className="mt-3 text-xs text-emerald-700">
                          Calculado como precio menos comision de afiliado menos comision de plataforma.
                        </p>
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

                {showShopifyImport && shopifyImportEnabled && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6">
                    <div className="flex max-h-[82vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
                      <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-950">
                            Importar productos desde Shopify
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Se crearan productos nuevos con precio, stock, imagenes y descripcion.
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            *Se importarán todos los productos de tu cuenta.*
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowShopifyImport(false)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Cerrar importacion"
                          title="Cerrar"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <form onSubmit={importFromShopify} className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
                        {canUseDemoImports && (
                          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={shopifyDemoMode}
                              onChange={(e) => setShopifyDemoMode(e.target.checked)}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="block font-semibold text-slate-900">
                                Usar datos de prueba
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                Crea productos demo sin conectar una tienda Shopify real.
                              </span>
                            </span>
                          </label>
                        )}

                        <div>
                          <label
                            htmlFor="shopifyDomain"
                            className="text-sm font-semibold text-slate-900"
                          >
                            Dominio de la tienda
                          </label>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              id="shopifyDomain"
                              type="text"
                              value={shopifyDomain}
                              onChange={(e) => setShopifyDomain(e.target.value)}
                              placeholder="mitienda.myshopify.com"
                              required={!(canUseDemoImports && shopifyDemoMode) && !shopifyConnection}
                              disabled={Boolean(shopifyConnection) || (canUseDemoImports && shopifyDemoMode)}
                              className="block min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:text-slate-500"
                            />
                            <button
                              type="button"
                              onClick={connectShopify}
                              disabled={connectingShopify || (canUseDemoImports && shopifyDemoMode)}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {shopifyConnection ? "Reconectar" : connectingShopify ? "Conectando..." : "Conectar"}
                            </button>
                          </div>
                          {shopifyConnection ? (
                            <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs font-medium text-emerald-700">
                                  Tienda conectada: {shopifyConnection.shopDomain}
                                </p>
                                <button
                                  type="button"
                                  onClick={disconnectShopify}
                                  disabled={
                                    disconnectingShopify ||
                                    importingShopify ||
                                    connectingShopify
                                  }
                                  className="self-start text-xs font-semibold text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                                >
                                  {disconnectingShopify ? "Desconectando..." : "Desconectar"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-slate-500">
                              Al conectar, Shopify te pedira aprobar permisos de productos.
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Los productos con el mismo nombre ya existentes en tu cuenta se omiten
                          para evitar duplicados.
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                Comision de importacion
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Se aplicara a todos los productos importados.
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {shopifyCommissionValue}%
                            </span>
                          </div>

                          <CommissionRange
                            type="PERCENT"
                            min={5}
                            max={90}
                            step={5}
                            initialValue={shopifyCommissionValue}
                            onChange={(value) => setShopifyCommissionValue(value)}
                          />
                        </div>

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setShowShopifyImport(false)}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={importingShopify || connectingShopify}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            {importingShopify
                              ? "Importando..."
                              : shopifyConnection || (canUseDemoImports && shopifyDemoMode)
                                ? "Importar productos"
                                : "Conectar Shopify"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                

                {showWooCommerceImport && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6">
                    <div className="flex max-h-[82vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
                      <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-950">
                            Importar productos desde WooCommerce
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Se crearan productos con precio, stock, imagenes y variantes.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowWooCommerceImport(false)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Cerrar importacion"
                          title="Cerrar"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <form onSubmit={importFromWooCommerce} className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
                        <div>
                          <label
                            htmlFor="wooCommerceStoreUrl"
                            className="text-sm font-semibold text-slate-900"
                          >
                            URL de la tienda
                          </label>
                          <input
                            id="wooCommerceStoreUrl"
                            type="url"
                            value={wooCommerceStoreUrl}
                            onChange={(e) => setWooCommerceStoreUrl(e.target.value)}
                            placeholder="https://mitienda.com"
                            required={!wooCommerceConnection}
                            disabled={Boolean(wooCommerceConnection)}
                            className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:text-slate-500"
                          />
                        </div>

                        {!wooCommerceConnection && (
                          <>
                            <div>
                              <label
                                htmlFor="wooCommerceConsumerKey"
                                className="text-sm font-semibold text-slate-900"
                              >
                                Consumer key
                              </label>
                              <input
                                id="wooCommerceConsumerKey"
                                type="text"
                                value={wooCommerceConsumerKey}
                                onChange={(e) => setWooCommerceConsumerKey(e.target.value)}
                                placeholder="ck_xxxxxxxxx"
                                required
                                className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="wooCommerceConsumerSecret"
                                className="text-sm font-semibold text-slate-900"
                              >
                                Consumer secret
                              </label>
                              <input
                                id="wooCommerceConsumerSecret"
                                type="password"
                                value={wooCommerceConsumerSecret}
                                onChange={(e) => setWooCommerceConsumerSecret(e.target.value)}
                                placeholder="cs_xxxxxxxxx"
                                required
                                className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                              />
                            </div>
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
  <div className="flex items-start gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
      ▶
    </div>

    <div className="flex-1">
      <p className="text-sm font-semibold text-blue-950">
        ¿No sabés cómo obtener las API keys?
      </p>

      <p className="mt-1 text-sm text-blue-700">
        Mirá este tutorial para crear las claves de WooCommerce con permisos de lectura y escritura.
      </p>

      <a
        href="https://drive.google.com/file/d/18VYZ4xaNBc2SvArV4L_ASYTrjtx69X3V/view?usp=sharing"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Ver tutorial
        <span className="ml-2">↗</span>
      </a>
    </div>
  </div>
</div>
                          </>
                        )}

                        {wooCommerceConnection ? (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs font-medium text-emerald-700">
                                Tienda conectada: {wooCommerceConnection.storeUrl}
                              </p>
                              <button
                                type="button"
                                onClick={disconnectWooCommerce}
                                disabled={disconnectingWooCommerce || importingWooCommerce}
                                className="self-start text-xs font-semibold text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                              >
                                {disconnectingWooCommerce ? "Desconectando..." : "Desconectar"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            La API key debe tener permisos de lectura y escritura.
                          </div>
                          
                          
                        )}

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Cuando una compra de estos productos se pague en Afilink, se creara
                          una orden pagada en WooCommerce para descontar stock.
                        </div>

                        {wooCommerceConnection && (
                          <div className="border-t border-slate-200 pt-4">
                            <div className="mb-3 flex items-center justify-between gap-4">
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                  Comision de importacion
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  Se aplicara a todos los productos importados.
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-slate-900">
                                {wooCommerceCommissionValue}%
                              </span>
                            </div>

                            <CommissionRange
                              type="PERCENT"
                              min={5}
                              max={90}
                              step={5}
                              initialValue={wooCommerceCommissionValue}
                              onChange={(value) => setWooCommerceCommissionValue(value)}
                            />
                          </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setShowWooCommerceImport(false)}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={importingWooCommerce || connectingWooCommerce}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            {importingWooCommerce
                              ? "Importando..."
                              : wooCommerceConnection
                                ? "Importar productos"
                                : connectingWooCommerce
                                  ? "Conectando..."
                                  : "Conectar WooCommerce"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {showFenicioImport && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6">
                    <div className="flex max-h-[82vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
                      <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-950">
                            Importar productos desde Fenicio
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Se leeran los productos publicados en el feed Fenicio del comercio.
                          </p>
                            <p className="mt-1 text-sm text-slate-400">
                            *Se importarán todos los productos de tu pagina.*
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowFenicioImport(false)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label="Cerrar importacion"
                          title="Cerrar"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <form onSubmit={importFromFenicio} className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
                        {canUseDemoImports && (
                          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={fenicioDemoMode}
                              onChange={(e) => setFenicioDemoMode(e.target.checked)}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="block font-semibold text-slate-900">
                                Usar datos de prueba
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                Crea productos demo sin conectar una tienda Fenicio real.
                              </span>
                              
                             
                            </span>
                          </label>
                        )}

                        <div>
                          <label
                            htmlFor="fenicioDomain"
                            className="text-sm font-semibold text-slate-900"
                          >
                            Dominio de la tienda
                          </label>
                          <input
                            id="fenicioDomain"
                            type="text"
                            value={fenicioDomain}
                            onChange={(e) => setFenicioDomain(e.target.value)}
                            placeholder="mitienda.com.uy"
                            required={!(canUseDemoImports && fenicioDemoMode)}
                            disabled={canUseDemoImports && fenicioDemoMode}
                            className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="fenicioCommerceCode"
                            className="text-sm font-semibold text-slate-900"
                          >
                            Codigo de comercio
                          </label>
                          <input
                            id="fenicioCommerceCode"
                            type="text"
                            value={fenicioCommerceCode}
                            onChange={(e) => setFenicioCommerceCode(e.target.value)}
                            placeholder="El mismo codigo usado para entrar al administrador"
                            required={!(canUseDemoImports && fenicioDemoMode)}
                            disabled={canUseDemoImports && fenicioDemoMode}
                            className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                          />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Fenicio no expone stock exacto en este feed. Se importara stock segun
                          las presentaciones marcadas como disponibles.
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                Comision de importacion
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Se aplicara a todos los productos importados.
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {fenicioCommissionValue}%
                            </span>
                          </div>

                          <CommissionRange
                            type="PERCENT"
                            min={5}
                            max={90}
                            step={5}
                            initialValue={fenicioCommissionValue}
                            onChange={(value) => setFenicioCommissionValue(value)}
                          />
                        </div>

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setShowFenicioImport(false)}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={importingFenicio}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            {importingFenicio ? "Importando..." : "Importar productos"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
