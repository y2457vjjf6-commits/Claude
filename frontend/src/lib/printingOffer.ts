import { Offer, OfferGroup, OfferItem, OfferOption, ProductPhoto, Settings } from '../types';
import { LOGO_LECHROL } from '../assets/logo';
import {
  columnHeaderLabel,
  formatMoney,
  groupLabel,
  filledSpec,
  groupLpNumbers,
  groupSum,
  isItemEmpty,
  itemTotal,
  offerTotals,
  offerVat,
  offerVatRate,
  validUntil
} from './offers';
import { esc, formatDatePl } from './printing';
import {
  commonName,
  fullOptionItem,
  isOptionGroup,
  optionChosen,
  optionCellFilled,
  optionFilled,
  optionLabel,
  selectedOption
} from './offerOptions';
import { matchPhotoOrIcon } from './photos';

/**
 * Oferta cenowa w układzie dokumentu handlowego: sprzedawca i identyfikacja
 * dokumentu w nagłówku, odbiorca w ramce, pozycje w jednej tabeli na pełną
 * szerokość. Struktura niesie znaczenie — ramka i pasek oddzielają role,
 * a nie zdobią. Pomarańcz firmowy pojawia się wyłącznie jako akcent.
 */

/** Procent po polsku: 10 zostaje „10”, 7,5 nie gubi części ułamkowej. */
function procentPl(wartosc: number): string {
  return wartosc.toLocaleString('pl-PL', { maximumFractionDigits: 2 });
}

/** Ile kolumn ma tabela pozycji przy danym układzie. */
function ileKolumn(zeZdjeciem: boolean): number {
  return zeZdjeciem ? 6 : 5;
}

/** Specyfikacja pozycji: siatka dwóch par na wiersz. Lista opisowa, a nie
 *  zbiór divów, bo to dokładnie para nazwa–wartość; etykiety trzymają wspólną
 *  kolumnę, więc wartości układają się w pion i dają się porównywać wzrokiem. */
function specyfikacja(it: OfferItem): string {
  // Na dokumencie dla klienta pokazujemy tylko uzupełnione parametry: rubryka
  // „Kolor kasety: —" nic mu nie mówi, a wygląda na niedokończoną robotę.
  // Na kartce dla warsztatu jest odwrotnie i tam puste wiersze zostają.
  const pary = filledSpec(it.spec).filter((p) => p.value);
  if (!pary.length) return '';
  const komorki = pary
    .map(
      (p) =>
        `<dt class="of-spec-label">${esc(p.label)}</dt>` +
        `<dd class="of-spec-value">${esc(p.value)}</dd>`
    )
    .join('');
  return `<dl class="of-spec">${komorki}</dl>`;
}

interface UkladTabeli {
  numery: string[];
  zdjecia: ProductPhoto[] | null;
  zeSpecyfikacja: boolean;
  zeZdjeciem: boolean;
}

/** Wiersze jednej grupy — bez własnej tabeli, bo wszystkie grupy dzielą jedną. */
function wierszeGrupy(g: OfferGroup, u: UkladTabeli): string {
  return g.items
    .map((it, ii) => {
      if (isItemEmpty(it)) return '';
      const material = String(it.material || '').trim();
      const sztuk = parseFloat(String(it.qty).replace(',', '.')) || 0;
      const zaSztuke = sztuk ? itemTotal(it) / sztuk : itemTotal(it);
      const zdjecie = u.zdjecia ? matchPhotoOrIcon(it, u.zdjecia) : null;
      const spec = u.zeSpecyfikacja ? specyfikacja(it) : '';
      return `
          <tr class="of-item">
            <td class="of-lp">${esc(u.numery[ii])}</td>
            ${
              u.zeZdjeciem
                ? `<td class="of-pic">${
                    zdjecie
                      ? `<img class="of-photo${
                          // rysunek jest schematem, nie fotografią — wystarczy mu
                          // mniej miejsca, a dokument nie rośnie o stronę
                          zdjecie.dataUrl.startsWith('data:image/svg') ? ' of-icon' : ''
                        }" src="${zdjecie.dataUrl}" alt="">`
                      : ''
                  }</td>`
                : ''
            }
            <td class="of-name">
              <span class="of-name-main">${esc(it.name)}</span>
              ${material ? `<span class="of-material">${esc(material)}</span>` : ''}
              ${spec}
            </td>
            <td class="of-qty">${esc(it.qty)}</td>
            <td class="of-unit">${formatMoney(zaSztuke)}</td>
            <td class="of-price">${formatMoney(itemTotal(it))}</td>
          </tr>`;
    })
    .join('');
}

