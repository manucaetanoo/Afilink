import type { Metadata } from "next";
import Link from "next/link";
import PrintTermsButton from "./PrintTermsButton";

export const metadata: Metadata = {
  title: "Términos y Condiciones - Afilink",
  description:
    "Condiciones de uso de Afilink para compradores, sellers y afiliados.",
};

const sections = [
  {
    title: "Información general",
    paragraphs: [
      "Afilink es una plataforma tecnológica que permite conectar a vendedores, afiliados y compradores dentro de un mismo entorno digital. A través de Afilink, los vendedores pueden publicar productos, crear campañas comerciales y definir comisiones de afiliación; los afiliados pueden promocionar productos mediante enlaces de seguimiento; y los compradores pueden adquirir productos publicados en la plataforma.",
      "Estos Términos y Condiciones regulan el acceso, registro, navegación y uso de Afilink, así como las operaciones realizadas dentro de la plataforma. Al crear una cuenta, publicar productos, compartir enlaces, realizar compras o utilizar cualquier funcionalidad disponible, el usuario declara haber leído y aceptado estas condiciones. Si el usuario no está de acuerdo con ellas, deberá abstenerse de utilizar la plataforma.",
      "Afilink actúa como un intermediario tecnológico. Esto significa que facilita herramientas para publicar, promocionar, atribuir ventas, procesar pagos y ordenar información comercial, pero no reemplaza las obligaciones propias de cada vendedor frente a sus compradores, ni garantiza por sí misma la calidad, disponibilidad, entrega o aptitud de los productos ofrecidos por terceros.",
    ],
  },
  {
    title: "Usuarios de la plataforma",
    paragraphs: [
      "Dentro de Afilink pueden existir distintos tipos de usuarios. El seller o vendedor es quien publica productos, administra su disponibilidad, define precios, atiende consultas relacionadas con sus publicaciones y asume la responsabilidad principal por la entrega, garantía y cumplimiento de lo ofrecido. El afiliado es quien promociona productos o campañas mediante enlaces generados por la plataforma y puede recibir comisiones cuando una venta válida sea atribuida correctamente a su actividad. El comprador es la persona que adquiere productos publicados dentro de Afilink.",
      "Cada usuario se compromete a brindar información verdadera, actualizada y suficiente para operar dentro de la plataforma. Afilink podrá solicitar datos adicionales cuando sean necesarios para verificar identidad, prevenir fraude, procesar pagos, cumplir obligaciones legales, realizar liquidaciones o proteger la seguridad del servicio.",
      "El usuario es responsable por la confidencialidad de sus credenciales de acceso y por toda actividad realizada desde su cuenta. Ante cualquier uso no autorizado, sospecha de acceso indebido o incidente de seguridad, deberá comunicarse con Afilink mediante los canales oficiales de contacto.",
    ],
  },
  {
    title: "Funcionamiento de ventas y campañas",
    paragraphs: [
      "Los sellers pueden publicar productos y crear campañas para que sean difundidas por afiliados. Las condiciones comerciales de cada producto, incluyendo precio, stock, descripción, imágenes, talles, disponibilidad, comisiones y cualquier otra información relevante, deberán ser claras, veraces y mantenerse actualizadas por el seller.",
      "Las comisiones de afiliación se generan únicamente cuando la plataforma registra una venta válida y puede atribuirla al enlace o campaña correspondiente. La existencia de un clic, visita o interacción previa no garantiza por sí sola el derecho a cobrar una comisión. Afilink podrá revisar, ajustar o cancelar comisiones cuando existan errores técnicos, operaciones anuladas, devoluciones, contracargos, fraude, abuso del sistema o incumplimiento de estos términos.",
      "Los afiliados deberán promocionar productos de forma honesta y transparente. No podrán utilizar spam, publicidad engañosa, compras simuladas, automatizaciones indebidas, manipulación de métricas, suplantación de identidad, tráfico artificial o cualquier práctica destinada a obtener comisiones de manera irregular.",
    ],
  },
  {
    title: "Compras, pagos y confirmación de órdenes",
    paragraphs: [
      "Las compras realizadas dentro de Afilink se procesan mediante proveedores externos de pago, incluyendo dLocal Go u otros proveedores que la plataforma pueda incorporar. Afilink no controla todos los tiempos, aprobaciones, rechazos, validaciones, comisiones, impuestos o retenciones aplicadas por dichos proveedores, por lo que algunas operaciones pueden quedar sujetas a verificaciones adicionales.",
      "Una orden podrá considerarse pendiente, aprobada, rechazada, cancelada, expirada o en revisión según la información disponible en la plataforma y la respuesta del proveedor de pagos. La confirmación de pago no libera al seller de sus obligaciones respecto de la preparación, entrega y atención posterior de la compra.",
      "El comprador deberá ingresar datos de entrega completos y correctos. La falta de información, errores en la dirección, teléfonos inválidos, ausencia de respuesta o cualquier dato insuficiente podrá generar demoras, cancelaciones o la necesidad de coordinación adicional con el seller.",
    ],
  },
  {
    title: "Liquidaciones, comisiones y retenciones",
    paragraphs: [
      "Afilink podrá aplicar comisiones, cargos de servicio o descuentos operativos sobre las ventas realizadas dentro de la plataforma. Además, los proveedores de pago pueden aplicar costos, impuestos, retenciones, cargos financieros u otros conceptos que serán descontados de los montos a liquidar cuando corresponda.",
      "Las liquidaciones a sellers y afiliados estarán sujetas a la acreditación efectiva del pago, a la validación de la orden, a la ausencia de reclamos o contracargos y al cumplimiento de las condiciones internas de Afilink. La plataforma podrá establecer períodos de espera antes de liberar fondos, especialmente para cubrir riesgos de devoluciones, cancelaciones, desconocimientos de pago o actividad irregular.",
      "Afilink podrá retener temporalmente saldos, suspender liquidaciones o solicitar documentación adicional cuando existan indicios de fraude, incumplimiento, reclamos abiertos, inconsistencias de identidad, actividad sospechosa o requerimientos de autoridades competentes.",
    ],
  },
  {
    title: "Responsabilidad del seller",
    paragraphs: [
      "El seller es responsable por los productos que publica, por la exactitud de sus descripciones, por la disponibilidad de stock, por el cumplimiento de precios informados, por la entrega de los productos vendidos y por la atención de reclamos relacionados con calidad, garantía, cambios, devoluciones o cualquier otra obligación asociada a su actividad comercial.",
      "Queda prohibido publicar productos ilegales, falsificados, fraudulentos, peligrosos, engañosos, que vulneren derechos de terceros o que incumplan normativa aplicable. Afilink podrá pausar, eliminar o restringir publicaciones y cuentas cuando detecte contenido incompatible con estas condiciones o con la seguridad de la plataforma.",
      "Cuando corresponda, el seller deberá cumplir con las normas de defensa del consumidor, información clara sobre productos y servicios, garantías, impuestos, facturación y demás obligaciones legales aplicables a su actividad.",
    ],
  },
  {
    title: "Cancelaciones, devoluciones y contracargos",
    paragraphs: [
      "Si una compra es cancelada, devuelta, reembolsada, rechazada por el proveedor de pagos o afectada por un contracargo, Afilink podrá cancelar o revertir comisiones asociadas a esa operación. También podrá descontar saldos futuros, retener importes pendientes o ajustar liquidaciones ya generadas cuando resulte necesario para reflejar el estado real de la operación.",
      "Las políticas específicas de cambio, devolución o garantía podrán depender del seller y de la normativa aplicable. Afilink podrá intervenir para ordenar información, registrar eventos o facilitar la gestión, pero la responsabilidad principal por el producto ofrecido corresponde al seller.",
    ],
  },
  {
    title: "Uso permitido y restricciones",
    paragraphs: [
      "El usuario se obliga a utilizar Afilink de buena fé y únicamente para fines lícitos. No podrá interferir con el funcionamiento de la plataforma, intentar acceder a sistemas no autorizados, extraer información de forma abusiva, cargar contenido malicioso, vulnerar derechos de propiedad intelectual, suplantar a terceros o utilizar la plataforma para actividades fraudulentas.",
      "Afilink podrá suspender, limitar o cancelar cuentas, publicaciones, campañas, enlaces o comisiones cuando detecte incumplimientos, riesgos de seguridad, abuso del servicio, reclamos reiterados, información falsa o cualquier conducta que pueda afectar a otros usuarios, a la plataforma o a terceros.",
    ],
  },
  {
    title: "Datos personales y privacidad",
    paragraphs: [
      "Para operar correctamente, Afilink puede tratar datos personales de usuarios, compradores, sellers y afiliados, tales como datos de identificación, contacto, entrega, actividad dentro de la plataforma, información de órdenes y datos necesarios para pagos o liquidaciones. Este tratamiento se realiza con la finalidad de prestar el servicio, gestionar compras, atribuir comisiones, prevenir fraude, brindar soporte y cumplir obligaciones legales.",
      "Afilink procurará aplicar medidas razonables de seguridad y confidencialidad sobre la información tratada. Los datos podrán ser compartidos con proveedores necesarios para la operación del servicio, incluyendo procesadores de pago, servicios técnicos, herramientas de comunicación, logística o autoridades cuando exista obligación legal.",
      "Los titulares de datos podrán solicitar información, actualización, rectificación o eliminación de sus datos personales cuando corresponda, utilizando los canales oficiales de contacto de la plataforma.",
    ],
  },
  {
    title: "Disponibilidad del servicio",
    paragraphs: [
      "Afilink procura mantener la plataforma disponible y funcionando correctamente, pero no garantiza que el servicio sea ininterrumpido, libre de errores o compatible con todos los dispositivos, navegadores o integraciones externas. Pueden existir interrupciones por mantenimiento, actualizaciones, fallas técnicas, problemas de conectividad, incidentes de terceros o causas fuera del control razonable de la plataforma.",
      "Afilink no será responsable por pérdidas indirectas, lucro cesante, pérdida de oportunidades comerciales, fallas de proveedores externos, demoras de pago, interrupciones temporales, errores de carga de información por parte de usuarios o incumplimientos atribuibles a sellers, afiliados, compradores o terceros.",
    ],
  },
  {
    title: "Cambios en estas condiciones",
    paragraphs: [
      "Afilink podrá modificar estos Términos y Condiciones cuando lo considere necesario para reflejar cambios en la plataforma, en el modelo de negocio, en proveedores externos, en requisitos legales o en medidas de seguridad. Las modificaciones entrarán en vigencia desde su publicación, salvo que se indique expresamente una fecha diferente.",
      "El uso continuado de la plataforma luego de publicadas las modificaciones implica la aceptación de la versión vigente. Se recomienda revisar esta página periódicamente.",
    ],
  },
  {
    title: "Ley aplicable y contacto",
    paragraphs: [
      "Estos Términos y Condiciones se rigen por las leyes de la República Oriental del Uruguay, sin perjuicio de las normas de protección al consumidor, protección de datos personales u otras disposiciones que resulten aplicables según el tipo de operación y usuario involucrado.",
      "Para consultas, reclamos o solicitudes relacionadas con estos términos, privacidad, cuentas, compras, campañas o liquidaciones, el usuario podrá comunicarse con Afilink mediante los canales oficiales disponibles en la plataforma.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-[#1c1e21]">
      <article className="mx-auto max-w-[820px] px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-6">
          <p className="mb-3 text-sm font-semibold text-slate-500">Afilink</p>
          <h1 className="text-[28px] font-bold leading-tight tracking-normal text-[#1c1e21] sm:text-[34px]">
            Condiciones del servicio
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-6 text-slate-600">
            <span>Última actualización: 8 de mayo de 2026</span>
            <span className="hidden text-slate-400 sm:inline">|</span>
            <PrintTermsButton />
          </div>
        </header>

        <div className="space-y-7 text-[16px] leading-[1.42] text-[#1c1e21]">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-[24px] font-bold leading-tight tracking-normal text-[#1c1e21]">
                {section.title}
              </h2>

              <div className="space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="mb-2 text-[24px] font-bold leading-tight tracking-normal text-[#1c1e21]">
              Contacto
            </h2>
            <p>
              Si necesitás comunicarte con Afilink por cualquier asunto
              relacionado con estas condiciones, podés hacerlo desde la página de{" "}
              <Link
                href="/contacto"
                className="font-semibold text-orange-600 underline-offset-2 hover:underline"
              >
                contacto
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
