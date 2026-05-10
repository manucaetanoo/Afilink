"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Inicio", targetId: "inicio" },
  { name: "Cómo funciona", targetId: "como-funciona" },
  { name: "Beneficios", targetId: "beneficios" },
];

function scrollToSection(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
}

export default function HomeNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (targetId: string) => {
    scrollToSection(targetId);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav
        className={cn(
          "mx-auto flex items-center justify-between transition-all duration-300",
          isScrolled
            ? "max-w-4xl rounded-full border border-black/5 bg-white/85 px-4 py-2 shadow-sm shadow-orange-950/5 backdrop-blur-xl"
            : "max-w-7xl rounded-none border border-transparent bg-transparent px-5 py-4 shadow-none lg:px-6"
        )}
      >
        <Link href="/" className="flex items-center">
          <Image
            src="/img/logosbg.png"
            alt="Afilink"
            width={160}
            height={48}
            className={cn(
              "w-auto transition-all duration-300",
              isScrolled ? "h-7" : "h-9"
            )}
          />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => handleNavClick(item.targetId)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-[#E89C51]"
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#F78211] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d98b3f]"
          >
            Únete ahora
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          className="inline-flex size-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-orange-50 lg:hidden"
          aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="size-6" />
          ) : (
            <Bars3Icon className="size-6" />
          )}
        </button>
      </nav>

      <div
        className={cn(
          "mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-black/5 bg-white/95 shadow-lg shadow-orange-950/10 backdrop-blur-xl transition-all duration-300 lg:hidden",
          isMobileMenuOpen
            ? "max-h-96 opacity-100"
            : "max-h-0 border-transparent opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => handleNavClick(item.targetId)}
              className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-orange-50 hover:text-[#E89C51]"
            >
              {item.name}
            </button>
          ))}

          <div className="mt-2 grid gap-2 border-t border-gray-100 pt-3">
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-xl bg-[#E89C51] px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#d98b3f]"
            >
              Únete ahora
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
