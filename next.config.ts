import type { NextConfig } from "next";

const localImagePatterns =
  process.env.NODE_ENV === "production"
    ? []
    : [
        {
          protocol: "http" as const,
          hostname: "*.local",
        },
        {
          protocol: "http" as const,
          hostname: "localhost",
        },
        {
          protocol: "http" as const,
          hostname: "127.0.0.1",
        },
      ];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "f.fcdn.app",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "readymadeui.com",
      },
      ...localImagePatterns,
    ],
  },
};

export default nextConfig;