/** Pasek z nazwą pomieszczenia — pełnej szerokości wiersz wewnątrz tabeli,
 *  żeby grupowanie było częścią tabeli, a nie osobnym elementem obok niej. */
function pasekPokoju(podpis: string, kwota: string, kolumn: number): string {
  if (!podpis) return '';
  return `
          <tr class="of-room">
            <td class="of-room-name" colspan="${kolumn - 1}">${esc(podpis)}</td>
            ${kwota ? `<td class="of-room-sum">${kwota}</td>` : '<td></td>'}
          </tr>`;
}

function naglowekTabeli(etykietaProduktu: string, u: UkladTabeli): string {
  return `
        <thead>
          <tr>
            <th class="of-lp">Lp.</th>
            ${u.zeZdjeciem ? '<th class="of-pic"></th>' : ''}
            <th class="of-name">${esc(etykietaProduktu)}</th>
            <th class="of-qty">Ilość</th>
            <th class="of-unit">Cena/szt.</th>
            <th class="of-price">Wartość</th>
          </tr>
        </thead>`;
}

/* ---------------------------- Opcje do wyboru ---------------------------- */

/** Opis opcji wspólny dla wszystkich jej wierszy — wtedy wystarczy raz,
 *  w nagłówku kolumny, i tabela nie powtarza tego samego przy każdej cenie. */
function wspolnyOpis(option: OfferOption, szkielet: OfferItem[]): string {
  const opisy = option.items
    .filter((it) => optionCellFilled(it))
    .map((it) => String(it.material || '').trim());
  if (!opisy.length) return '';
  return opisy.every((o) => o === opisy[0]) ? opisy[0] : '';
}

/** Tabela porównawcza jednej grupy opcji.
 *
 *  Wiersze są wspólne — ten sam produkt, wymiar i ilość — a kolumny to
 *  alternatywy. Dzięki temu klient czyta w poprzek: ten sam salon, trzy
 *  materiały, trzy ceny. Pod kwotą opcji stoi cena całkowita całej oferty
 *  policzona właśnie z nią, bo to ona jest decyzją, a nie sama pozycja.
 */
