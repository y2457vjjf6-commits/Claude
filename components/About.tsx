"use client";

import Reveal from "@/components/Reveal";

export default function About() {
  return (
    <section
      id="o-nas"
      className="scroll-mt-24 bg-white py-20 md:py-28"
    >
      <div className="container-page grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 p-8">
              <div className="flex h-full flex-col justify-between text-white">
                <span className="text-7xl font-bold leading-none">25+</span>
                <div>
                  <p className="text-2xl font-semibold">lat na rynku</p>
                  <p className="mt-2 max-w-xs text-brand-50">
                    Doświadczenie, które przekłada się na jakość każdego montażu.
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
              <p className="text-2xl font-bold text-ink">Łomianki</p>
              <p className="text-sm text-ink-muted">k. Warszawy</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            O firmie Lechrol
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Specjaliści od osłon okiennych z pasją do detalu
          </h2>
          <div className="mt-5 space-y-4 text-ink-soft">
            <p>
              Lechrol to rodzinna firma działająca nieprzerwanie od 1999 roku.
              Od ćwierć wieku produkujemy, sprzedajemy i montujemy żaluzje, rolety,
              markizy oraz moskitiery dla domów, mieszkań i firm.
            </p>
            <p>
              Stawiamy na sprawdzone materiały, precyzyjny pomiar i fachowy montaż.
              Dzięki temu nasze osłony służą klientom przez lata, zachowując
              estetyczny wygląd i pełną funkcjonalność.
            </p>
          </div>
          <ul className="mt-6 space-y-3">
            {[
              "Bezpłatny pomiar i doradztwo",
              "Produkcja w pełni na wymiar",
              "Profesjonalny montaż i serwis",
            ].map((point) => (
              <li key={point} className="flex items-center gap-3 text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
