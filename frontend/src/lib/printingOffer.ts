import { Offer, OfferGroup, OfferItem, ProductPhoto, Settings } from '../types';
import { LOGO_LECHROL } from '../assets/logo';
import {
  columnHeaderLabel,
  formatMoney,
  groupLabel,
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
import { matchPhoto } from './photos';

/**
 * Oferta cenowa w układzie dokumentu handlowego: sprzedawca i identyfikacja
 * dokumentu w nagłówku, odbiorca w ramce, pozycje w jednej tabeli na pełną
 * szerokość. Struktura niesie znaczenie — ramka i pasek oddzielają role,
 * a nie zdobią. Pomarańcz firmowy pojawia się wyłącznie jako akcent.
 */

/** Ile kolumn ma tabela pozycji przy danym układzie. */
function ileKolumn(zeZdjeciem: boolean): number {
  return zeZdjeciem ? 6 : 5;
}

/** Specyfikacja pozycji: siatka dwóch par na wiersz. Lista opisowa, a nie
 *  zbiór divów, bo to dokładnie para nazwa–wartość; etykiety trzymają wspólną
 *  kolumnę, więc wartości układają się w pion i dają się porównywać wzrokiem. */
function specyfikacja(it: OfferItem): string {
  const pary = (it.spec || [])
    .map((p) => ({ label: String(p.label || '').trim(), value: String(p.value || '').trim() }))
    .filter((p) => p.label || p.value);
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
      const zdjecie = u.zdjecia ? matchPhoto(it, u.zdjecia) : null;
      const spec = u.zeSpecyfikacja ? specyfikacja(it) : '';
      return `
          <tr class="of-item">
            <td class="of-lp">${esc(u.numery[ii])}</td>
            ${
              u.zeZdjeciem
                ? `<td class="of-pic">${
                    zdjecie ? `<img class="of-photo" src="${zdjecie.dataUrl}" alt="">` : ''
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
  const zdjecia = offer.showPhotos ? settings.productPhotos || null : null;
  const grupy = offer.groups || [];
  const numery = groupLpNumbers(grupy, offer.continuousNumbering);
  const sumy = offerTotals(offer);

  const podstawowe = grupy.map((g, i) => ({ g, i })).filter(({ g }) => !g.variant);
  const warianty = grupy.map((g, i) => ({ g, i })).filter(({ g }) => g.variant);
  const niepuste = (x: { g: OfferGroup }) => x.g.items.some((it) => !isItemEmpty(it));

  // Kolumna na zdjęcia pojawia się tylko wtedy, gdy którakolwiek pozycja
  // faktycznie je dostanie — pusta kolumna zabierałaby miejsce za darmo.
  const wszystkiePozycje = grupy.flatMap((g) => g.items).filter((it) => !isItemEmpty(it));
  const zeZdjeciem = !!zdjecia && wszystkiePozycje.some((it) => matchPhoto(it, zdjecia));
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
  const etykietaCeny = warianty.length ? 'Cena całkowita oferty podstawowej' : 'Cena całkowita';
  const linia = (opis: string, kwota: string, klasa = '') =>
    `<tr${klasa ? ` class="${klasa}"` : ''}><th>${esc(opis)}</th><td>${kwota}</td></tr>`;

  const podsumowanie =
    sumy.itemsSum > 0 || !warianty.length
      ? `<table class="of-sum">
           ${
             offer.discountEnabled && sumy.discountAmount
               ? linia('Wartość pozycji', formatMoney(sumy.itemsSum)) +
                 linia(`Rabat ${esc(offer.discountPercent)}%`, `−${formatMoney(sumy.discountAmount)}`)
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
