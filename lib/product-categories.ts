export const PRODUCT_CATEGORIES = [
  { value: "tecnologia", label: "Tecnología" },
  { value: "oficios", label: "Oficios" },
  { value: "marketing", label: "Marketing" },
  { value: "negocios", label: "Negocios" },
  { value: "finanzas", label: "Finanzas" },
  { value: "diseno", label: "Diseño y creatividad" },
  { value: "bienestar", label: "Desarrollo y bienestar" },
  { value: "idiomas", label: "Idiomas" },
  { value: "gastronomia", label: "Gastronomía" },
  { value: "otros", label: "Otros" },
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]["value"];
export type CatalogFilter = (typeof CATALOG_FILTERS)[number]["value"];
export const DEFAULT_CATALOG_FILTER: CatalogFilter = "mayor-comision";

export const CATALOG_FILTERS = [
  { value: "mayor-comision", label: "Mayor comisión" },
  { value: "todos", label: "Todos" },
  ...PRODUCT_CATEGORIES.filter((category) => category.value !== "idiomas"),
] as const;

export function isProductCategory(value: unknown): value is ProductCategory {
  return PRODUCT_CATEGORIES.some((category) => category.value === value);
}

export function normalizeProductCategory(value: unknown): ProductCategory | null {
  if (value === "desarrollo-personal") return "bienestar";
  return isProductCategory(value) ? value : null;
}

export function normalizeCatalogFilter(value: unknown): CatalogFilter {
  if (value === "desarrollo-personal") return "bienestar";
  return CATALOG_FILTERS.find((filter) => filter.value === value)?.value ?? DEFAULT_CATALOG_FILTER;
}

export function normalizeCatalogSearch(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 140) : "";
}

export function catalogHref(search: string, category: CatalogFilter, page = 1) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (category !== DEFAULT_CATALOG_FILTER) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  return `/products${params.size ? `?${params}` : ""}`;
}
