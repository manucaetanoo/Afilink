"use client";

import { useRef, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { ArrowRightIcon, QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import s from "./PromotionGuide.module.css";

function SharingIllustration() {
  return (
    <div className={s.illustration} role="img" aria-label="Elegí un curso, compartí tu enlace desde el celular y, cuando alguien compra desde tu enlace y se confirma el pago, ganás una comisión.">
      <div>
        <svg viewBox="0 0 120 86" fill="none" aria-hidden="true">
          <rect x="19" y="9" width="78" height="65" rx="9" fill="white" stroke="currentColor" strokeWidth="2" />
          <rect x="27" y="17" width="62" height="30" rx="5" fill="#ffe1c6" />
          <path d="m54 24 13 8-13 8V24Z" fill="currentColor" />
          <path d="M29 56h41M29 63h27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="94" cy="67" r="13" fill="#b74300" /><path d="m88 67 4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Elegí un curso</span>
      </div>
      <ArrowRightIcon className={s.flowArrow} aria-hidden="true" />
      <div>
        <svg viewBox="0 0 120 86" fill="none" aria-hidden="true">
          <rect x="37" y="3" width="47" height="80" rx="10" fill="white" stroke="currentColor" strokeWidth="2" />
          <path d="M52 10h17M57 76h7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <rect x="44" y="21" width="33" height="26" rx="4" fill="#ffe1c6" />
          <path d="m57 27 10 7-10 7V27Z" fill="currentColor" />
          <rect x="47" y="53" width="55" height="17" rx="8" fill="#b74300" />
          <path d="m60 59-2 2a3 3 0 0 0 4 4l3-3m3-3 2-2a3 3 0 0 0-4-4l-3 3m-2 6 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" transform="translate(0 2)" />
          <path d="M78 61h15m-4-4 4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Compartí tu enlace</span>
      </div>
      <ArrowRightIcon className={s.flowArrow} aria-hidden="true" />
      <div>
        <svg viewBox="0 0 120 86" fill="none" aria-hidden="true">
          <rect x="55" y="9" width="54" height="59" rx="7" fill="white" stroke="currentColor" strokeWidth="2" />
          <rect x="62" y="16" width="40" height="22" rx="4" fill="#ffe1c6" />
          <path d="m78 21 10 6-10 6V21Z" fill="currentColor" />
          <path d="M63 47h36M63 54h25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="39" r="12" fill="#ffe1c6" stroke="currentColor" strokeWidth="2" />
          <path d="M10 77v-9a20 20 0 0 1 40 0v9" fill="#ffe1c6" stroke="currentColor" strokeWidth="2" />
          <path d="M15 14h28v14l-7-5H15z" fill="#b74300" /><path d="M21 19h15" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Generas una venta y ganás comisión</span>
      </div>
    </div>
  );
}

export default function PromotionGuide({ fontClassName = "" }: { fontClassName?: string }) {
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className={s.trigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <QuestionMarkCircleIcon aria-hidden="true" />Cómo ganar comisiones
      </button>
      <Dialog open={open} onClose={close} initialFocus={titleRef} lang="es-UY" className={`${s.dialog} ${fontClassName}`}>
        <DialogBackdrop transition className={s.backdrop} />
        <div className={s.viewport}>
          <DialogPanel transition className={s.panel}>
            <header className={s.header}>
              <div>
                <p className={s.eyebrow}>GUÍA PARA AFILIADOS</p>
                <DialogTitle ref={titleRef} tabIndex={-1} className={s.title}>Tu primera publicación, paso a paso</DialogTitle>
              </div>
              <button type="button" onClick={close} className={s.close} aria-label="Cerrar guía"><XMarkIcon aria-hidden="true" /></button>
            </header>
            <div className={s.content}>
              <Description className={s.intro}>Ya tenés tu enlace. Ahora podés compartirlo con personas a las que les interese el producto. Te mostramos cómo empezar.</Description>
              <SharingIllustration />
              <ol className={s.steps}>
                <li><h3>Elegí un producto para tu público</h3><p>Empezá con algo relacionado con sus intereses. Por ejemplo, si les interesa la belleza, un curso de maquillaje puede ser una opción. No necesitás promocionar todo el catálogo a la vez.</p></li>
                <li><h3>Contá por qué puede servirles</h3><p>Explicá qué se aprende, para quién está pensado y qué incluye. Acompañá la publicación con una imagen del producto y usá información real de su ficha. No inventes testimonios.</p></li>
                <li><h3>Compartí tu enlace de afiliado</h3><p>Usá tu enlace personal para que las compras puedan atribuirse a tu cuenta. Probá historias de Instagram con sticker de enlace, estados de WhatsApp o comunidades relacionadas que permitan promociones.</p><p>Compartí con personas interesadas, evitá mensajes masivos y aclará que podés recibir una comisión por la compra.</p></li>
                <li><h3>Generá ingresos con tus recomendaciones</h3><p>Cuando alguien compra desde tu enlace y se confirma el pago, ganás una comisión por esa venta. Seguí tus ventas y comisiones en el panel y solicitá el cobro cuando tengas saldo disponible.</p><p>Revisá también tus clics para ajustar lo que compartís: los clics por sí solos no generan ingresos ni garantizan ventas.</p></li>
              </ol>
              <aside className={s.goal}><h3>Tu primer objetivo</h3><p>Elegí un producto y prepará una publicación clara con tu enlace. Después revisá qué respuesta recibís.</p></aside>
              <section className={s.example} aria-label="Ejemplo de publicación">
                <h3>Una idea para tu publicación</h3>
                <p className={s.hint}>Ejemplo orientativo: reemplazá los campos entre corchetes con información real.</p>
                <blockquote>¿Te interesa aprender <strong>[tema]</strong>? Este curso incluye <strong>[contenido real]</strong> y está pensado para <strong>[público]</strong>. Podés ver el programa y el precio acá: <strong>[tu enlace]</strong>.</blockquote>
              </section>
              <button type="button" className={s.done} onClick={close}>Entendido, voy a empezar<ArrowRightIcon aria-hidden="true" /></button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
