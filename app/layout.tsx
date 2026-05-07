import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import 'animate.css';
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} >
        <Providers>
        {children}
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
