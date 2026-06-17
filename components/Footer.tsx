import Link from "next/link";
import { products } from "@/lib/products";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">
              L
            </span>
            <span className="text-lg font-bold tracking-tight">
              Lech<span className="text-brand-500">rol</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
            Producent osłon okiennych z ponad 25-letnim doświadczeniem. Żaluzje,
            rolety, markizy i moskitiery — produkcja, sprzedaż i montaż.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink">Produkty</h4>
          <ul className="mt-4 space-y-2">
            {products.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/#produkty`}
                  className="text-sm text-ink-muted transition-colors hover:text-brand-600"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink">Kontakt</h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            <li>Łomianki k. Warszawy</li>
            <li>woj. mazowieckie</li>
            <li>
              <a
                href="https://www.lechrol.pl"
                className="transition-colors hover:text-brand-600"
              >
                www.lechrol.pl
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-200">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-ink-muted md:flex-row">
          <p>© {new Date().getFullYear()} Lechrol. Wszelkie prawa zastrzeżone.</p>
          <p>Żaluzje · Rolety · Markizy · Moskitiery</p>
        </div>
      </div>
    </footer>
  );
}
