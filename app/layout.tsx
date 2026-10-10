import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import 'animate.css';
import FooterShell from "@/components/FooterShell";
import MetaPixel from "@/components/MetaPixel";
import MetaPixelNoscript from "@/components/MetaPixelNoscript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const googleAnalyticsId = "G-VS828ZVSV7";

export const metadata: Metadata = {
  referrer: "no-referrer",
  title: "Afilink - Aumenta tus ventas",
  description: "Afilink es un programa de afiliados para e-commerce que te permite ganar comisiones promocionando productos de tiendas online. Únete gratis y empieza a monetizar tu audiencia hoy mismo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
        <FooterShell />
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <MetaPixelNoscript />

        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
      </body>
    </html>
  );
}
