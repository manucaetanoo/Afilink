import type { Metadata } from "next";
import Link from "next/link";
import { FiClock, FiFileText, FiHelpCircle, FiMail } from "react-icons/fi";
import Navbar from "@/components/Navbar";
import ContactMailForm from "./ContactMailForm";

export const metadata: Metadata = {
  title: "Contacto - Afilink",
  description: "Contacto y soporte por mail para usuarios de Afilink.",
};

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "soporte@afilink.com";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <FiHelpCircle className="h-4 w-4" />
              Ayuda
            </div>

            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Contáctanos
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Evacua dudas, reporta un problema o pedinos ayuda con tu cuenta,
              productos, campañas, pagos u ordenes. Te respondemos por mail.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <FiMail className="h-5 w-5 text-orange-500" />
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  Email
                </p>
                <Link
                  href={`mailto:${supportEmail}`}
                  className="mt-1 block text-sm text-slate-600 hover:text-orange-600"
                >
                  {supportEmail}
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <FiClock className="h-5 w-5 text-orange-500" />
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  Respuesta
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Te respondemos lo antes posible.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
                <FiFileText className="h-5 w-5 text-orange-500" />
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  Para ayudarte mejor
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Inclui tu email de cuenta, el producto, campañas u orden
                  relacionada y una descripcion clara de la duda.
                </p>
              </div>
            </div>
          </div>

          <ContactMailForm supportEmail={supportEmail} />
        </section>
      </main>
    </div>
  );
}
