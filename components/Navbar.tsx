"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Disclosure,
  DisclosureButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";

type AppUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: "SELLER" | "AFILIADO" | string | null;
};

function classNames(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  // ✅ hooks SIEMPRE primero
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; 
  }

  const user = (data?.user ?? null) as AppUser | null;
  const userImage = user?.image || "/img/sin-foto.jpg";
  const userName = user?.name || "Usuario";
  const userEmail = user?.email || "";


  return (
    <Disclosure
      as="nav"
      className="sticky top-0 z-40 bg-gray-800/95 backdrop-blur border-b border-white/10"
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Mobile menu button */}
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500">
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open main menu</span>
              <Bars3Icon
                aria-hidden="true"
                className="block size-6 group-data-open:hidden"
              />
              <XMarkIcon
                aria-hidden="true"
                className="hidden size-6 group-data-open:block"
              />
            </DisclosureButton>
          </div>

          {/* Left: Logo + desktop nav */}
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-center">
            <Link href="/products" className="flex shrink-0 items-center">
              <img
                alt="Marketafil"
                src="/img/logosbg.png"
                className="h-8 w-auto"
              />
            </Link>
    {/* Left: Logo + desktop nav 
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="flex space-x-2">
                {navigation.map((item) => {
                  const current =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={classNames(
                        current
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-white/5 hover:text-white",
                        "rounded-md px-3 py-2 text-sm font-medium transition"
                      )}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            */}
          </div>

          {/* Right: notifications + user */}
          <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <button
              type="button"
              className="relative rounded-full p-2 text-gray-300 hover:bg-white/5 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-orange-500"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View notifications</span>
              <BellIcon aria-hidden="true" className="size-6" />
            </button>

            {/* Profile dropdown */}
            <Menu as="div" className="relative">
              <MenuButton className="relative flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open user menu</span>

                <img
                  alt={userName ? `Foto de ${userName}` : "Foto de perfil"}
                  src={userImage}
                  className="size-9 rounded-full bg-gray-700 outline -outline-offset-1 outline-white/10 object-cover"
                />

                {/* Opcional: nombre/rol en desktop */}
                <div className="hidden lg:flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold text-white">
                    {status === "loading" ? "Cargando..." : userName}
                  </span>
                  <span className="text-[11px] text-gray-300">
                    {status === "loading" ? "—" : user?.role === "SELLER" ? "Vendedor" : "Afiliado"}
                  </span>
                </div>
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {status === "loading" ? "Cargando..." : userName}
                  </p>
                  {userEmail ? (
                    <p className="text-xs text-gray-500">{userEmail}</p>
                  ) : null}

                  {user?.role ? (
                    <span className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {user.role === "SELLER" ? "Vendedor" : "Afiliado"}
                    </span>
                  ) : null}
                </div>

                <div className="my-1 h-px bg-gray-100" />

                <MenuItem>
                  <Link
                    href="/perfil/config"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    Editar Perfil
                  </Link>
                </MenuItem>

                <MenuItem>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                  >
                    Ajustes
                  </Link>
                </MenuItem>

                <div className="my-1 h-px bg-gray-100" />

                <MenuItem>
                  <div className="px-2 py-1">
                    <LogoutButton />
                  </div>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      {/* Mobile panel 
      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-2 pt-2 pb-3">
          {navigation.map((item) => {
            const current =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <DisclosureButton
                key={item.name}
                as={Link}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={classNames(
                  current
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white",
                  "block rounded-md px-3 py-2 text-base font-medium"
                )}
              >
                {item.name}
              </DisclosureButton>
            );
          })}
        </div>
      </DisclosurePanel>
      */}
    </Disclosure>
  );
}
