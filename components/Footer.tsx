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
    { name: "Campanas", href: "/campaigns" },
    { name: "Tiendas", href: "/store" },
    { name: "Seguir un pedido", href: "/pedido" },
  ],
  sellers: [
    { name: "Crear cuenta", href: "/register" },
    { name: "Ingresar", href: "/login" },
    { name: "Panel vendedor", href: "/dashboard/seller" },
    { name: "Crear producto", href: "/seller/products/new" },
  ],
  support: [
    { name: "Contacto", href: "/contacto" },
    { name: "Recuperar contrasena", href: "/forgot-password" },
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
              Afilink conecta vendedores, afiliados y compradores en un marketplace
              pensado para promocionar productos por comision.
            </p>

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
