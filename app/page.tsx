import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { DM_Sans, Manrope } from "next/font/google";
import { ArrowDownIcon, ArrowUpRightIcon } from "@heroicons/react/24/solid";
import HomeNavbar from "@/components/HomeNavbar";
import { FlipWords } from "@/components/ui/FlipWords";
import { formatMoney } from "@/lib/pricing";
import { PRODUCT_CATEGORIES, normalizeProductCategory } from "@/lib/product-categories";
import { getHomeProducts } from "@/lib/products-catalog";
import s from "./home.module.css";

export const revalidate = 60;

const getCachedHomeProducts = unstable_cache(getHomeProducts, ["home-products"], {
  revalidate: 60,
  tags: ["products"],
});

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--home-body" });
const manrope = Manrope({ subsets: ["latin"], variable: "--home-heading" });
const words = ["ventas", "comisiones", "ganancias", "ingresos"];
const steps = [
  ["Elegí qué recomendar", "Creá tu cuenta gratis y explorá los productos digitales disponibles."],
  ["Compartí tu enlace", "Generá tu link de afiliado y compartilo junto con tu recomendación."],
  ["Ganá una comisión", "Si una persona compra desde tu enlace y la venta se confirma, se genera tu comisión."],
];
const faqs = [
  ["¿Registrarme tiene algún costo?", "No. Crear tu cuenta como afiliado en Afilink es gratis."],
  ["¿Cómo gano dinero?", "Compartís tu enlace de afiliado. Cuando alguien compra desde él y la venta se confirma, se genera una comisión para vos. Podés seguir tus enlaces, ventas y comisiones desde tu panel."],
  ["¿Cuánto puedo ganar?", "Depende de la comisión del producto y de las ventas confirmadas que lleguen desde tu enlace. Revisá la comisión disponible antes de elegir qué promocionar. El registro por sí solo no genera ingresos."],
  ["¿Tengo que crear un curso o un ebook?", "No. Elegís entre los productos digitales disponibles en Afilink y los recomendás con tu propio enlace."],
  ["¿Qué hago después de crear mi cuenta?", "Explorá los productos, elegí uno que conozcas y que le pueda servir a tu público, generá tu enlace y empezá a compartirlo con una recomendación clara."],
];
function RegisterLink({ children }: { children: React.ReactNode }) {
  return <Link className={s.button} href="/register">{children}<ArrowUpRightIcon className={s.arrow} aria-hidden="true" /></Link>;
}

