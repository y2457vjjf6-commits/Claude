# Lechrol — strona internetowa

Nowoczesna strona firmy **Lechrol** — producenta osłon okiennych (żaluzje, rolety,
markizy, moskitiery). Jasny, minimalistyczny design z pomarańczowymi akcentami marki,
interaktywną animacją 3D okna z roletą oraz płynnymi przejściami.

## Technologie

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Three.js** + **@react-three/fiber** + **@react-three/drei** — animacja 3D
- **Framer Motion** — płynne animacje i przejścia
- **Tailwind CSS** — stylowanie

## Uruchomienie lokalne

```bash
npm install        # instalacja zależności
npm run dev        # serwer deweloperski → http://localhost:3000
npm run build      # build produkcyjny
npm run start      # uruchomienie wersji produkcyjnej
```

## Struktura

```
app/
  layout.tsx       # układ globalny (nawigacja, stopka, czcionki, SEO)
  page.tsx         # strona główna (sekcje)
  template.tsx     # animacja przejścia między podstronami
  globals.css      # style globalne i klasy pomocnicze
components/
  Navbar.tsx       # górna nawigacja (sticky, menu mobilne)
  Hero.tsx         # sekcja powitalna z animacją 3D
  Window3D.tsx     # interaktywne okno z roletą (Three.js)
  Products.tsx     # oferta produktów (4 kategorie)
  About.tsx        # o firmie
  WhyUs.tsx        # dlaczego my
  Contact.tsx      # kontakt / CTA
  Footer.tsx       # stopka
lib/
  products.ts      # dane produktów i atutów firmy
```

## Co dalej (kolejne etapy)

- Profil klienta i rejestracja użytkowników
- Baza danych (np. PostgreSQL + Prisma)
- Podstrony poszczególnych produktów ze szczegółami
- Formularz wyceny / kontaktu
