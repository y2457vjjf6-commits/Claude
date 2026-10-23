# -*- coding: utf-8 -*-
"""Rysuje wbudowane ikony produktów i zapisuje je do src/assets/productIcons.ts.

Uruchomienie:  python3 frontend/scripts/ikony-produktow.py


Ikony z katalogu producenta są białe — na białej ofercie byłyby niewidoczne.
Te mają ten sam kształt, ale jasne wypełnienie i widoczny kontur, więc czytają
się i na papierze, i na ciemnym tle programu. Tło zostaje przezroczyste.
"""
import base64, json, pathlib

KONTUR = '#2a2f36'
KONTUR_MOCNY = '#14181d'
JASNY = '#ffffff'
SREDNI = '#d9dde2'
CIEMNY = '#aeb5bd'
W = 2.0

def svg(body, defs=''):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">'
        f'{("<defs>" + defs + "</defs>") if defs else ""}'
        f'<g fill="none" stroke="{KONTUR}" stroke-width="{W}" '
        'stroke-linecap="round" stroke-linejoin="round">'
        f'{body}</g></svg>'
    )

def rect(x, y, w, h, fill=JASNY, rx=1.5, stroke=None, sw=None):
    s = f' stroke="{stroke}"' if stroke else ''
    t = f' stroke-width="{sw}"' if sw else ''
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"{s}{t}/>'

def line(x1, y1, x2, y2, sw=1.2, stroke=KONTUR):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"/>'

def path(d, fill='none', sw=None, stroke=None):
    s = f' stroke="{stroke}"' if stroke else ''
    t = f' stroke-width="{sw}"' if sw else ''
    return f'<path d="{d}" fill="{fill}"{s}{t}/>'

# --- wspólne elementy ----------------------------------------------------
def prowadnice(x1=22, x2=106, y=28, y2=110):
    """Pionowe prowadnice po bokach — wspólne dla rolet w kasecie."""
    return (rect(x1 - 5, y, 5, y2 - y, SREDNI, 1) + rect(x2, y, 5, y2 - y, SREDNI, 1))

def kaseta(x=18, y=16, w=92, h=14):
    return rect(x, y, w, h, SREDNI, 2, KONTUR_MOCNY, 2.2)

def listwa(y, x=22, w=84, h=7):
    return rect(x, y, w, h, CIEMNY, 1.5, KONTUR_MOCNY, 2.2)

IKONY = {}

# 1. Karnisz --------------------------------------------------------------
falban = lambda x0, x1, y: f'M{x0} {y} q7 6 14 0 q7 -6 14 0 q7 6 14 0'
IKONY['karnisz'] = svg(
    # drążek z końcówkami
    f'<circle cx="16" cy="24" r="6" fill="{CIEMNY}" stroke="{KONTUR_MOCNY}" stroke-width="2.2"/>'
    f'<circle cx="112" cy="24" r="6" fill="{CIEMNY}" stroke="{KONTUR_MOCNY}" stroke-width="2.2"/>'
    + rect(22, 21, 84, 6, SREDNI, 3, KONTUR_MOCNY, 2.2)
    # lewa firana
    + path('M30 30 h26 v72 q-13 8 -26 0 z', JASNY, 2.2, KONTUR_MOCNY)
    + line(38, 32, 38, 100) + line(46, 32, 46, 102)
    # prawa firana
    + path('M72 30 h26 v72 q-13 8 -26 0 z', JASNY, 2.2, KONTUR_MOCNY)
    + line(80, 32, 80, 102) + line(88, 32, 88, 100)
)

# 2. Roleta materiałowa ---------------------------------------------------
IKONY['roleta-materialowa'] = svg(
    prowadnice()
    + rect(22, 30, 84, 48, JASNY, 1, KONTUR_MOCNY, 2.2)
    + kaseta()
    + listwa(y=78)
    + line(28, 44, 100, 44, 1.0, CIEMNY) + line(28, 56, 100, 56, 1.0, CIEMNY)
    + line(28, 68, 100, 68, 1.0, CIEMNY)
    # pusty prześwit okna pod roletą
    + line(26, 110, 102, 110, 1.6, KONTUR)
)

