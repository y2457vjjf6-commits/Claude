/** Biblioteka zdjęć produktów: klient widzi na ofercie, co kupuje.
 *
 *  Zdjęcia trzymamy w ustawieniach, a nie przy pozycjach oferty — ten sam
 *  produkt wraca na dziesiątkach ofert i nikt nie będzie go wgrywał za
 *  każdym razem. Pozycja dobiera zdjęcie po nazwie.
 */
import type { OfferItem, ProductPhoto, Settings } from '../types';

/** Dłuższa krawędź miniatury. Na dokumencie zdjęcie ma ok. 22 mm,
 *  więc 360 px daje ponad 400 dpi — ostro na wydruku i wciąż lekko w pliku. */
export const MAX_BOK = 360;

/** Nazwy porównujemy bez względu na wielkość liter, ogonki i zdwojone spacje.
 *  Dzięki temu „Roleta Kasetowa UNI” trafia na wpis „roleta kasetowa uni”. */
export function normalizujNazwe(tekst: string): string {
  return String(tekst || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rozbija tekst na słowa — po nich porównujemy wpis z pozycją. */
function slowa(tekst: string): string[] {
  return normalizujNazwe(tekst)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Czy słowo z wpisu stoi wśród słów pozycji.
 *
 *  Nazwy produktów się odmieniają — „rolety kasetowe” kontra „roleta kasetowa”
 *  — więc dłuższe słowa porównujemy od rdzenia, czyli bez ostatniej litery.
 *  Kody tkanin i krótkie skróty muszą zgadzać się co do znaku: inaczej wpis
 *  „C102” złapałby tkaninę „C1020”, czyli zupełnie inną.
 */
function pasujeSlowo(slowoWpisu: string, slowaPozycji: string[]): boolean {
  if (/\d/.test(slowoWpisu) || slowoWpisu.length < 4) return slowaPozycji.includes(slowoWpisu);
  const rdzen = slowoWpisu.slice(0, -1);
  return slowaPozycji.some((w) => w.startsWith(rdzen));
}

/** Dobiera zdjęcie do pozycji. Szukamy i w nazwie, i w wierszu materiału —
 *  dzięki temu można przypisać zdjęcie zarówno produktowi („roleta kasetowa”),
 *  jak i konkretnej tkaninie („C102”).
 *
 *  Wpis pasuje, gdy wszystkie jego słowa stoją w pozycji, w dowolnej kolejności
 *  i w dowolnej odmianie: wpis „roleta kasetowa uni” trafia na pozycję
 *  „Rolety kasetowe System UNI, kaseta antracyt”.
 *
 *  Wygrywa wpis najbardziej szczegółowy, czyli ten o największej liczbie słów.
 *  Gdy w bibliotece są „roleta” i „roleta kasetowa uni”, pozycja z pełną nazwą
 *  dostaje to drugie zdjęcie. Przy remisie decyduje dłuższa nazwa wpisu.
 */
export function matchPhoto(
  item: Pick<OfferItem, 'name' | 'material'>,
  photos: ProductPhoto[] | undefined
): ProductPhoto | null {
  const slowaPozycji = slowa(`${item?.name || ''} · ${item?.material || ''}`);
  if (!slowaPozycji.length) return null;

  let najlepsze: ProductPhoto | null = null;
  let najwiecejSlow = 0;
  let najdluzszaNazwa = 0;
  for (const z of photos || []) {
    const slowaWpisu = slowa(z?.name || '');
    if (!slowaWpisu.length || !z?.dataUrl) continue;
    if (!slowaWpisu.every((s) => pasujeSlowo(s, slowaPozycji))) continue;

    const dlugosc = normalizujNazwe(z.name).length;
    const lepszy =
      slowaWpisu.length > najwiecejSlow ||
      (slowaWpisu.length === najwiecejSlow && dlugosc > najdluzszaNazwa);
    if (lepszy) {
      najwiecejSlow = slowaWpisu.length;
      najdluzszaNazwa = dlugosc;
      najlepsze = z;
    }
  }
  return najlepsze;
}

/** Zdjęcie dla pozycji albo pusty napis, gdy nic nie pasuje. */
export function photoFor(
  item: Pick<OfferItem, 'name' | 'material'>,
  settings: Pick<Settings, 'productPhotos'> | undefined
): string {
  return matchPhoto(item, settings?.productPhotos)?.dataUrl || '';
}

/** Zmniejsza wgrane zdjęcie, zanim trafi do pliku z danymi. Zdjęcie z telefonu
 *  waży kilka megabajtów; bez tego `dane-wz.json` spuchłby po kilku produktach
 *  tak, że program wstawałby zauważalnie dłużej.
 *
 *  Korzysta z `canvas`, więc działa tylko w przeglądarce — stąd nie ma testu
 *  jednostkowego, sprawdzamy to na żywym programie.
 */
export function resizePhoto(plik: File): Promise<string> {
  return new Promise((spelnij, odrzuc) => {
    const czytnik = new FileReader();
    czytnik.onerror = () => odrzuc(new Error('Nie udało się odczytać pliku.'));
    czytnik.onload = () => {
      const obraz = new Image();
      obraz.onerror = () => odrzuc(new Error('To nie jest obraz, który umiemy otworzyć.'));
      obraz.onload = () => {
        const skala = Math.min(1, MAX_BOK / Math.max(obraz.width, obraz.height));
        const sz = Math.max(1, Math.round(obraz.width * skala));
        const wy = Math.max(1, Math.round(obraz.height * skala));
        const plotno = document.createElement('canvas');
        plotno.width = sz;
        plotno.height = wy;
        const ctx = plotno.getContext('2d');
        if (!ctx) {
          odrzuc(new Error('Nie udało się przygotować miniatury.'));
          return;
        }
        // Zdjęcia produktów bywają z przezroczystością (wycinki z katalogu),
        // a JPEG robi z niej czerń — stąd białe tło pod spodem.
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, sz, wy);
        ctx.drawImage(obraz, 0, 0, sz, wy);
        spelnij(plotno.toDataURL('image/jpeg', 0.82));
      };
      obraz.src = String(czytnik.result || '');
    };
    czytnik.readAsDataURL(plik);
  });
}
