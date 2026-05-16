"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { motion } from "framer-motion";
import { FlipWords } from "@/components/ui/FlipWords";
import {
  UserIcon,
  MegaphoneIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  CursorArrowRaysIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import HomeNavbar from "@/components/HomeNavbar";

const steps = [
  {
    label: "Paso 1",
    title: "Crea tu cuenta",
    description:
      "Registrate gratis y elegí si querés vender tus productos o generar ingresos como afiliado.",
    icon: UserIcon,
  },
  {
    label: "Paso 2",
    title: "Publica o elige una campaña",
    description:
      "Si sos vendedor, creá una campaña para tus productos. Si sos afiliado, elegí una campaña para promocionar.",
    icon: MegaphoneIcon,
  },
  {
    label: "Paso 3",
    title: "Compartí tu link y genera ventas",
    description:
      "Compartí tu link de afiliado, generá ventas y seguí tus comisiones desde el dashboard.",
    icon: ChartBarIcon,
  },
];

const features = [
  {
    name: "Vendé con afiliados",
    description:
      "Publicá tus productos, creá campañas y permití que otras personas los promocionen por comisión.",
    icon: ShoppingBagIcon,
  },
  {
    name: "Links personalizados",
    description:
      "Cada afiliado obtiene su propio link para compartir campañas y generar ventas rastreables.",
    icon: CursorArrowRaysIcon,
  },
  {
    name: "Dashboard claro",
    description:
      "Visualizá ventas, comisiones, productos y campañas desde un panel simple.",
    icon: ChartBarIcon,
  },
  {
    name: "Comisiones transparentes",
    description:
      "Se muestra de forma clara cuánto se cobra, cuánto gana el vendedor y cuánto gana el afiliado.",
    icon: ShieldCheckIcon,
  },
];

const roles = [
  {
    name: "Para vendedores",
    description:
      "Ideal para marcas, emprendedores o tiendas que quieren vender más sin depender solo de publicidad paga.",
    features: [
      "Publicá productos",
      "Creá campañas",
      "Trabajá con afiliados",
      "Pagá comisión solo cuando vendés",
    ],
    highlighted: true,
  },
  {
    name: "Para afiliados",
    description:
      "Pensado para personas que quieren generar ingresos recomendando productos de otras tiendas.",
    features: [
      "Elegí campañas",
      "Compartí tu link",
      "Generá comisiones",
      "Seguí tus resultados",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: "¿Qué es Afilink?",
    answer:
      "Afilink es una plataforma que conecta vendedores con afiliados. Los vendedores publican productos y campañas, y los afiliados los promocionan a cambio de una comisión.",
  },
  {
    question: "¿Cómo gana dinero un afiliado?",
    answer:
      "El afiliado comparte su link personalizado el cual le brinda Afilink. Cuando una persona compra desde ese link y la venta se confirma, se genera una comisión.",
  },
  {
    question: "¿Qué beneficio tiene un vendedor?",
    answer:
      "Puede aumentar el alcance de sus productos porque otras personas los promocionan. Solo paga comisión cuando se genera una venta.",
  },
];

type StatItem = [string, string, ComponentType<SVGProps<SVGSVGElement>>];

const stats: StatItem[] = [
  ["Ventas generadas", "+$57.000", ArrowTrendingUpIcon],
  ["Afiliados activos", "24", CursorArrowRaysIcon],
  ["Comisiones aprobadas", "+$18.450", SparklesIcon],
];

const integrations = [
  {
    name: "Shopify",
    logo: "/img/Shopify-Logo-PNG.png",
    description: "Importa productos, precios, imagenes y stock desde tu tienda.",
  },
  {
    name: "Fenicio",
    logo: "/img/fenicio-logo.png",
    description: "Conecta catalogos Fenicio mediante el feed del comercio.",
  },
];

export default function Home() {
  return (
    <div className="bg-white text-gray-900">
      <HomeNavbar />

      <main className="isolate">
        <section id="inicio" className="relative isolate overflow-hidden px-6 pt-14 lg:px-8">
          <div className="absolute inset-x-0 -top-40 -z-10 blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#E89C51] to-orange-200 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
          </div>

          <div className="mx-auto max-w-3xl py-32 text-center sm:py-48 lg:py-56">

            <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl">
              Haz crecer tus{" "}
              <span className="text-[#E89C51]">
                <FlipWords
                  words={["ingresos", "ventas", "ganancias", "comisiones"]}
                  duration={2000}
                />
              </span>
            </h1>

            <p className="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
              En Afilink conectamos empresas que quieren aumentar sus ventas con promotores que buscan generar ingresos por internet.
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/register"
                className="rounded-md bg-[#F78211] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d98b3f]"
              >
                Únete ahora
              </Link>

              <a href="#como-funciona" className="text-sm font-semibold text-gray-900">
                Ver más <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

{/* <section className="mx-auto max-w-7xl px-6 lg:px-8">
  <div className="rounded-3xl border border-[#E89C51]/10 bg-[#f8f6f3] p-6 shadow-xl shadow-orange-950/5 sm:p-10">
    <div className="grid gap-6 lg:grid-cols-3">
      {stats.map(([label, value, Icon]) => (
        <div
          key={label}
          className="group rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-[#fffdfb] to-orange-50/40 p-6 transition hover:-translate-y-1 hover:border-[#E89C51]/40 hover:shadow-lg hover:shadow-orange-950/10"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E89C51]/30 text-[#E89C51] ring-1 ring-[#E89C51]/20 transition group-hover:bg-[#E89C51] group-hover:text-white">
            <Icon className="h-6 w-6" />
          </div>

          <p className="mt-6 text-sm font-medium text-gray-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-semibold text-gray-950">
            {value}
          </p>
        </div>
      ))}
    </div>
  </div>
</section> */}


        <section id="como-funciona" className="relative px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold text-[#F78211]">¿Cómo empezar?</h2>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              Empezar en Afilink es simple
            </p>
            <p className="mt-6 text-lg text-gray-500">
              En pocos pasos podés vender productos o generar comisiones como afiliado.
            </p>
          </div>

          <div className="mx-auto mt-20 grid max-w-6xl gap-8 lg:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-orange-50 text-[#F78211]">
                  <step.icon className="size-7" />
                </div>

                <span className="mt-8 block text-sm font-semibold text-[#F78211]">
                  {step.label}
                </span>

                <h3 className="mt-2 text-2xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-gray-500">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="beneficios" className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold text-[#F78211]">Beneficios</h2>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              Todo lo necesario para vender y promocionar
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-10 lg:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <div className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-lg bg-[#F78211]">
                  <feature.icon className="size-6 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{feature.name}</h3>
                <p className="mt-2 text-base leading-7 text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid items-center gap-10 rounded-3xl bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-base font-semibold text-[#F78211]">
                Integraciones
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Conectá tu tienda sin cargar todo a mano
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-500">
                Afilink permite importar productos desde tiendas Shopify y Fenicio
                para publicar catalogos mas rapido y empezar a trabajar con
                afiliados en menos pasos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="rounded-2xl border border-orange-100 bg-[#fffaf6] p-5"
                >
                  <div className="flex min-h-16 items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {integration.name}
                    </h3>
                    <div className="flex h-16 items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={integration.logo}
                        alt={integration.name}
                        className="max-h-14 max-w-[140px] object-contain"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {integration.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-base font-semibold text-[#F78211]">Elegí tu rol</h2>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                Una plataforma para vendedores y afiliados
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-2">
              {roles.map((role) => (
                <div
                  key={role.name}
                  className={`rounded-3xl bg-white p-8 shadow-sm ${
                    role.highlighted
                      ? "ring-2 ring-[#F78211]"
                      : "ring-1 ring-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold text-gray-900">{role.name}</h3>
                    {role.highlighted && (
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#E89C51]">
                        Popular
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-500">{role.description}</p>

                  <ul className="mt-8 space-y-3 text-sm text-gray-600">
                    {role.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <CheckIcon className="h-6 w-5 flex-none text-[#F78211]" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className="mt-8 block rounded-md bg-[#F78211] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#d98b3f]"
                  >
                    Empezar ahora
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Preguntas frecuentes
          </h2>

          <dl className="mt-16 divide-y divide-gray-900/10">
            {faqs.map((faq) => (
              <div key={faq.question} className="py-8 lg:grid lg:grid-cols-12 lg:gap-8">
                <dt className="text-base font-semibold text-gray-900 lg:col-span-5">
                  {faq.question}
                </dt>
                <dd className="mt-4 lg:col-span-7 lg:mt-0">
                  <p className="text-base leading-7 text-gray-500">{faq.answer}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="px-6 pb-24 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl bg-gray-950 px-6 py-16 text-center shadow-xl sm:px-12">
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Empezá a vender más o generar comisiones hoy
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-300">
              Afilink te da una forma simple de conectar productos, campañas y personas que pueden ayudarte a crecer.
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/register"
                className="rounded-md bg-[#F78211] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d98b3f]"
              >
                Únete ahora
              </Link>

              <Link href="/login" className="text-sm font-semibold text-white">
                Iniciar sesión <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