function tabelaOpcji(
  g: OfferGroup,
  u: UkladTabeli,
  sumy: ReturnType<typeof offerTotals>,
  podpis: string
): string {
  const opcje = (g.options || []).filter(optionFilled);
  if (!opcje.length) return '';
  // Wiersz pokazujemy, gdy jest produktem (szkielet coś niesie) albo gdy
  // którakolwiek opcja ma dla niego cenę — reszta to puste wiersze z edytora.
  const wiersze = g.items
    .map((it, i) => ({ it, i }))
    .filter(({ it, i }) => !isItemEmpty(it) || opcje.some((o) => optionCellFilled(o.items[i])));
  if (!wiersze.length) return '';

  const wyceny = sumy.optionGroups.find((x) => x.groupId === g.id);
  const kwota = (id: string) => wyceny?.options.find((o) => o.id === id);
  const wybrana = optionChosen(g) ? selectedOption(g) : null;
  const klasaOpcji = (o: OfferOption) => (wybrana && o.id === wybrana.id ? ' of-opt-chosen' : '');
  const opisy = opcje.map((o) => wspolnyOpis(o, g.items));

  const naglowek = `
        <thead>
          <tr>
            <th class="of-lp">Lp.</th>
            ${u.zeZdjeciem ? '<th class="of-pic"></th>' : ''}
            <th class="of-name">${esc(columnHeaderLabel(g.header))}</th>
            ${opcje
              .map(
                (o, oi) =>
                  `<th class="of-opt${klasaOpcji(o)}">` +
                  `<span class="of-opt-name">${esc(optionLabel(o, oi))}</span>` +
                  (opisy[oi] ? `<span class="of-opt-sub">${esc(opisy[oi])}</span>` : '') +
                  (wybrana && o.id === wybrana.id ? '<span class="of-opt-tag">wybrana</span>' : '') +
                  '</th>'
              )
              .join('')}
          </tr>
        </thead>`;

  const tresc = wiersze
    .map(({ it, i }) => {
      const wspolnaNazwa = commonName(g, i);
      // Rysunek dobieramy do tego, co wiersz naprawdę pokazuje: przy wspólnym
      // produkcie jeden na całym wierszu, przy różnych — żadnego, bo nie
      // byłoby wiadomo, którą opcję przedstawia.
      const zdjecie = u.zdjecia && wspolnaNazwa ? matchPhotoOrIcon(it, u.zdjecia) : null;
      const sztuk = String(it.qty || '').trim();
      const opis = [String(it.material || '').trim(), sztuk ? `${sztuk} szt.` : '']
        .filter(Boolean)
        .join(' · ');
      return `
          <tr class="of-item">
            <td class="of-lp">${esc(u.numery[i])}</td>
            ${
              u.zeZdjeciem
                ? `<td class="of-pic">${
                    zdjecie
                      ? `<img class="of-photo${
                          zdjecie.dataUrl.startsWith('data:image/svg') ? ' of-icon' : ''
                        }" src="${zdjecie.dataUrl}" alt="">`
                      : ''
                  }</td>`
                : ''
            }
            <td class="of-name">
              ${wspolnaNazwa ? `<span class="of-name-main">${esc(wspolnaNazwa)}</span>` : ''}
              ${opis ? `<span class="of-material">${esc(opis)}</span>` : ''}
            </td>
            ${opcje
              .map((o, oi) => {
                const poz = o.items[i];
                const pusta = !optionCellFilled(poz);
                // „—” zamiast pustej komórki: puste miejsce w tabeli
                // porównawczej czyta się jak niedokończona robota
                if (pusta) return `<td class="of-opt of-opt-none${klasaOpcji(o)}">—</td>`;
                const wlasny = opisy[oi] ? '' : String(poz.material || '').trim();
                // Gdy opcje to różne produkty, nazwa stoi w kolumnie, a nie
                // w opisie wiersza — bo wtedy to ona jest wyborem klienta.
                const wlasnaNazwa = wspolnaNazwa ? '' : String(poz.name || '').trim();
                return (
                  `<td class="of-opt${klasaOpcji(o)}">` +
                  (wlasnaNazwa ? `<span class="of-opt-product">${esc(wlasnaNazwa)}</span>` : '') +
                  `<span class="of-opt-price">${formatMoney(itemTotal(poz))}</span>` +
                  (wlasny ? `<span class="of-opt-sub">${esc(wlasny)}</span>` : '') +
                  '</td>'
                );
              })
              .join('')}
          </tr>`;
    })
    .join('');

  const stopka =
    `<tr class="of-opt-sum">` +
    `<th colspan="${u.zeZdjeciem ? 3 : 2}">Razem za opcję</th>` +
    opcje
      .map((o) => `<td class="of-opt${klasaOpcji(o)}">${formatMoney(kwota(o.id)?.sum ?? 0)}</td>`)
      .join('') +
    '</tr>' +
    `<tr class="of-opt-total">` +
    `<th colspan="${u.zeZdjeciem ? 3 : 2}">Cena całkowita oferty</th>` +
    opcje
      .map((o) => `<td class="of-opt${klasaOpcji(o)}">${formatMoney(kwota(o.id)?.total ?? 0)}</td>`)
      .join('') +
    '</tr>';

  return `
       <section class="of-options">
         <h2 class="of-section-title">Opcje do wyboru${podpis ? ` — ${esc(podpis)}` : ''}</h2>
         <p class="of-section-note">
           Opcje się nie sumują — przy każdej stoi cena całkowita całej oferty, policzona
           właśnie z nią. Pozostałe pozycje zamówienia zostają bez zmian.
         </p>
         <table class="of-items of-compare">
           ${naglowek}
           <tbody>${tresc}${stopka}</tbody>
         </table>
       </section>`;
}

/** Pełna specyfikacja każdej opcji — pod tabelą, bo w wąskiej kolumnie
 *  z ceną nie ma na nią miejsca, a klient chce wiedzieć, czym się różnią. */
function specyfikacjeOpcji(g: OfferGroup, numery: string[]): string {
  const opcje = (g.options || []).filter(optionFilled);
  const bloki = opcje
    .map((o, oi) => {
      const pozycje = o.items
        .map((poz, i) => {
          if (!optionCellFilled(poz)) return '';
          const pelna = fullOptionItem(g.items[i] || poz, poz);
          const spec = specyfikacja(pelna);
          if (!spec) return '';
          const opis = String(pelna.material || '').trim();
          return (
            '<div class="of-opt-spec-item">' +
            `<span class="of-opt-spec-name">${esc(numery[i])}. ${esc(pelna.name)}` +
            (opis ? ` <span class="of-material">${esc(opis)}</span>` : '') +
            '</span>' +
            spec +
            '</div>'
          );
        })
        .join('');
      if (!pozycje) return '';
      return `<div class="of-opt-spec"><h3 class="of-opt-spec-title">${esc(
        optionLabel(o, oi)
      )}</h3>${pozycje}</div>`;
    })
    .join('');
  return bloki ? `<section class="of-opt-specs">${bloki}</section>` : '';
}

