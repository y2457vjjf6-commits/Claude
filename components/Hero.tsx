"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import ErrorBoundary from "@/components/ErrorBoundary";

const Window3D = dynamic(() => import("@/components/Window3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
    </div>
  ),
});

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 md:pt-32">
      {/* soft background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -left-24 top-64 h-80 w-80 rounded-full bg-brand-100/60 blur-3xl" />
      </div>

      <div className="container-page grid items-center gap-10 pb-16 md:grid-cols-2 md:gap-6 md:pb-24">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Producent osłon okiennych od 1999 roku
          </motion.span>

          <motion.h1
            variants={item}
            className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-ink md:text-6xl"
          >
            Światło pod{" "}
            <span className="relative whitespace-nowrap text-brand-500">
              Twoją kontrolą
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
              >
                <path
                  d="M2 9C75 3 225 3 298 9"
                  stroke="#fdba74"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            Żaluzje, rolety, markizy i moskitiery najwyższej jakości. Projektujemy,
            produkujemy i montujemy osłony dopasowane idealnie do Twoich okien.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Link href="/#produkty" className="btn-primary">
              Zobacz produkty
            </Link>
            <Link href="/#kontakt" className="btn-ghost">
              Bezpłatna wycena
            </Link>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-12 flex gap-8 border-t border-neutral-200 pt-6"
          >
            <div>
              <p className="text-2xl font-bold text-ink">25+</p>
              <p className="text-sm text-ink-muted">lat doświadczenia</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">4</p>
              <p className="text-sm text-ink-muted">kategorie produktów</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">100%</p>
              <p className="text-sm text-ink-muted">na wymiar</p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative h-[360px] md:h-[560px]"
        >
          <ErrorBoundary>
            <Window3D />
          </ErrorBoundary>
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-ink-muted">
            Przeciągnij, aby obrócić ↔
          </p>
        </motion.div>
      </div>
    </section>
  );
}
