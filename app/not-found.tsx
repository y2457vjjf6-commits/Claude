import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6 pt-20">
      <div className="text-center">
        <p className="text-7xl font-bold text-brand-500">404</p>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          Nie znaleziono strony
        </h1>
        <p className="mt-2 text-ink-muted">
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <Link href="/" className="btn-primary mt-8">
          Wróć na stronę główną
        </Link>
      </div>
    </section>
  );
}
