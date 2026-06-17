"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { products } from "@/lib/products";
import ProductIcon from "@/components/ProductIcon";
import Reveal from "@/components/Reveal";

export default function Products() {
  return (
    <section id="produkty" className="scroll-mt-24 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Nasza oferta
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Kompleksowe osłony okienne na wymiar
          </h2>
          <p className="mt-4 max-w-2xl text-ink-soft">
            Każdy produkt projektujemy indywidualnie i dopasowujemy do Twoich okien.
            Wybierz kategorię, aby poznać dostępne warianty.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <motion.div
              key={product.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.55,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -8 }}
            >
              <Link
                href={`/produkty/${product.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow duration-300 hover:shadow-xl hover:shadow-brand-500/10"
              >
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-50 transition-transform duration-500 group-hover:scale-150" />

                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/25 transition-transform duration-300 group-hover:scale-110">
                  <ProductIcon icon={product.icon} />
                </div>

                <h3 className="relative mt-5 text-xl font-bold text-ink">
                  {product.name}
                </h3>
                <p className="relative mt-1 text-sm font-medium text-brand-600">
                  {product.tagline}
                </p>
                <p className="relative mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
                  {product.description}
                </p>

                <ul className="relative mt-5 flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <li
                      key={variant.name}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-ink-soft transition-colors group-hover:bg-brand-50 group-hover:text-brand-700"
                    >
                      {variant.name}
                    </li>
                  ))}
                </ul>

                <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-600">
                  Zobacz szczegóły
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