# 3. Roleta dzień-noc -----------------------------------------------------
pasy = ''.join(rect(23, y, 82, 5, CIEMNY, 0.5) for y in range(34, 78, 10))
IKONY['roleta-dzien-noc'] = svg(
    prowadnice()
    + rect(22, 30, 84, 52, JASNY, 1, KONTUR_MOCNY, 2.2)
    + pasy
    + kaseta()
    + listwa(y=82)
    + line(26, 110, 102, 110, 1.6, KONTUR)
)

# 4. Roleta rzymska -------------------------------------------------------
IKONY['roleta-rzymska'] = svg(
    rect(18, 16, 92, 11, SREDNI, 2, KONTUR_MOCNY, 2.4)
    + rect(22, 27, 84, 38, JASNY, 1, KONTUR_MOCNY, 2.2)
    # upięte fałdy: każda osobną bryłą, bo przy 22 mm zlewają się w plamę
    + path('M22 65 h84 v12 q-42 8 -84 0 z', JASNY, 2.2, KONTUR_MOCNY)
    + path('M22 79 h84 v12 q-42 8 -84 0 z', SREDNI, 2.2, KONTUR_MOCNY)
    + path('M22 93 h84 v12 q-42 8 -84 0 z', JASNY, 2.2, KONTUR_MOCNY)
    + line(28, 42, 100, 42, 1.2, CIEMNY)
)

# 5. Roleta zewnętrzna ----------------------------------------------------
pancerz = ''.join(rect(25, y, 78, 6, SREDNI, 1, KONTUR, 1.0) for y in range(34, 76, 8))
IKONY['roleta-zewnetrzna'] = svg(
    rect(16, 14, 96, 16, CIEMNY, 2, KONTUR_MOCNY, 2.4)   # skrzynka
    + rect(20, 30, 88, 80, JASNY, 1.5, KONTUR_MOCNY, 2.4)  # rama okna
    + prowadnice(x1=25, x2=103, y=30, y2=110)
    + pancerz
    + listwa(76, x=25, w=78, h=7)
    + line(24, 110, 104, 110, 2.0, KONTUR_MOCNY)
)

# 6. Roleta kasetowa ------------------------------------------------------
IKONY['roleta-kasetowa'] = svg(
    prowadnice(y=34, y2=108)
    + rect(22, 34, 84, 46, JASNY, 1, KONTUR_MOCNY, 2.2)
    + rect(14, 14, 100, 20, SREDNI, 4, KONTUR_MOCNY, 2.4)  # wyraźna kaseta
    + line(22, 24, 106, 24, 1.2, CIEMNY)
    + listwa(y=80)
    + line(28, 48, 100, 48, 1.0, CIEMNY) + line(28, 62, 100, 62, 1.0, CIEMNY)
    + line(26, 108, 102, 108, 1.6, KONTUR)
)

# 7. Żaluzja aluminiowa ---------------------------------------------------
lamele_a = ''.join(rect(22, y, 84, 6, JASNY, 1, KONTUR, 1.5) for y in range(33, 98, 10))
IKONY['zaluzja-aluminiowa'] = svg(
    rect(18, 18, 92, 12, SREDNI, 2, KONTUR_MOCNY, 2.2)
    + lamele_a
    + rect(22, 100, 84, 7, CIEMNY, 1.5, KONTUR_MOCNY, 2.2)
    + line(100, 30, 100, 100, 1.0, CIEMNY)
)

# 8. Żaluzja drewniana ----------------------------------------------------
lamele_d = ''.join(rect(22, y, 84, 9, SREDNI, 1.5, KONTUR_MOCNY, 1.6) for y in range(32, 98, 13))
IKONY['zaluzja-drewniana'] = svg(
    rect(16, 16, 96, 14, CIEMNY, 2, KONTUR_MOCNY, 2.4)
    + lamele_d
    + rect(20, 100, 88, 9, CIEMNY, 2, KONTUR_MOCNY, 2.4)
    # taśmy drabinkowe
    + line(42, 30, 42, 100, 1.4, KONTUR) + line(86, 30, 86, 100, 1.4, KONTUR)
)

# 9. Żaluzja pionowa (vertical) -------------------------------------------
lamele_p = ''.join(rect(x, 30, 11, 80, JASNY, 1, KONTUR, 1.4) for x in range(20, 108, 15))
IKONY['zaluzja-pionowa'] = svg(
    rect(16, 18, 96, 12, SREDNI, 2, KONTUR_MOCNY, 2.2)
    + lamele_p
    + line(20, 112, 108, 112, 1.2, CIEMNY)
)

