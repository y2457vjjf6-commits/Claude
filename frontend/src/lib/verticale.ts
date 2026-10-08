/** Verticale wyceniamy inaczej niż resztę cennika.
 *
 *  Producent nie podaje siatki szerokość × wysokość, tylko dwie składowe:
 *  tkaninę liczoną za metr kwadratowy i szynę za metr bieżący. Stąd osobny
 *  moduł — wciskanie tego w tabelę krzyżową wymagałoby zmyślenia kratek,
 *  których w cenniku nie ma.
 */
import dane from '../data/cennik/verticale.json';

export interface TkaninaVertical {
  nazwa: string;
  /** Cena za m² dla pasa 89 mm */
  '89': number;
  /** Cena za m² dla pasa 127 mm */
  '127': number;
}

export type SzerokoscPasa = '89' | '127';

export const VERTICALE = dane as {
  zrodlo: string;
  nazwa: string;
  szyna: number;
  minSzyna: number;
  minTkanina: number;
  tkaniny: TkaninaVertical[];
  doplaty: { nazwa: string; kwota?: number; procent?: number }[];
};

export interface WycenaVertical {
  tkanina: number;
  szyna: number;
  razem: number;
  /** Powierzchnia przyjęta do wyceny w m² — po doliczeniu minimum */
  metry: number;
  /** Długość szyny przyjęta do wyceny w mb — po doliczeniu minimum */
  mb: number;
}

/** Wycena verticala: tkanina za m² plus szyna za metr bieżący.
 *
 *  Producent liczy minimum 1 m² tkaniny i 1 mb szyny, więc mały verticale
 *  kosztuje tyle co metrowy. Zaokrąglamy do groszy. */
export function priceVertical(
  nazwaTkaniny: string,
  pas: SzerokoscPasa,
  szerokoscCm: number,
  wysokoscCm: number
): WycenaVertical | null {
  const t = VERTICALE.tkaniny.find((x) => x.nazwa === nazwaTkaniny);
  if (!t || !isFinite(szerokoscCm) || !isFinite(wysokoscCm) || szerokoscCm <= 0 || wysokoscCm <= 0) {
    return null;
  }
  const mb = Math.max(VERTICALE.minSzyna, szerokoscCm / 100);
  const metry = Math.max(VERTICALE.minTkanina, (szerokoscCm / 100) * (wysokoscCm / 100));
  const grosze = (x: number) => Math.round(x * 100) / 100;
  const tkanina = grosze(metry * t[pas]);
  const szyna = grosze(mb * VERTICALE.szyna);
  return { tkanina, szyna, razem: grosze(tkanina + szyna), metry, mb };
}
