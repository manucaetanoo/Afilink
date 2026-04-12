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
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import LogoutButton from "@/components/LogoutButton";

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

  const user = (data?.user ?? null) as AppUser | null;
  const userImage = user?.image || "/img/sin-foto.jpg";
  const userName = user?.name || user?.storeSlug || "Usuario";

  const links = [
    { href: "/campaigns", label: "Campanas" },
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
            {user ? (
              <>
                <button
                  type="button"
                  className="relative rounded-full p-1 text-gray-400 hover:text-gray-500"
                >
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">View notifications</span>
                  <BellIcon aria-hidden="true" className="size-6" />
                </button>

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
              className="relative ml-auto shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-500"
            >
              <span className="absolute -inset-1.5" />
              <span className="sr-only">View notifications</span>
              <BellIcon aria-hidden="true" className="size-6" />
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
