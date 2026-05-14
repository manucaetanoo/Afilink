import { ProductCategory } from "@prisma/client";

export const demoShopifyProducts = [
  {
    name: "Demo Shopify - Remera basica",
    desc: "Producto de prueba importado como si viniera desde Shopify.",
    price: 1290,
    stock: 12,
    category: ProductCategory.CLOTHING,
    sizes: ["S", "M", "L"],
    imageUrls: ["https://picsum.photos/seed/aflink-shopify-shirt/900/900"],
    isActive: true,
  },
  {
    name: "Demo Shopify - Zapatillas urbanas",
    desc: "Producto de prueba con talles de calzado.",
    price: 3490,
    stock: 8,
    category: ProductCategory.SHOES,
    sizes: ["39", "40", "41", "42"],
    imageUrls: ["https://picsum.photos/seed/aflink-shopify-shoes/900/900"],
    isActive: true,
  },
  {
    name: "Demo Shopify - Mochila diaria",
    desc: "Producto de prueba sin talles.",
    price: 2190,
    stock: 5,
    category: ProductCategory.ACCESSORIES,
    sizes: [],
    imageUrls: ["https://picsum.photos/seed/aflink-shopify-bag/900/900"],
    isActive: true,
  },
];

export const demoFenicioProducts = [
  {
    name: "Demo Fenicio - Campera denim",
    desc: "Producto de prueba importado como si viniera desde el feed de Fenicio.",
    price: 2890,
    stock: 3,
    category: ProductCategory.CLOTHING,
    sizes: ["S", "M", "L"],
    imageUrls: ["https://picsum.photos/seed/aflink-fenicio-jacket/900/900"],
    isActive: true,
  },
  {
    name: "Demo Fenicio - Sandalias",
    desc: "Producto de prueba con disponibilidad por presentacion.",
    price: 1790,
    stock: 4,
    category: ProductCategory.SHOES,
    sizes: ["37", "38", "39", "40"],
    imageUrls: ["https://picsum.photos/seed/aflink-fenicio-sandals/900/900"],
    isActive: true,
  },
  {
    name: "Demo Fenicio - Kit hogar",
    desc: "Producto de prueba importado desde un feed Fenicio simulado.",
    price: 990,
    stock: 1,
    category: ProductCategory.HOME,
    sizes: [],
    imageUrls: ["https://picsum.photos/seed/aflink-fenicio-home/900/900"],
    isActive: true,
  },
];
