"use client";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  Bars3Icon,
  BellIcon,
  ShoppingBagIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

type AppUser = {
  storeSlug?: string | null;
  email?: string | null;
  image?: string | null;
  name?: string | null;
  role?: "SELLER" | "AFILIADO" | string | null;
};

export default function Navbar() {
  const { data } = useSession();
  const pathname = usePathname();
  const { items, totalAmount, totalItems, removeItem, updateQuantity, clearCart } =
    useCart();
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      createdAt: string;
      readAt: string | null;
    }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const user = (data?.user ?? null) as AppUser | null;
  const userImage = user?.image || "/img/sin-foto.jpg";
  const userName = user?.name || user?.storeSlug || "Usuario";

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadNotifications() {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const payload = (await response.json()) as {
        notifications: Array<{
          id: string;
          title: string;
          message: string;
          createdAt: string;
          readAt: string | null;
        }>;
        unreadCount: number;
      };

      if (!cancelled) {
        setNotifications(payload.notifications);
        setUnreadCount(payload.unreadCount);
      }
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user]);

  async function markNotificationsAsRead() {
    if (unreadCount === 0) return;

    const response = await fetch("/api/notifications", {
      method: "POST",
    });

    if (!response.ok) return;

    setUnreadCount(0);
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      }))
    );
  }

  async function checkoutCart() {
    if (items.length === 0) return;

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok || !data.checkout?.url) {
      alert(data.error ?? "No se pudo iniciar el checkout");
      return;
    }

    window.location.href = data.checkout.url;
  }

  const links = [
    { href: "/campaigns", label: "Campañas" },
    { href: "/products", label: "Productos" },
    { href: "/store", label: "Empresas" },
  ];

  const activeClasses =
    "inline-flex items-center border-b-2 border-orange-600 px-1 pt-1 text-sm font-medium text-gray-900";
  const defaultClasses =
    "inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700";

  return (
    <Disclosure as="nav" className="fixed left-0 right-0 top-0 z-50 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex shrink-0 items-center">
              <img alt="Logo" src="/img/logosbg.png" className="h-8 w-auto" />
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={pathname === link.href ? activeClasses : defaultClasses}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <Menu as="div" className="relative mr-3">
              <MenuButton className="relative rounded-full p-1 text-gray-500 hover:text-gray-700">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Abrir carrito</span>
                <ShoppingBagIcon className="size-6" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white">
                    {totalItems}
                  </span>
                )}
              </MenuButton>

              <MenuItems className="absolute right-0 z-10 mt-2 w-96 origin-top-right rounded-2xl bg-white p-3 shadow-lg outline outline-1 outline-black/5">
                <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-3">
                  <p className="text-sm font-semibold text-slate-900">Carrito</p>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="px-2 py-6 text-sm text-slate-500">
                    Tu carrito esta vacio.
                  </div>
                ) : (
                  <>
                    <div className="max-h-96 overflow-auto py-2">
                      {items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex gap-3 rounded-xl px-2 py-3 hover:bg-slate-50"
                        >
                          <div className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                item.imageUrl ||
                                "https://readymadeui.com/images/product14.webp"
                              }
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              ${item.price.toFixed(2)}
                              {(item.clickId || item.campaignClickId) && " · referido"}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.productId, item.quantity - 1)
                                }
                                className="h-7 w-7 rounded-md border border-slate-200 text-sm font-semibold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-sm">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.productId, item.quantity + 1)
                                }
                                className="h-7 w-7 rounded-md border border-slate-200 text-sm font-semibold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="self-start rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 px-2 pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Total</span>
                        <span className="font-semibold text-slate-900">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void checkoutCart()}
                        className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Pagar carrito
                      </button>
                    </div>
                  </>
                )}
              </MenuItems>
            </Menu>

            {user ? (
              <>
                <Menu as="div" className="relative">
                  <MenuButton
                    onClick={() => void markNotificationsAsRead()}
                    className="relative rounded-full p-1 text-gray-400 hover:text-gray-500"
                  >
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">View notifications</span>
                    <BellIcon aria-hidden="true" className="size-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </MenuButton>

                  <MenuItems className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-2xl bg-white p-2 shadow-lg outline outline-1 outline-black/5">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">
                        Notificaciones
                      </p>
                    </div>

                    <div className="max-h-96 overflow-auto py-1">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <MenuItem key={notification.id}>
                            <div className="rounded-xl px-3 py-3 data-focus:bg-slate-50 data-focus:outline-hidden">
                              <p className="text-sm font-semibold text-slate-900">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {notification.message}
                              </p>
                            </div>
                          </MenuItem>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm text-slate-500">
                          No tienes notificaciones todavia.
                        </div>
                      )}
                    </div>
                  </MenuItems>
                </Menu>

                <Menu as="div" className="relative ml-3">
                  <MenuButton className="relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt=""
                      src={userImage}
                      className="size-8 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5"
                    />
                  </MenuButton>

                  <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-1 outline-black/5">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{userName}</p>
                      <p className="truncate text-xs text-slate-500">{user?.email ?? ""}</p>
                    </div>
                    <MenuItem>
                      <Link
                        href="/perfil/config"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                      >
                        Mi perfil
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      <Link
                        href="/perfil/config"
                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                      >
                        Facturacion y cobro
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      <LogoutButton />
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-4 py-2 text-sm text-gray-800"
              >
                Log in
              </Link>
            )}
          </div>

          <div className="-mr-2 flex items-center sm:hidden">
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
              <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 pb-3 pt-2">
          {links.map((link) => (
            <DisclosureButton
              key={link.href}
              as="a"
              href={link.href}
              className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
            >
              {link.label}
            </DisclosureButton>
          ))}
        </div>
        <div className="border-t border-gray-200 pb-3 pt-4">
          <div className="flex items-center px-4">
            <button
              type="button"
              onClick={() => void checkoutCart()}
              className="relative mr-3 shrink-0 rounded-full p-1 text-gray-500 hover:text-gray-700"
            >
              <ShoppingBagIcon className="size-6" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white">
                  {totalItems}
                </span>
              )}
            </button>
            <div className="shrink-0">
              <img
                alt=""
                src={userImage}
                className="size-10 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5"
              />
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">{userName}</div>
              <div className="text-sm font-medium text-gray-500">{user?.email ?? ""}</div>
            </div>
            <button
              type="button"
              onClick={() => void markNotificationsAsRead()}
              className="relative ml-auto shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-500"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View notifications</span>
              <BellIcon aria-hidden="true" className="size-6" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <div className="mt-3 space-y-1">
            <DisclosureButton
              as="a"
              href="/perfil/config"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Mi perfil
            </DisclosureButton>
            <DisclosureButton
              as="a"
              href="/perfil/config"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Facturacion y cobro
            </DisclosureButton>
            <DisclosureButton
              as="a"
              href="/login"
              className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              Sign out
            </DisclosureButton>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
