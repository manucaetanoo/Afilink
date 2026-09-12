import Link from "next/link";

type NavItem = {
  name: string;
  href: string;
};

type Navigation = {
  marketplace: NavItem[];
  sellers: NavItem[];
  support: NavItem[];
  legal: NavItem[];
};

const navigation: Navigation = {
  marketplace: [
    { name: "Productos", href: "/products" },
    { name: "Consultar compra", href: "/pedido" },
  ],
  sellers: [
    { name: "Quiero vender mis productos", href: "/contacto?tipo=empresa" },
    { name: "Ingresar", href: "/login" },
    { name: "Panel vendedor", href: "/dashboard/seller" },
  ],
  support: [
    { name: "Contacto", href: "/contacto" },
    { name: "Recuperar contraseña", href: "/forgot-password" },
    { name: "Configurar perfil", href: "/perfil/config" },
  ],
  legal: [{ name: "Terminos y condiciones", href: "/terms" }],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-20 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Afilink" src="/img/logosbg.png" className="h-9" />

            <p className="max-w-sm text-sm/6 text-balance text-slate-600">
              Afilink conecta productos digitales aprobados con afiliados en un
              marketplace pensado para promocionar por comision.
            </p>

            <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
              <p className="text-sm font-semibold text-slate-950">
                ¿Querés vender tus propios productos digitales?
              </p>
              <p className="mt-1 text-sm/6 text-slate-600">
                Solicitá una cuenta empresa para publicar y vender tus propios productos.
              </p>
              <Link
                href="/contacto?tipo=empresa"
                className="mt-3 inline-flex rounded-md bg-[#F78211] px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
              >
                Quiero vender mis productos
              </Link>
            </div>

          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <FooterColumn title="Marketplace" items={navigation.marketplace} />
              <div className="mt-10 md:mt-0">
                <FooterColumn title="Vendedores" items={navigation.sellers} />
              </div>
            </div>

            <div className="md:grid md:grid-cols-2 md:gap-8">
              <FooterColumn title="Soporte" items={navigation.support} />
              <div className="mt-10 md:mt-0">
                <FooterColumn title="Legal" items={navigation.legal} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-slate-200 pt-8 text-sm/6 text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 Afilink. Todos los derechos reservados.</p>
          <p>Marketplace de afiliacion para e-commerce.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <h3 className="text-sm/6 font-semibold text-slate-900">{title}</h3>
      <ul role="list" className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className="text-sm/6 text-slate-600 transition hover:text-slate-950"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
