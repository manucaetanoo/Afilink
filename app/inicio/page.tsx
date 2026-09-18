import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  FiArrowRight,
  FiBarChart2,
  FiDollarSign,
  FiLink,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShoppingBag,
} from "react-icons/fi";
import Navbar from "@/components/Navbar";
import PromotionGuideCallout from "@/components/affiliate/PromotionGuideCallout";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getRenderableProductImageUrls } from "@/lib/product-images";

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("es-UY").format(value);
}

function date(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

function PageShell({
  name,
  eyebrow,
  title,
  description,
  guidance,
  children,
}: {
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  guidance?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fff8f1] text-slate-950">
      <Navbar />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,241,0.96)_0%,rgba(248,250,252,1)_58%,rgba(255,255,255,1)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_18%_18%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(15,23,42,0.09),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
      </div>
      <main className="mx-auto w-full min-w-0 max-w-6xl [overflow-wrap:anywhere] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-xl border border-white/70 bg-white/82 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.10)] backdrop-blur sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-300 to-slate-900" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              {eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Hola{name ? `, ${name}` : ""}. {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
            {guidance}
          </div>
        </section>
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group min-w-0 rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 ${
        primary
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
          : "border-white/80 bg-white/88 text-slate-950 backdrop-blur hover:border-orange-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={primary ? "text-white" : "text-orange-600"}>{icon}</span>
        <FiArrowRight
          className={`mt-1 transition group-hover:translate-x-0.5 ${
            primary ? "text-white/80" : "text-slate-400"
          }`}
        />
      </div>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className={`mt-2 text-sm leading-6 ${primary ? "text-white/70" : "text-slate-500"}`}>
        {description}
      </p>
    </Link>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/80 bg-white/88 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Recommendation({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-orange-200/70 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm">
      <p className="text-sm font-semibold text-orange-950">Siguiente paso</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-orange-950">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-orange-900">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {label}
        <FiArrowRight />
      </Link>
    </section>
  );
}

function ListPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-white/80 bg-white/88 p-5 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold">{title}</h2>
      {empty ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-5 text-sm leading-6 text-slate-500">
          Todavía no hay datos para mostrar.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">{children}</div>
      )}
    </section>
  );
}

type MarketplaceProduct = {
  id: string;
  name: string;
  price: number;
  commissionValue: number;
  imageUrls: string[];
  isActive?: boolean;
  linksCount?: number;
};

function ProductPreviewCard({
  product,
  mode,
}: {
  product: MarketplaceProduct;
  mode: "seller" | "affiliate";
}) {
  const imageUrl = product.imageUrls?.[0] ?? null;
  const earning = Math.round((product.price * product.commissionValue) / 100);

  return (
    <Link
      href={mode === "seller" ? `/seller/products/${product.id}/edit` : `/products/${product.id}`}
      className="group min-w-0 overflow-hidden rounded-lg border border-white/75 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
    >
      <div className="relative aspect-[4/2.7] overflow-hidden bg-gradient-to-br from-orange-100 via-white to-amber-50">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
            Producto digital
          </div>
        )}

        <div className="absolute left-3 top-3 rounded-lg bg-orange-500 px-3 py-2 text-white shadow-lg shadow-orange-500/20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-100">
            Comisión
          </p>
          <p className="text-xl font-black leading-none">{product.commissionValue}%</p>
        </div>

        {mode === "seller" && product.isActive !== undefined && (
          <span className="absolute right-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {product.isActive ? "Activo" : "Inactivo"}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950 transition group-hover:text-orange-700">
          {product.name}
        </h3>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Precio</p>
            <p className="text-base font-semibold text-slate-950">
              {money(product.price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">
              {mode === "seller" ? "Afiliados" : "Ganás"}
            </p>
            <p className="text-base font-semibold text-emerald-700">
              {mode === "seller" ? number(product.linksCount ?? 0) : money(earning)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MarketplaceLiveBlock({
  mode,
  products,
}: {
  mode: "seller" | "affiliate";
  products: MarketplaceProduct[];
}) {
  const isAffiliate = mode === "affiliate";
  const title = isAffiliate
    ? "Marketplace recomendado para vos"
    : "Así se ven tus productos en el marketplace";
  const description = isAffiliate
    ? "Productos activos ordenados por oportunidad de comisión para que elijas rápido qué promocionar."
    : "Una vista rápida de cómo se presenta tu catálogo cuando compradores y afiliados lo encuentran.";
  const href = isAffiliate ? "/products" : "/seller/products";
  const label = isAffiliate ? "Ver marketplace completo" : "Gestionar mis productos";

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-orange-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-800 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="grid min-w-0 grid-cols-1 gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:p-7">
        <div className="flex min-w-0 flex-col justify-between gap-6 text-white">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">
              Marketplace vivo
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/72">
              {description}
            </p>
          </div>

          <Link
            href={href}
            className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-50"
          >
            {label}
            <FiArrowRight />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/10 p-5 text-sm leading-6 text-white/75">
            {isAffiliate
              ? "Todavía no hay productos activos para recomendar."
              : "Todavía no tenés productos para mostrar en esta vista."}
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
            {products.slice(0, 3).map((product) => (
              <ProductPreviewCard
                key={product.id}
                product={product}
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

async function SellerStart({ userId, name }: { userId: string; name: string }) {
  const [products, settlements, items, links] = await Promise.all([
    prisma.product.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        price: true,
        commissionValue: true,
        isActive: true,
        imageUrls: true,
        digitalAccessInstructions: true,
        _count: { select: { links: true } },
      },
    }),
    prisma.settlement.findMany({
      where: { sellerId: userId, order: { status: "PAID" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        netAmount: true,
        grossAmount: true,
        status: true,
        createdAt: true,
        order: {
          select: {
            buyerName: true,
            buyerEmail: true,
            items: {
              where: { sellerId: userId },
              select: { product: { select: { name: true } } },
            },
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: { sellerId: userId, order: { status: "PAID" } },
      take: 100,
      select: { total: true, sellerAmount: true },
    }),
    prisma.affiliateLink.findMany({
      where: { product: { sellerId: userId } },
      select: { _count: { select: { clicks: true } } },
    }),
  ]);

  const activeProducts = products.filter((product) => product.isActive).length;
  const missingAccess = products.filter(
    (product) => !product.digitalAccessInstructions?.trim()
  ).length;
  const sales = items.length;
  const net = items.reduce((sum, item) => sum + item.sellerAmount, 0);
  const available = settlements
    .filter((settlement) => settlement.status === "AVAILABLE")
    .reduce((sum, settlement) => sum + settlement.netAmount, 0);
  const clicks = links.reduce((sum, link) => sum + link._count.clicks, 0);

  const recommendation =
    products.length === 0
      ? {
          title: "Publicá tu primer producto digital",
          description:
            "Sin producto no hay nada para vender ni promocionar. Empezá por cargar el producto y sus instrucciones de acceso.",
          href: "/seller/products/new",
          label: "Crear producto",
        }
      : missingAccess > 0
        ? {
            title: "Completá el acceso digital",
            description:
              "Hay productos sin instrucciones de acceso. Eso puede dejar al comprador sin una forma clara de entrar al curso, archivo o licencia.",
            href: "/seller/products",
            label: "Revisar productos",
          }
        : sales === 0
          ? {
              title: "Revisá tus productos publicados",
              description:
                "Tu catálogo ya está listo. El siguiente paso es revisar cómo se ve para compradores y afiliados.",
              href: "/products",
              label: "Ver catálogo",
            }
          : {
              title: "Revisá ventas y liquidaciones",
              description:
                "Ya hay actividad. Entrá a ventas digitales para controlar compradores, productos vendidos y montos.",
              href: "/seller/orders",
              label: "Ver ventas",
            };

  return (
    <PageShell
      name={name}
      eyebrow="Inicio"
      title="elegí una acción."
      description="Esta pantalla no es un reporte: es el lugar para decidir rápido qué hacer ahora con tus productos digitales."
    >
      <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          href="/seller/products/new"
          title="Crear producto digital"
          description="Cargá nombre, precio, comisión, imagen e instrucciones de acceso."
          icon={<FiPlus />}
          primary
        />
        <ActionCard
          href="/seller/products"
          title="Mis productos"
          description="Editá productos, activación, comisión y datos de acceso."
          icon={<FiPackage />}
        />
        <ActionCard
          href="/seller/orders"
          title="Ventas digitales"
          description="Revisá ventas confirmadas, compradores y liquidaciones."
          icon={<FiShoppingBag />}
        />
        <ActionCard
          href="/dashboard/seller"
          title="Dashboard"
          description="Entrá al panel completo de métricas, reportes y rendimiento."
          icon={<FiBarChart2 />}
        />
      </section>

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Productos activos" value={number(activeProducts)} detail={`${number(products.length)} productos creados`} />
        <Metric label="Ventas confirmadas" value={number(sales)} detail={`Ingreso neto ${money(net)}`} />
        <Metric label="Por liquidar" value={money(available)} detail={`${number(clicks)} clicks en links de afiliado`} />
      </section>

      <MarketplaceLiveBlock
        mode="seller"
        products={products
          .slice(0, 3)
          .map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            commissionValue: product.commissionValue,
            isActive: product.isActive,
            linksCount: product._count.links,
            imageUrls: getRenderableProductImageUrls(product.imageUrls, 1),
          }))}
      />

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Recommendation {...recommendation} />
        <ListPanel title="Últimas ventas" empty={settlements.length === 0}>
          {settlements.map((settlement) => (
            <div key={settlement.id} className="flex min-w-0 flex-col items-start justify-between gap-2 py-3 sm:flex-row sm:gap-4">
              <div className="min-w-0 max-w-full">
                <p className="truncate font-medium">
                  {settlement.order.items.map((item) => item.product.name).join(", ") ||
                    "Venta digital"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {settlement.order.buyerName ??
                    settlement.order.buyerEmail ??
                    "Sin comprador"}{" "}
                  · {date(settlement.createdAt)}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{money(settlement.grossAmount)}</p>
            </div>
          ))}
        </ListPanel>
      </section>
    </PageShell>
  );
}

async function AffiliateStart({ userId, name }: { userId: string; name: string }) {
  const [links, commissions, sales, products] = await Promise.all([
    prisma.affiliateLink.findMany({
      where: { affiliateId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        code: true,
        product: { select: { id: true, name: true } },
        _count: { select: { clicks: true } },
      },
    }),
    prisma.commission.findMany({
      where: { affiliateId: userId, order: { status: "PAID" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        orderItem: { select: { product: { select: { name: true } } } },
      },
    }),
    prisma.orderItem.count({
      where: { affiliateId: userId, order: { status: "PAID" } },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ commissionValue: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        name: true,
        price: true,
        commissionValue: true,
        imageUrls: true,
      },
    }),
  ]);

  const clicks = links.reduce((sum, link) => sum + link._count.clicks, 0);
  const generated = commissions.reduce((sum, commission) => sum + commission.amount, 0);
  const available = commissions
    .filter((commission) => commission.status === "APPROVED")
    .reduce((sum, commission) => sum + commission.amount, 0);

  const recommendation =
    links.length === 0
      ? {
          title: "Elegí un producto para promocionar",
          description:
            "Todavía no tenés links. Entrá al catálogo, elegí un producto digital y generá tu link único.",
          href: "/products",
          label: "Buscar productos",
        }
      : clicks === 0
        ? {
            title: "Compartí tu primer link",
            description:
              "Ya tenés links creados, pero todavía no registran clicks. Copiá uno y compartilo con tu audiencia.",
            href: "/dashboard/affiliate#links",
            label: "Ver mis links",
          }
        : available > 0
          ? {
              title: "Tenés comisión disponible",
              description:
                "Hay dinero por liquidar. Revisá la sección de pagos para solicitar el retiro.",
              href: "/dashboard/affiliate#payments",
              label: "Solicitar pago",
            }
          : {
              title: "Buscá otro producto para probar",
              description:
                "Sumar productos con buena comisión te permite comparar qué convierte mejor.",
              href: "/products",
              label: "Ver productos",
            };

  return (
    <PageShell
      name={name}
      eyebrow="Inicio"
      title="elegí una acción."
      description="Esta pantalla te ayuda a decidir rápido: buscar productos, revisar links o controlar comisiones."
      guidance={<PromotionGuideCallout />}
    >
      <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          href="/products"
          title="Buscar productos"
          description="Encontrá productos digitales para recomendar."
          icon={<FiSearch />}
          primary
        />
        <ActionCard
          href="/dashboard/affiliate#links"
          title="Mis links"
          description="Revisá tus links creados y sus clicks."
          icon={<FiLink />}
        />
        <ActionCard
          href="/dashboard/affiliate#commissions"
          title="Comisiones"
          description="Consultá ventas atribuidas y montos generados."
          icon={<FiDollarSign />}
        />
        <ActionCard
          href="/dashboard/affiliate"
          title="Dashboard"
          description="Entrá al panel completo de métricas, links y comisiones."
          icon={<FiBarChart2 />}
        />
      </section>

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Links creados" value={number(links.length)} detail={`${number(clicks)} clicks registrados`} />
        <Metric label="Ventas atribuidas" value={number(sales)} detail="Compras confirmadas desde tus links" />
        <Metric label="Comisión generada" value={money(generated)} detail={`${money(available)} por liquidar`} />
      </section>

      <MarketplaceLiveBlock
        mode="affiliate"
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          commissionValue: product.commissionValue,
          imageUrls: getRenderableProductImageUrls(product.imageUrls, 1),
        }))}
      />

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Recommendation {...recommendation} />
        <ListPanel title="Productos para empezar" empty={products.length === 0}>
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex min-w-0 flex-col items-start justify-between gap-2 py-3 sm:flex-row sm:gap-4"
            >
              <div className="min-w-0 max-w-full">
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 text-xs text-slate-500">{money(product.price)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                {product.commissionValue}% comisión
              </span>
            </Link>
          ))}
        </ListPanel>
      </section>
    </PageShell>
  );
}

export default async function InicioPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = String(session.user.role ?? "").toUpperCase();
  const name = session.user.name?.split(" ")[0] ?? "";

  if (role === "SELLER") {
    return <SellerStart userId={session.user.id} name={name} />;
  }

  if (role === "ADMIN") {
    redirect("/admin");
  }

  return <AffiliateStart userId={session.user.id} name={name} />;
}
