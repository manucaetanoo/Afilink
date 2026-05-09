"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiHelpCircle,
  FiHome,
  FiLink,
  FiLayers,
  FiPlus,
  FiShoppingBag,
  FiTruck,
  FiUser,
  FiUsers,
} from "react-icons/fi";

type Role = "SELLER" | "AFILIADO" | string;

type AppUser = {
  name?: string | null;
  role?: Role | null;
};

type MenuItem = {
  title: string;
  href: string;
  icon: ReactNode;
};

type Menu = {
  cta: MenuItem;
  helpHref: string;
  sections: Array<{
    title: string;
    items: MenuItem[];
  }>;
};

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const menuAfiliado: Menu = {
  cta: {
    title: "Generar link",
    href: "/products",
    icon: <FiLink />,
  },
  helpHref: "/contacto",
  sections: [
    {
      title: "PRINCIPAL",
      items: [
        { title: "Dashboard", href: "/dashboard/affiliate", icon: <FiHome /> },
        { title: "Mis links", href: "/dashboard/affiliate#links", icon: <FiLink /> },
      ],
    },
    {
      title: "RESULTADOS",
      items: [
        { title: "Ordenes", href: "/dashboard/affiliate#orders", icon: <FiFileText /> },
        { title: "Comisiones", href: "/dashboard/affiliate#commissions", icon: <FiBarChart2 /> },
        { title: "Pagos", href: "/dashboard/affiliate#payments", icon: <FiCreditCard /> },
      ],
    },
    {
      title: "CUENTA",
      items: [
        { title: "Perfil y ajustes", href: "/perfil/config", icon: <FiUser /> },
      ],
    },
  ],
};

const menuSeller: Menu = {
  cta: {
    title: "Crear producto",
    href: "/seller/products/new",
    icon: <FiPlus />,
  },
  helpHref: "/contacto",
  sections: [
    {
      title: "PRINCIPAL",
      items: [
        { title: "Dashboard", href: "/dashboard/seller", icon: <FiHome /> },
        { title: "Mis productos", href: "/seller/products", icon: <FiShoppingBag /> },
        { title: "Campañas", href: "/seller/campaigns", icon: <FiLayers /> },
        { title: "Ordenes", href: "/seller/orders", icon: <FiFileText /> },
      ],
    },
    {
      title: "GESTION",
      items: [
        { title: "Afiliados", href: "/dashboard/seller#affiliates", icon: <FiUsers /> },
        { title: "Pagos", href: "/dashboard/seller#payments", icon: <FiCreditCard /> },
        { title: "Reportes", href: "/dashboard/seller#reports", icon: <FiBarChart2 /> },
      ],
    },
    {
      title: "CUENTA",
      items: [
        { title: "Perfil y ajustes", href: "/perfil/config", icon: <FiUser /> },
      ],
    },
  ],
};

const menuAdmin: Menu = {
  cta: {
    title: "Control entregas",
    href: "/admin/orders",
    icon: <FiFileText />,
  },
  helpHref: "/contacto",
  sections: [
    {
      title: "PLATAFORMA",
      items: [
        { title: "Entregas", href: "/admin/deliveries", icon: <FiTruck /> },
        { title: "Ordenes", href: "/admin/orders", icon: <FiFileText /> },
        { title: "Liquidaciones", href: "/admin/payouts", icon: <FiCreditCard /> },
        { title: "Productos", href: "/seller/products", icon: <FiShoppingBag /> },
      ],
    },
    {
      title: "CUENTA",
      items: [
        { title: "Perfil y ajustes", href: "/perfil/config", icon: <FiUser /> },
      ],
    },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data, status } = useSession();
  const [collapsed, setCollapsed] = useState(true);
  const [currentHash, setCurrentHash] = useState("");
  const [pendingSellerOrders, setPendingSellerOrders] = useState(0);

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);

    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);

    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, [pathname]);

  const user = (data?.user ?? null) as AppUser | null;
  const role = (user?.role ?? "").toUpperCase();
  const menu = role === "ADMIN" ? menuAdmin : role === "SELLER" ? menuSeller : menuAfiliado;

  useEffect(() => {
    let alive = true;

    if (status !== "authenticated" || role !== "SELLER") {
      queueMicrotask(() => {
        if (alive) setPendingSellerOrders(0);
      });
      return () => {
        alive = false;
      };
    }

    async function loadPendingOrders() {
      try {
        const res = await fetch("/api/seller/orders/pending-count", {
          cache: "no-store",
        });
        const data = await res.json();

        if (!alive) return;
        setPendingSellerOrders(Number(data?.count ?? 0));
      } catch {
        if (!alive) return;
        setPendingSellerOrders(0);
      }
    }

    void loadPendingOrders();

    return () => {
      alive = false;
    };
  }, [role, status, pathname]);

  if (status !== "authenticated") {
    return null;
  }

  return (
    <aside
      className={cn(
        "sticky top-16 flex h-[calc(100dvh-4rem)] flex-col border-r border-slate-200 bg-slate-50 transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className={cn("p-4", collapsed && "px-2")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
          <Image
            src="/img/logosbg.png"
            alt="Afilink"
            width={75}
            height={30}
            className={cn("h-10", collapsed && "hidden")}
          />

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

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
                const [targetPath, targetHash] = item.href.split("#");
                const isSamePath =
                  pathname === targetPath ||
                  (targetPath !== "/" && pathname.startsWith(targetPath));
                const active = targetHash
                  ? isSamePath && currentHash === `#${targetHash}`
                  : isSamePath && !currentHash;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "relative flex items-center rounded-xl px-3 py-2.5 transition",
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
                    {role === "SELLER" &&
                      item.href === "/seller/orders" &&
                      pendingSellerOrders > 0 && (
                        <span
                          className={cn(
                            "absolute h-2.5 w-2.5 rounded-full bg-orange-500 ring-2",
                            active ? "ring-slate-900" : "ring-slate-50",
                            collapsed ? "right-4 top-2.5" : "right-3 top-1/2 -translate-y-1/2"
                          )}
                          aria-label={`${pendingSellerOrders} ordenes pendientes de envio`}
                        />
                      )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-slate-200 p-3", collapsed && "px-2")}>
        <Link
          href={menu.helpHref}
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