# 10. Żaluzja plisowana / plisa -------------------------------------------
zygzak = ''.join(
    path(f'M22 {y} L64 {y + 5} L106 {y}', 'none', 1.4, KONTUR) for y in range(36, 92, 8)
)
IKONY['zaluzja-plisowana'] = svg(
    rect(18, 20, 92, 10, SREDNI, 2, KONTUR_MOCNY, 2.2)
    + rect(22, 30, 84, 64, JASNY, 1, KONTUR_MOCNY, 2.2)
    + zygzak
    + rect(18, 94, 92, 9, CIEMNY, 2, KONTUR_MOCNY, 2.2)
    + prowadnice(x1=22, x2=106, y=30, y2=94)
)

# 11. Moskitiera ramkowa ---------------------------------------------------
def siatka(x, y, w, h, krok=11):
    pion = ''.join(line(cx, y, cx, y + h, 1.0, CIEMNY) for cx in range(x + krok, x + w, krok))
    poziom = ''.join(line(x, cy, x + w, cy, 1.0, CIEMNY) for cy in range(y + krok, y + h, krok))
    return pion + poziom

IKONY['moskitiera-ramkowa'] = svg(
    rect(18, 18, 92, 92, JASNY, 2, KONTUR_MOCNY, 2.6)
    + siatka(24, 24, 80, 80)
    + rect(24, 24, 80, 80, 'none', 1, KONTUR, 1.4)
    # narożne wzmocnienia
    + ''.join(
        f'<rect x="{x}" y="{y}" width="9" height="9" rx="1.5" fill="{CIEMNY}" '
        f'stroke="{KONTUR_MOCNY}" stroke-width="1.4"/>'
        for x, y in ((21, 21), (98, 21), (21, 98), (98, 98))
    )
)

# 12. Moskitiera drzwiowa --------------------------------------------------
IKONY['moskitiera-drzwiowa'] = svg(
    rect(30, 10, 68, 108, JASNY, 2, KONTUR_MOCNY, 2.6)
    + siatka(36, 16, 56, 96)
    + rect(36, 16, 56, 96, 'none', 1, KONTUR, 1.4)
    # poprzeczka i klamka
    + rect(30, 70, 68, 8, CIEMNY, 1.5, KONTUR_MOCNY, 2.2)
    + f'<circle cx="88" cy="62" r="4.5" fill="{CIEMNY}" stroke="{KONTUR_MOCNY}" stroke-width="2"/>'
    # zawiasy
    + rect(26, 26, 6, 12, CIEMNY, 1, KONTUR_MOCNY, 1.6)
    + rect(26, 92, 6, 12, CIEMNY, 1, KONTUR_MOCNY, 1.6)
)

# 13. Moskitiera plisowana -------------------------------------------------
# Harmonijkę czytamy po naprzemiennych taflach, nie po kresce: przy 22 mm
# same linie zlewały się w falę nie do odróżnienia od siatki.
miech = ''.join(
    rect(x, 24, 9, 80, JASNY if i % 2 else SREDNI, 0, KONTUR, 1.4)
    for i, x in enumerate(range(31, 100, 9))
)
IKONY['moskitiera-plisowana'] = svg(
    rect(18, 16, 92, 96, 'none', 2, KONTUR_MOCNY, 2.6)
    + miech
    # belka prowadząca i szyna dolna
    + rect(20, 20, 11, 88, SREDNI, 1.5, KONTUR_MOCNY, 2.4)
    + rect(99, 20, 11, 88, SREDNI, 1.5, KONTUR_MOCNY, 2.4)
    + rect(18, 108, 92, 8, CIEMNY, 1.5, KONTUR_MOCNY, 2.4)
)

