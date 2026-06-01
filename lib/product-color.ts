export const PRODUCT_COLOR_PRESETS = [
  { name: "Negro", hex: "#111827" },
  { name: "Blanco", hex: "#ffffff" },
  { name: "Gris", hex: "#9ca3af" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Verde", hex: "#16a34a" },
  { name: "Amarillo", hex: "#facc15" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Beige", hex: "#d6b98c" },
] as const;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export type ProductColorOption = {
  name: string;
  hex: string;
};

export function normalizeProductColors(value: unknown): ProductColorOption[] {
  if (!Array.isArray(value)) return [];

  const colors: ProductColorOption[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const raw = item as Record<string, unknown>;
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 40) : "";
    const hex = typeof raw.hex === "string" ? raw.hex.trim().toLowerCase() : "";

    if (!name && !hex) continue;

    if (!name) {
      throw new Error("Ingresa el nombre del color o deja el producto sin color");
    }

    if (!HEX_COLOR_PATTERN.test(hex)) {
      throw new Error("Color invalido");
    }

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    colors.push({ name, hex });

    if (colors.length >= 12) break;
  }

  return colors;
}

export function parseProductColors(value: unknown): ProductColorOption[] {
  try {
    return normalizeProductColors(value);
  } catch {
    return [];
  }
}
