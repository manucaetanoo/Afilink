const MAX_PRODUCT_IMAGES = 8;
const MAX_PRODUCT_IMAGE_URL_LENGTH = 2048;

function isAllowedLocalImageUrl(parsed: URL) {
  return (
    process.env.NODE_ENV !== "production" &&
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".local"))
  );
}

function isAllowedRemoteImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || isAllowedLocalImageUrl(parsed);
  } catch {
    return false;
  }
}

export function normalizeProductImageUrls(value: unknown) {
  if (!Array.isArray(value)) return [];

  const urls = value
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_IMAGES);

  if (urls.some((url) => url.toLowerCase().startsWith("data:"))) {
    throw new Error("Las imagenes deben subirse como archivo, no como base64");
  }

  if (urls.some((url) => url.length > MAX_PRODUCT_IMAGE_URL_LENGTH)) {
    throw new Error("URL de imagen demasiado larga");
  }

  if (
    urls.some((url) => {
      if (url.startsWith("/")) return false;
      return !isAllowedRemoteImageUrl(url);
    })
  ) {
    throw new Error("URL de imagen invalida");
  }

  return urls;
}

export function getRenderableProductImageUrls(value: unknown, limit = MAX_PRODUCT_IMAGES) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter((url) => url && !url.toLowerCase().startsWith("data:"))
    .filter((url) => url.startsWith("/") || isAllowedRemoteImageUrl(url))
    .slice(0, limit);
}

export function getFirstRenderableProductImage(value: unknown) {
  return getRenderableProductImageUrls(value, 1)[0] ?? null;
}

export function getRenderableImageUrl(value: unknown) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url || url.toLowerCase().startsWith("data:")) return null;
  if (url.startsWith("/")) return url;

  try {
    return isAllowedRemoteImageUrl(url) ? url : null;
  } catch {
    return null;
  }
}

export function normalizeImageUrl(value: unknown) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return null;

  if (url.toLowerCase().startsWith("data:")) {
    throw new Error("La imagen debe subirse como archivo, no como base64");
  }

  if (url.length > MAX_PRODUCT_IMAGE_URL_LENGTH) {
    throw new Error("URL de imagen demasiado larga");
  }

  if (url.startsWith("/")) return url;

  try {
    if (!isAllowedRemoteImageUrl(url)) throw new Error();
  } catch {
    throw new Error("URL de imagen invalida");
  }

  return url;
}