# nazwa rysunku -> (podpis w Ustawieniach, nazwy do dopasowania po pozycji oferty)
MAPA = [
    ('roleta-materialowa', 'Roleta materiałowa', ['roleta materiałowa', 'roleta wolnowisząca', 'roleta']),
    ('roleta-kasetowa', 'Roleta kasetowa', ['roleta kasetowa']),
    ('roleta-dzien-noc', 'Roleta dzień-noc', ['roleta dzień-noc', 'dzień-noc']),
    ('roleta-rzymska', 'Roleta rzymska', ['roleta rzymska']),
    ('roleta-zewnetrzna', 'Roleta zewnętrzna', ['roleta zewnętrzna', 'roleta elewacyjna']),
    ('zaluzja-aluminiowa', 'Żaluzja aluminiowa', ['żaluzja aluminiowa', 'żaluzja']),
    ('zaluzja-drewniana', 'Żaluzja drewniana', ['żaluzja drewniana', 'żaluzja bambusowa']),
    ('zaluzja-pionowa', 'Żaluzja pionowa', ['żaluzja pionowa', 'vertical']),
    ('zaluzja-plisowana', 'Żaluzja plisowana', ['żaluzja plisowana', 'plisa', 'roleta plisowana']),
    ('moskitiera-ramkowa', 'Moskitiera ramkowa', ['moskitiera ramkowa', 'moskitiera']),
    ('moskitiera-drzwiowa', 'Moskitiera drzwiowa', ['moskitiera drzwiowa']),
    ('moskitiera-plisowana', 'Moskitiera plisowana', ['moskitiera plisowana']),
    ('karnisz', 'Karnisz', ['karnisz']),
]

NAGLOWEK = """/** Wbudowane ikony produktów — rolety, żaluzje, moskitiery, karnisz.
 *
 *  Klient na ofercie od razu widzi, co kupuje, a firma nie musi niczego
 *  wgrywać. Rysunki są wektorowe (SVG) i przezroczyste: nie mają tła, więc
 *  siadają na białej kartce bez szarej ramki wokół, a na wydruku nie
 *  pikselują się przy żadnym rozmiarze. Ikony z katalogów producentów są
 *  białe i na białej ofercie byłyby niewidoczne — te mają czarny kontur.
 *
 *  Własne zdjęcie wgrane w Ustawieniach zawsze wygrywa z ikoną: biblioteka
 *  firmy jest przeszukiwana pierwsza, a tu trafiamy dopiero, gdy nic nie
 *  pasowało.
 *
 *  Plik jest wytworzony — nie poprawiaj go ręcznie. Rysunki powstają
 *  skryptem frontend/scripts/ikony-produktow.py.
 */
import type { ProductPhoto } from '../types';

export interface ProductIcon extends ProductPhoto {
  /** Klucz rysunku, np. „roleta-dzien-noc” */
  key: string;
  /** Podpis w Ustawieniach */
  label: string;
  /** Nazwy, po których ikona trafia do pozycji oferty. Pierwsza jest główna,
   *  kolejne to częstsze warianty zapisu i szersze dopasowania („roleta”). */
  names: string[];
}

const RYSUNKI: Omit<ProductIcon, 'name'>[] = [
"""

STOPKA = """
];

/** Ikony w postaci wpisów biblioteki zdjęć: osobny wpis na każdą nazwę,
 *  bo dopasowanie idzie po nazwie, a jeden rysunek obsługuje ich kilka. */
export const IKONY_PRODUKTOW: ProductIcon[] = RYSUNKI.flatMap((r) =>
  r.names.map((name) => ({ ...r, name }))
);

/** Po jednym wpisie na rysunek — do pokazania listy w Ustawieniach. */
export const RYSUNKI_PRODUKTOW: ProductIcon[] = RYSUNKI.map((r) => ({ ...r, name: r.names[0] }));
"""

brak = [k for k, _, _ in MAPA if k not in IKONY]
if brak:
    raise SystemExit('Brak rysunku dla: ' + ', '.join(brak))

wiersze = []
for klucz, etykieta, nazwy in MAPA:
    b64 = base64.b64encode(IKONY[klucz].encode('utf-8')).decode('ascii')
    nazwy_ts = ', '.join(f"'{n}'" for n in nazwy)
    wiersze.append(
        "  {\n"
        f"    key: '{klucz}',\n"
        f"    label: '{etykieta}',\n"
        f"    names: [{nazwy_ts}],\n"
        f"    dataUrl: 'data:image/svg+xml;base64,{b64}'\n"
        "  }"
    )

cel = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'assets' / 'productIcons.ts'
cel.write_text(NAGLOWEK + ',\n'.join(wiersze) + STOPKA, encoding='utf-8')
print(f'Zapisano {len(MAPA)} rysunków do {cel}')