/** Telefon pod podpisem — pomijany, gdy to ten sam numer co firmowy. */
function telefonPodpisu(offer: Offer, s: Settings['seller']): string {
  const cyfry = (x: string) => String(x || '').replace(/\D/g, '');
  const wlasny = String(offer.issuedByPhone || '').trim();
  if (!wlasny) return '';
  return cyfry(wlasny) === cyfry(s.phone) ? '' : wlasny;
}

/** Wiersz o płatności. Zaliczka bierze się z ustawień, więc da się ją zmienić
 *  bez ruszania kodu; zero albo puste pole wyłącza ten wiersz. */
function platnosc(settings: Settings): string {
  const procent = parseFloat(String(settings.offerDepositPercent ?? '').replace(',', '.'));
  if (!isFinite(procent) || procent <= 0) return '';
  if (procent >= 100) return 'Pełna kwota przy złożeniu zamówienia';
  return `Zaliczka ${esc(String(settings.offerDepositPercent).trim())}% przy złożeniu zamówienia, reszta przy odbiorze`;
}

/** Para „co — jakie" w warunkach oferty i w identyfikacji dokumentu. */
function para(etykieta: string, wartosc: string): string {
  if (!wartosc) return '';
  return `<div class="of-pair"><span class="of-pair-label">${esc(etykieta)}</span>` +
    `<span class="of-pair-value">${wartosc}</span></div>`;
}

