import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProduct, products } from "@/lib/products";
import ProductVisual from "@/components/ProductVisual";
import Reveal from "@/components/Reveal";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const product = getProduct(params.slug);
  if (!product) return { title: "Produkt — Lechrol" };
  return {
    title: `${product.name} — Lechrol`,
    description: product.description,
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  const others = products.filter((p) => p.slug !== product.slug);

  return (
    <>
      {/* Nagłówek */}
      <section className="relative overflow-hidden pt-28 md:pt-36">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        </div>
        <div className="container-page grid items-center gap-10 pb-12 md:grid-cols-2">
          <Reveal>
            <nav className="mb-6 flex items-center gap-2 text-sm text-ink-muted">
              <Link href="/" className="hover:text-brand-600">
                Strona główna
              </Link>
              <span>/</span>
              <Link href="/#produkty" className="hover:text-brand-600">
                Produkty
              </Link>
              <span>/</span>
              <span className="text-ink">{product.name}</span>
            </nav>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              {product.tagline}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink md:text-6xl">
              {product.name}
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              {product.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/#kontakt" className="btn-primary">
                Zapytaj o wycenę
              </Link>
              <Link href="/#produkty" className="btn-ghost">
                ← Wszystkie produkty
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-xl shadow-brand-500/5">
              <ProductVisual kind={product.hero} className="h-auto w-full" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Warianty */}
      <section className="py-16 md:py-24">
        <div className="container-page">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Dostępne rodzaje
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              Poniżej przykładowe warianty. Szczegółowe opisy, kolory i tkaniny
              uzupełnimy w kolejnym etapie.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {product.variants.map((variant, i) => (
              <Reveal key={variant.name} delay={i * 0.06}>
                <article className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow duration-300 hover:shadow-xl hover:shadow-brand-500/10">
                  <div className="overflow-hidden bg-neutral-50">
                    <ProductVisual
                      kind={variant.visual}
                      className="h-auto w-full transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-ink">
                      {variant.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {variant.description}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Inne produkty */}
      <section className="border-t border-neutral-200 bg-white py-16 md:py-20">
        <div className="container-page">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Zobacz pozostałe produkty
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {others.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.06}>
                <Link
                  href={`/produkty/${p.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-5 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                    <p className="text-sm text-ink-muted">{p.tagline}</p>
                  </div>
                  <span className="text-xl text-brand-500 transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
