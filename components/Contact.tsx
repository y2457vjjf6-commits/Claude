"use client";

import Reveal from "@/components/Reveal";

export default function Contact() {
  return (
    <section id="kontakt" className="scroll-mt-24 py-20 md:py-28">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 md:px-16 md:py-20">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />

            <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Gotowy na nowe osłony okienne?
                </h2>
                <p className="mt-4 max-w-md text-neutral-300">
                  Skontaktuj się z nami, aby umówić bezpłatny pomiar i otrzymać
                  niezobowiązującą wycenę. Doradzimy najlepsze rozwiązanie dla
                  Twojego wnętrza.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a href="mailto:biuro@lechrol.pl" className="btn-primary">
                    Napisz do nas
                  </a>
                  <a href="https://www.lechrol.pl" className="btn-ghost !bg-transparent !text-white !border-white/30 hover:!border-brand-400">
                    Odwiedź lechrol.pl
                  </a>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  { label: "Lokalizacja", value: "Łomianki k. Warszawy" },
                  { label: "Region", value: "Warszawa i okolice" },
                  { label: "Oferta", value: "Produkcja · Sprzedaż · Montaż" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur"
                  >
                    <p className="text-xs uppercase tracking-wider text-brand-300">
                      {row.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
