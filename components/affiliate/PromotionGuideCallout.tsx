import PromotionGuide from "./PromotionGuide";
import s from "./PromotionGuideCallout.module.css";

export default function PromotionGuideCallout() {
  return (
    <aside className={s.callout} aria-label="Guía para empezar a promocionar">
      <div className={s.copy}>
        <p className={s.title}>Tu primera publicación empieza acá</p>
        <p className={s.description}>Una guía breve para elegir qué compartir y preparar una publicación con tu enlace.</p>
      </div>
      <PromotionGuide />
    </aside>
  );
}
