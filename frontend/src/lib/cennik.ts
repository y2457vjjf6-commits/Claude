/** Cennik producenta wbudowany w program.
 *
 *  Pliki w `data/cennik/` są wiernym przepisaniem papierowego cennika i mają
 *  jego układ: jeden plik na produkt, a w środku pięć siatek — po jednej na
 *  grupę materiału. Silnik wyceny operuje na płaskich tabelach, więc tutaj
 *  rozwijamy każdy plik na pięć `PriceTable` i dopinamy im listę materiałów
 *  z osobnego pliku grup.
 *
 *  Dane są importowane, a nie wczytywane z dysku — mają jechać razem z .exe
 *  i działać bez sieci.
 */
import { PriceSurcharge, PriceTable } from '../types';
import grupyRolety from '../data/cennik/grupy-rolety.json';
import mini19 from '../data/cennik/rolety-mini-19.json';
import midi25 from '../data/cennik/rolety-midi-25.json';
import rt32 from '../data/cennik/rolety-rt-32.json';
import rt4045 from '../data/cennik/rolety-rt-40-45.json';
import uni from '../data/cennik/rolety-kasetowe-uni.json';
import uniAntracyt from '../data/cennik/rolety-kasetowe-uni-antracyt.json';
import uniDrewno from '../data/cennik/rolety-kasetowe-uni-drewno.json';
import decoluxBialy from '../data/cennik/decolux-bialy.json';
import decoluxDrewno from '../data/cennik/decolux-drewno.json';
import grupyDzienNoc from '../data/cennik/grupy-dzien-noc.json';
import dnMini19 from '../data/cennik/dn-mini-19.json';
import dnMidi32 from '../data/cennik/dn-midi-32.json';
import dnUniBialy from '../data/cennik/dn-uni-bialy.json';
import dnUniAntracyt from '../data/cennik/dn-uni-antracyt.json';
import dnUniDrewno from '../data/cennik/dn-uni-drewno.json';
import zaluzjeDrewno25 from '../data/cennik/zaluzje-drewno-25.json';
import zaluzjeDrewno50 from '../data/cennik/zaluzje-drewno-50.json';
import zaluzjeAlu16 from '../data/cennik/zaluzje-alu16.json';
import zaluzjeAlu25 from '../data/cennik/zaluzje-alu25.json';
import venus16 from '../data/cennik/venus-16.json';
import venus25 from '../data/cennik/venus-25.json';

/** Jak nazwać produkt, żeby trafił na swoją tabelę. Człony muszą stać
 *  w nazwie pozycji — wszystkie naraz. Trzymamy je tutaj, a nie w plikach
 *  z cenami, bo to decyzja o dopasowaniu, nie dana z cennika. */
/** Człony, których obecność odbiera produktowi jego cennik. */
const WYKLUCZENIA: Record<string, string[]> = {
  // VENUS to osobny system z własnym, droższym cennikiem
  'zaluzje-alu-16': ['VENUS'],
  'zaluzje-alu-25': ['VENUS']
};

const CZLONY: Record<string, string[]> = {
  'rolety-mini-19': ['Mini 19'],
  'rolety-midi-25': ['Midi 25'],
  'rolety-rt-32': ['RT 32'],
  'rolety-rt-40-45': ['RT 40/45'],
  'rolety-kasetowe-uni': ['UNI'],
  'rolety-kasetowe-uni-antracyt': ['UNI', 'antracyt'],
  'rolety-kasetowe-uni-drewno': ['UNI', 'drewnopodobne'],
  'decolux-bialy': ['DECOLUX'],
  'decolux-drewno': ['DECOLUX', 'sosna'],
  'dn-mini-19': ['dzień-noc', 'Mini 19'],
  'dn-midi-32': ['dzień-noc', 'Midi 32'],
  'dn-uni-bialy': ['dzień-noc', 'UNI'],
  'dn-uni-antracyt': ['dzień-noc', 'UNI', 'antracyt'],
  'dn-uni-drewno': ['dzień-noc', 'UNI', 'drewnopodobne'],
  'zaluzje-drewno-25': ['żaluzje', 'drewniane|bambusowe', '25'],
  'zaluzje-drewno-50': ['żaluzje', 'drewniane|bambusowe', '50'],
  'zaluzje-alu-16': ['żaluzje', 'aluminiowe', '16'],
  'zaluzje-alu-25': ['żaluzje', 'aluminiowe', '25'],
  'venus-16': ['VENUS', '16'],
  'venus-25': ['VENUS', '25']
};

interface PlikGrup {
  zrodlo: string;
  dotyczy: string;
  materialy: { nazwa: string; grupa: string }[];
}

interface PlikCen {
  id: string;
  kategoria: string;
  nazwa: string;
  strona: string;
  maks?: string;
  szerokosci: number[];
  wysokosci: number[];
  siatki: Record<string, (number | null)[][]>;
  doplaty?: { nazwa: string; kwota?: number; procent?: number }[];
  doplatySilnik?: { nazwa: string; kwota: number }[];
  doplatySzerokosc?: { nazwa: string; szerokosci: number[]; kwoty: number[] };
  opcja23?: { opis: string; szerokosci: number[]; kwoty: number[] };
  prowadnice?: { opis: string; wysokosci: number[]; typy: Record<string, number[]> };
}

