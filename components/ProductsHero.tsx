"use client";

import { useSession } from "next-auth/react";
import { DM_Sans, Manrope } from "next/font/google";
import styles from "./ProductsHero.module.css";

const dmSans = DM_Sans({ subsets: ["latin"] });
const manrope = Manrope({ subsets: ["latin"] });

export default function ProductsHero() {
  const { data: session, status } = useSession();
  const isAffiliate = status === "authenticated" && session?.user?.role === "AFFILIATE";

  return (
    <section className={`${styles.hero} ${dmSans.className}`} aria-labelledby="catalog-title">
      <p className={styles.eyebrow}><span aria-hidden="true" />EXPLORÁ EL CATÁLOGO</p>
      <div className={styles.headingRow}>
        <h1 id="catalog-title" className={manrope.className}>
          Encontrá tu próximo<br className={styles.desktopBreak} /> producto{" "}
          <span>{isAffiliate ? "para recomendar." : "para crecer."}</span>
        </h1>
        <p className={styles.description}>
          Explorá cursos, ebooks y herramientas digitales.{" "}
          {isAffiliate ? (
            <>Elegí qué compartir y <strong>generá comisiones con tu enlace.</strong></>
          ) : (
            <>Encontrá recursos para aprender algo nuevo o avanzar con tus proyectos.</>
          )}
        </p>
      </div>
    </section>
  );
}