export function buildOfferHtml(offer: Offer, settings: Settings): string {
  const s = settings.seller;
  // null = zdjęcia wyłączone na tej ofercie. Pusta lista to co innego: firma
  // nie wgrała własnych zdjęć, ale pozycje i tak dostaną wbudowane ikony.
  const zdjecia = offer.showPhotos ? settings.productPhotos || [] : null;
  const grupy = offer.groups || [];
  const numery = groupLpNumbers(grupy, offer.continuousNumbering);
  const sumy = offerTotals(offer);

  // Trzy rodzaje tabel, bo trzy różne role na dokumencie: pozycje zamówienia,
  // alternatywy do wyboru i stare warianty wyceniane obok ceny całkowitej.
  const podstawowe = grupy
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => !g.variant && !isOptionGroup(g));
  const zOpcjami = grupy.map((g, i) => ({ g, i })).filter(({ g }) => !g.variant && isOptionGroup(g));
  const warianty = grupy.map((g, i) => ({ g, i })).filter(({ g }) => g.variant);
  const niepuste = (x: { g: OfferGroup }) => x.g.items.some((it) => !isItemEmpty(it));

  // Kolumna na zdjęcia pojawia się tylko wtedy, gdy którakolwiek pozycja
  // faktycznie je dostanie — pusta kolumna zabierałaby miejsce za darmo.
  const wszystkiePozycje = grupy
    .flatMap((g) =>
      isOptionGroup(g)
        ? // w grupie opcji zdjęcie i specyfikacja siedzą przy szkielecie,
          // a pełny opis pozycji składa się dopiero ze szkieletu i opcji
          g.items.map((it, i) => fullOptionItem(it, (selectedOption(g)?.items || [])[i] || it))
        : g.items
    )
    .filter((it) => !isItemEmpty(it));
  const zeZdjeciem = !!zdjecia && wszystkiePozycje.some((it) => matchPhotoOrIcon(it, zdjecia));
  const zeSpecyfikacja = !!offer.showSpecs && wszystkiePozycje.some((it) => (it.spec || []).length > 0);
  const kolumn = ileKolumn(zeZdjeciem);

  // Kwota za pomieszczenie ma sens dopiero wtedy, gdy pomieszczeń jest kilka —
  // przy jednym powtarzałaby cenę całkowitą tuż pod nią.
  const zKwotaPokoju = podstawowe.filter(niepuste).length > 1;

  const uklad = (i: number): UkladTabeli => ({
    numery: numery[i],
    zdjecia,
    zeSpecyfikacja,
    zeZdjeciem
  });

  const pierwszaGrupa = podstawowe.find(niepuste);
  const tabelaPodstawowa = pierwszaGrupa
    ? `<table class="of-items">
        ${naglowekTabeli(columnHeaderLabel(pierwszaGrupa.g.header), uklad(pierwszaGrupa.i))}
        <tbody>
          ${podstawowe
            .filter(niepuste)
            .map(
              ({ g, i }) =>
                pasekPokoju(groupLabel(grupy, i), zKwotaPokoju ? formatMoney(groupSum(g)) : '', kolumn) +
                wierszeGrupy(g, uklad(i))
            )
            .join('')}
        </tbody>
      </table>`
    : '';

  // Warianty to alternatywy, nie dodatkowe pozycje — stąd osobna tabela
  // z własnym podpisem, żeby nikt nie doliczył ich do ceny całkowitej.
  const tabeleOpcji = zOpcjami
    .map(({ g, i }) => tabelaOpcji(g, uklad(i), sumy, groupLabel(grupy, i)))
    .join('');

  const specOpcji =
    offer.showSpecs && zOpcjami.length
      ? zOpcjami.map(({ g, i }) => specyfikacjeOpcji(g, numery[i])).join('')
      : '';

  const tabelaWariantow = warianty.filter(niepuste).length
    ? `<section class="of-variants">
         <h2 class="of-section-title">Warianty do wyboru</h2>
         <p class="of-section-note">Cena dotyczy jednego z nich — nie sumuje się z ceną całkowitą.</p>
         <table class="of-items">
           ${naglowekTabeli('Produkt', uklad(warianty[0].i))}
           <tbody>
             ${warianty
               .filter(niepuste)
               .map(({ g, i }) => {
                 const kwota = sumy.variants.find((w) => w.id === g.id);
                 return (
                   pasekPokoju(groupLabel(grupy, i), kwota ? formatMoney(kwota.total) : '', kolumn) +
                   wierszeGrupy(g, uklad(i))
                 );
               })
               .join('')}
           </tbody>
         </table>
       </section>`
    : '';

  const vat = offerVat(sumy.total, offerVatRate(offer));
  // Kwota bez wskazania opcji wprowadzałaby w błąd: identyczna liczba wyjdzie
  // przy innej opcji z innej grupy, a klient ma wiedzieć, co kupuje za tę cenę.
  const nazwaOpcji = sumy.optionGroups[0]?.options.find((o) => o.selected)?.label || 'Opcja A';
  const zOpcja =
    sumy.optionGroups.length === 1
      ? // „z opcją Opcja A" zgrzyta — opcja bez własnej nazwy dostaje myślnik
        /^Opcja [A-Z]$/.test(nazwaOpcji)
        ? `Cena całkowita — ${nazwaOpcji}`
        : `Cena całkowita z opcją ${nazwaOpcji}`
      : 'Cena całkowita z wybranymi opcjami';
  const etykietaCeny = warianty.length
    ? 'Cena całkowita oferty podstawowej'
    : sumy.optionGroups.length
      ? zOpcja
      : 'Cena całkowita';
  const linia = (opis: string, kwota: string, klasa = '') =>
    `<tr${klasa ? ` class="${klasa}"` : ''}><th>${esc(opis)}</th><td>${kwota}</td></tr>`;

  const podsumowanie =
    sumy.itemsSum > 0 || !warianty.length
      ? `<table class="of-sum">
           ${
             // Jedna linia na każdą użytą stawkę. Przy rabacie „na wszystko"
             // linia jest jedna i podsumowanie wygląda jak dotąd; przy
             // stawkach produktowych klient widzi, co po ile dostał.
             sumy.discounts.length
               ? linia('Wartość pozycji', formatMoney(sumy.itemsSum)) +
                 sumy.discounts
                   .map((l) =>
                     linia(
                       // Przy jednej stawce wiadomo, od czego liczona; przy kilku
                       // trzeba podać podstawę, inaczej klient nie sprawdzi rachunku.
                       sumy.discounts.length > 1
                         ? `Rabat ${procentPl(l.percent)}% od ${formatMoney(l.base)}`
                         : `Rabat ${procentPl(l.percent)}%`,
                       `−${formatMoney(l.amount)}`
                     )
                   )
                   .join('')
               : ''
           }
           ${linia(etykietaCeny, formatMoney(sumy.total), 'of-grand')}
           ${
             offer.vatBreakdown
               ? linia('W tym netto', formatMoney(vat.netto)) + linia(`VAT ${vat.rate}%`, formatMoney(vat.vat))
               : ''
           }
         </table>`
      : '';

  const warunki = [
    para('Montaż', offer.installationIncluded ? 'Wliczony w cenę' : 'Nieuwzględniony w cenie'),
    para(
      'Termin realizacji',
      String(offer.deadlineDays || '').trim()
        ? `do ${esc(offer.deadlineDays)} dni roboczych od akceptacji zamówienia`
        : ''
    ),
    para(
      'Dostawa',
      offer.deliveryEnabled
        ? String(offer.deliveryPrice || '').trim()
          ? formatMoney(sumy.deliveryAmount)
          : 'nie dotyczy'
        : ''
    ),
    para('Płatność', platnosc(settings)),
    para('Uwagi', String(offer.notes || '').trim() ? esc(offer.notes).replace(/\n/g, '<br>') : '')
  ].join('');

  const wierszeUwag = String(settings.offerClosingText || '')
    .trim()
    .split('\n')
    .map((linia) => {
      const tekst = linia.trim();
      if (!tekst) return '';
      const punkt = tekst.startsWith('•');
      return `<div class="${punkt ? 'of-closing-bullet' : 'of-closing-para'}">${esc(tekst)}</div>`;
    })
    .join('');

  const daneSprzedawcy = [s.address, s.nip ? `NIP ${s.nip}` : '', s.phone ? `tel. ${s.phone}` : '', s.www]
    .filter((c) => String(c || '').trim())
    .map((c) => `<div>${esc(String(c))}</div>`)
    .join('');

  const odbiorca = [
    esc(String(offer.clientAddress || '').trim()),
    String(offer.clientNip || '').trim() ? `NIP ${esc(offer.clientNip)}` : ''
  ].filter(Boolean);

  const pagina = [offer.number ? `Oferta ${offer.number}` : '', formatDatePl(offer.date)]
    .filter(Boolean)
    .join('  ·  ');

  return `
  <div class="of-doc" data-pagina="${esc(pagina)}">
    <header class="of-top">
      <div class="of-seller">
        <img class="of-mark" src="${LOGO_LECHROL}" alt="LECHROL">
        <div class="of-seller-name">${esc(s.name)}</div>
        <div class="of-seller-lines">${daneSprzedawcy}</div>
      </div>
      <div class="of-ident">
        <div class="of-kind">Oferta cenowa</div>
        ${offer.number ? `<div class="of-number">${esc(offer.number)}</div>` : ''}
        <div class="of-ident-rows">
          ${para('Data', `${esc(offer.place || 'Łomianki')}, ${esc(formatDatePl(offer.date))}`)}
          ${para('Ważna do', offer.validityEnabled && validUntil(offer) ? esc(validUntil(offer)) : '')}
          ${
            // ta sama kwota co w podsumowaniu, ale w nagłówku — żeby klient
            // znał cenę, zanim zacznie czytać pozycje
            para(
              warianty.length ? 'Oferta podstawowa' : 'Wartość oferty',
              sumy.itemsSum > 0 || !warianty.length
                ? `<span class="of-ident-sum">${formatMoney(sumy.total)}</span>`
                : ''
            )
          }
        </div>
      </div>
    </header>

    <section class="of-buyer">
      <div class="of-buyer-label">Oferta dla</div>
      <div class="of-buyer-name">${esc(offer.client || '')}</div>
      ${odbiorca.length ? `<div class="of-buyer-sub">${odbiorca.join(' · ')}</div>` : ''}
    </section>

    ${tabelaPodstawowa}
    ${tabeleOpcji}
    ${specOpcji}
    ${tabelaWariantow}
    ${podsumowanie}

    ${warunki ? `<section class="of-terms"><h2 class="of-section-title">Warunki</h2>${warunki}</section>` : ''}

    ${wierszeUwag ? `<section class="of-closing">${wierszeUwag}</section>` : ''}

    ${
      String(settings.offerCheckText || '').trim()
        ? `<div class="of-check">${esc(settings.offerCheckText).replace(/\n/g, '<br>')}</div>`
        : ''
    }

    <div class="of-sign">
      <div class="of-regards">Z poważaniem</div>
      <div class="of-signer">${esc(offer.issuedBy)}</div>
      ${
        telefonPodpisu(offer, s)
          ? `<div class="of-signer-phone">tel. ${esc(telefonPodpisu(offer, s))}</div>`
          : ''
      }
    </div>
  </div>`;
}