export default async function Home() {
  const products = await getCachedHomeProducts().catch((error) => {
    console.error("Error al cargar los productos de inicio", error);
    return [];
  });

  return (
    <div className={`${dmSans.variable} ${manrope.variable}`}>
      <HomeNavbar />
      <main className={s.home} id="inicio">
        <section className={`${s.hero} ${s.wrap}`} aria-labelledby="hero-title">
          <div>
            <p className={s.eyebrow}><span className={s.shortLine} />SUMATE COMO AFILIADO</p>
            <h1 id="hero-title">Recomendá y generá <span className={s.flipSlot}><FlipWords words={words} duration={2000} className={s.flipWords} /></span></h1>
            <p className={s.heroDescription}>Recomendá productos digitales y <strong>ganá dinero por cada venta realizada desde tu enlace.</strong></p>
            <RegisterLink>Quiero registrarme gratis</RegisterLink>
            <p className={s.micro}><span aria-hidden="true">✓</span> Registro gratuito <span className={s.divider}>/</span> Sin crear un producto propio</p>
            <a className={s.textLink} href="#como-funciona">Conocé cómo funciona <ArrowDownIcon className={s.arrow} aria-hidden="true" /></a>
          </div>
          <div className={s.heroVisual}>
            <div className={s.photoFrame}><Image src="/img/affiliate-home-logo.png" alt="Una persona consulta el panel de Afilink en su celular, con comisiones y una venta confirmada" width={1122} height={1402} priority sizes="(max-width: 700px) 100vw, 50vw" className={s.heroPhoto} /></div>
            <div className={s.linkTag}><ArrowUpRightIcon className={`${s.arrow} ${s.linkSymbol}`} aria-hidden="true" /><div><span className={s.label}>TU ENLACE DE AFILIADO</span><strong>Lo compartís vos.</strong></div></div>
            <div className={s.commissionCard}><span className={s.commissionIcon} aria-hidden="true">$</span><div><span className={s.label}>POR CADA VENTA CONFIRMADA</span><strong>Una comisión para vos.</strong><p>Cuando compran desde tu enlace.</p></div></div>
            <span className={s.visualCaption}>Tus recomendaciones pueden generar ingresos.</span>
          </div>
        </section>
        <section className={`${s.how} ${s.section} ${s.wrap}`} id="como-funciona" aria-labelledby="how-title">
          <div className={s.sectionHeading}><p className={s.eyebrow}>ASÍ FUNCIONA</p><h2 id="how-title">Vos recomendás.<br /><span>Afilink conecta la venta.</span></h2><p>El producto ya existe. Tu parte es acercarlo a personas a las que les pueda servir.</p></div>
          <div className={s.steps}>{steps.map(([title, description], i) => <article className={s.step} key={title}><span className={s.stepNumber}>0{i + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
        <section className={`${s.catalog} ${s.section}`} id="beneficios" aria-labelledby="catalog-title"><div className={s.wrap}>
          <div className={s.catalogHeading}>
            <div>
              <p className={s.eyebrow}>PRODUCTOS REALES PARA RECOMENDAR</p>
              <h2 id="catalog-title">Encontrá tu próximo<br />producto para compartir.</h2>
            </div>
            <p>Los productos del catálogo con más afiliados.</p>
          </div>
          {products.length > 0 ? (
            <div className={s.products}>
              {products.map((product) => {
                const category = normalizeProductCategory(product.category);
                const categoryLabel = PRODUCT_CATEGORIES.find(({ value }) => value === category)?.label ?? "Producto digital";
                const description = product.desc?.trim();

                return (
                  <article key={product.id}>
                    <Link className={s.product} href={`/products/${product.id}`}>
                      <div className={s.productVisual}>
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt=""
                            fill
                            unoptimized
                            className={s.productPhoto}
                          />
                        ) : (
                          <span>Imagen no disponible</span>
                        )}
                      </div>
                      <div className={s.productInfo}>
                        <p className={s.productType}>
                          {categoryLabel} · {product.affiliateCount} {product.affiliateCount === 1 ? "afiliado" : "afiliados"}
                        </p>
                        <h3>{product.name}</h3>
                        {description && <p className={s.productDescription}>{description}</p>}
                        <div className={s.productFooter}>
                          <strong>{formatMoney(product.price)} UYU</strong>
                          <span>Ver producto <ArrowUpRightIcon className={s.arrow} aria-hidden="true" /></span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={s.catalogEmpty}>Por el momento no hay recomendaciones para mostrar.</p>
          )}
          <Link className={s.textLink} href="/products">Explorar el catálogo de Afilink <ArrowUpRightIcon className={s.arrow} aria-hidden="true" /></Link>
        </div></section>
        <section className={`${s.faq} ${s.section} ${s.wrap}`} id="faq" aria-labelledby="faq-title"><div><p className={s.eyebrow}>ANTES DE EMPEZAR</p><h2 id="faq-title">Tus dudas,<br />resueltas.</h2><p>No necesitás tener un producto propio para ser afiliado.</p></div><div className={s.questions}>
          {faqs.map(([question, answer], i) => <details key={question} open={i === 0}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}
        </div></section>
        <section className={`${s.closing} ${s.wrap}`}><div><p className={s.eyebrow}>TU PRÓXIMO PASO</p><h2>Empezá por tu<br /><span>cuenta gratis.</span></h2><p>Elegí qué recomendar. Compartí tu enlace.<br />Ganá una comisión por cada venta confirmada.</p></div><div className={s.closingAction}><RegisterLink>Quiero ser afiliado</RegisterLink><span>Registrarte es gratis.</span></div></section>
      </main>
    </div>
  );
}
