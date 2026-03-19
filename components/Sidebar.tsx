"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

// React Icons
import {
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiShoppingBag,
  FiLink,
  FiUsers,
  FiSettings,
  FiUser,
  FiHelpCircle,
  FiPlus,
  FiBarChart2,
  FiCreditCard,
  FiFileText,
} from "react-icons/fi";

type Role = "SELLER" | "AFILIADO" | string;

type AppUser = {
  name?: string | null;
  role?: Role | null;
};

type Item = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* =========================
   MENÚS POR ROL
========================= */

const menuAfiliado = {
  cta: {
    title: "Generar link",
    href: "/afiliado/links/nuevo",
    icon: <FiLink />,
  },
  sections: [
    {
      title: "PRINCIPAL",
      items: [
        { title: "Dashboard", href: "/dashboard/affiliate", icon: <FiHome /> },
        { title: "Mis links", href: "/afiliado/links", icon: <FiLink /> },
      ],
    },
    {
      title: "RESULTADOS",
      items: [
        { title: "Órdenes", href: "/afiliado/ordenes", icon: <FiFileText /> },
        { title: "Comisiones", href: "/afiliado/comisiones", icon: <FiBarChart2 /> },
        { title: "Pagos", href: "/afiliado/pagos", icon: <FiCreditCard /> },
      ],
    },
    {
      title: "CUENTA",
      items: [
        { title: "Perfil", href: "/profile", icon: <FiUser /> },
        { title: "Ajustes", href: "/settings", icon: <FiSettings /> },
      ],
    },
  ],
};

const menuSeller = {
  cta: {
    title: "Crear producto",
    href: "/seller/products/new",
    icon: <FiPlus />,
  },
  sections: [
    {
      title: "PRINCIPAL",
      items: [
        { title: "Dashboard", href: "/dashboard/seller", icon: <FiHome /> },
        { title: "Mis productos", href: "/seller/products", icon: <FiShoppingBag /> },
        { title: "Órdenes", href: "/seller/ordenes", icon: <FiFileText /> },
      ],
    },
    {
      title: "GESTIÓN",
      items: [
        { title: "Afiliados", href: "/seller/afiliados", icon: <FiUsers /> },
        { title: "Pagos", href: "/seller/pagos", icon: <FiCreditCard /> },
        { title: "Reportes", href: "/seller/reportes", icon: <FiBarChart2 /> },
      ],
    },
    {
      title: "CUENTA",
      items: [
        { title: "Perfil", href: "/profile", icon: <FiUser /> },
        { title: "Ajustes", href: "/settings", icon: <FiSettings /> },
      ],
    },
  ],
};

/* =========================
   COMPONENTE
========================= */

export default function Sidebar() {
  const pathname = usePathname();
  const { data } = useSession();

  const user = (data?.user ?? null) as AppUser | null;
  const role = (user?.role ?? "").toUpperCase();

  const menu = role === "SELLER" ? menuSeller : menuAfiliado;

  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      className={cn(
        "h-dvh border-r border-slate-200 bg-slate-50 flex flex-col transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* TOP */}
      <div className={cn("p-4", collapsed && "px-2")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
          <img
            src="/img/logosbg.png"
            alt="Marketafil"
            className={cn("h-8", collapsed && "hidden")}
          />

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        {/* CTA */}
        <Link
          href={menu.cta.href}
          title={menu.cta.title}
          className={cn(
            "mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800",
            collapsed && "px-0"
          )}
        >
          {menu.cta.icon}
          {!collapsed && menu.cta.title}
        </Link>
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {menu.sections.map((section) => (
          <div key={section.title} className="mt-4">
            {!collapsed && (
              <h3 className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-slate-400">
                {section.title}
              </h3>
            )}

            <div className="space-y-1">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center rounded-xl px-3 py-2.5 transition",
                      collapsed ? "justify-center" : "gap-3",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER */}
      <div className={cn("border-t border-slate-200 p-3", collapsed && "px-2")}>
        <Link
          href="/help"
          title="Ayuda"
          className={cn(
            "flex items-center rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <FiHelpCircle className="text-lg" />
          {!collapsed && <span className="text-sm font-medium">Ayuda</span>}
        </Link>
      </div>
    </aside>
  );
}