const PLIKI = [
  mini19, midi25, rt32, rt4045, uni, uniAntracyt, uniDrewno,
  decoluxBialy, decoluxDrewno, dnMini19, dnMidi32,
  dnUniBialy, dnUniAntracyt, dnUniDrewno,
  zaluzjeDrewno25, zaluzjeDrewno50, zaluzjeAlu16, zaluzjeAlu25, venus16, venus25
] as unknown as PlikCen[];

// Każda rodzina produktów ma własny podział materiałów na grupy cenowe:
// tkanina „Madagaskar" jest grupą C w roletach, a „DN 600" grupą 3 w dzień-nocach.
const GRUPY: PlikGrup[] = [grupyRolety as PlikGrup, grupyDzienNoc as PlikGrup];

/** Materiały należące do grupy, plus sama nazwa grupy — bo na ofertach pisze
 *  się i „Madagaskar”, i wprost „Grupa C”. */
function materialyGrupy(kategoria: string, litera: string): string[] {
  // Produkt o jednej siatce nie dzieli się na grupy — oznaczamy go kluczem „-".
  // Taka tabela nie może wymagać materiału, bo żadnego nie ma: zdecyduje sama
  // nazwa produktu.
  if (litera === '-') return [];
  const tabela = GRUPY.find((g) => g.dotyczy === kategoria);
  const nazwy = (tabela?.materialy || []).filter((m) => m.grupa === litera).map((m) => m.nazwa);
  return [...nazwy, `Grupa ${litera}`];
}

/** Dopłaty dostępne przy pozycji wycenionej z tego pliku. */
function doplatyPliku(p: PlikCen): PriceSurcharge[] {
  const lista: PriceSurcharge[] = [];
  for (const d of p.doplaty || []) {
    lista.push(
      typeof d.procent === 'number'
        ? { name: d.nazwa, percent: d.procent }
        : { name: d.nazwa, amount: d.kwota }
    );
  }
  for (const d of p.doplatySilnik || []) lista.push({ name: d.nazwa, amount: d.kwota });
  if (p.doplatySzerokosc) {
    lista.push({
      name: p.doplatySzerokosc.nazwa,
      by: 'width',
      steps: p.doplatySzerokosc.szerokosci,
      amounts: p.doplatySzerokosc.kwoty
    });
  }
  if (p.opcja23) {
    lista.push({ name: p.opcja23.opis, by: 'width', steps: p.opcja23.szerokosci, amounts: p.opcja23.kwoty });
  }
  if (p.prowadnice) {
    // Każdy typ prowadnicy to osobny wybór, nie wariant jednej dopłaty
    for (const [typ, kwoty] of Object.entries(p.prowadnice.typy)) {
      lista.push({
        name: `Prowadnice typ ${typ}`,
        by: 'height',
        steps: p.prowadnice.wysokosci,
        amounts: kwoty
      });
    }
  }
  return lista;
}

function zbuduj(): PriceTable[] {
  const tabele: PriceTable[] = [];
  for (const p of PLIKI) {
    const czlony = CZLONY[p.id] || [];
    const doplaty = doplatyPliku(p);
    for (const [litera, ceny] of Object.entries(p.siatki)) {
      tabele.push({
        id: litera === '-' ? p.id : `${p.id}-${litera}`,
        name: litera === '-' ? p.nazwa : `${p.nazwa} — grupa ${litera}`,
        supplier: 'Lechrol',
        product: czlony,
        excludes: WYKLUCZENIA[p.id] || [],
        materials: materialyGrupy(p.kategoria, litera),
        widths: p.szerokosci,
        heights: p.wysokosci,
        prices: ceny,
        surcharges: doplaty,
        source: `Cennik Lechrol 2026, ${p.strona}`,
        updatedAt: '2026-01-01T00:00:00.000Z'
      });
    }
  }
  return tabele;
}

/** Wszystkie tabele producenta wbudowane w program. */
export const CENNIK: PriceTable[] = zbuduj();

/** Tabele do wyceny: wbudowane plus te, które ktoś wkleił sam. Własne idą
 *  pierwsze, żeby dało się nadpisać cennik producenta bez ruszania kodu. */
export function priceTablesFor(wlasne: PriceTable[] | undefined): PriceTable[] {
  return [...(wlasne || []), ...CENNIK];
}

/** Kategorie i produkty do przeglądania cennika w programie. */
export function cennikProdukty(): { id: string; nazwa: string; kategoria: string; strona: string; grupy: string[] }[] {
  return PLIKI.map((p) => ({
    id: p.id,
    nazwa: p.nazwa,
    kategoria: p.kategoria,
    strona: p.strona,
    grupy: Object.keys(p.siatki)
  }));
}
