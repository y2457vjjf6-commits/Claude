import { Offer, Settings } from '../types';
import { LOGO_LECHROL } from '../assets/logo';
import {
  columnHeaderLabel,
  formatMoney,
  groupLabel,
  groupLpNumbers,
  isItemEmpty,
  itemTotal,
  offerTotals,
  validUntil
} from './offers';
import { esc, formatDatePl } from './printing';

/** Wiersz „etykieta — wartość”: podstawowa jednostka układu dokumentu. */
function wiersz(etykieta: string, wartosc: string, klasa = ''): string {
  if (!wartosc) return '';
  return `
      <div class="of-row">
        <div class="of-label">${esc(etykieta)}</div>
        <div class="of-value${klasa ? ' ' + klasa : ''}">${wartosc}</div>
      </div>`;
}

/**
 * Oferta cenowa — układ arkusza pomiarowego: po lewej wąska kolumna etykiet,
 * po prawej treść i kwoty na wspólnej osi. Linie rozdzielają dane, nie zdobią;
 * jedyna duża liczba na stronie to cena całkowita.
 */
export function buildOfferHtml(offer: Offer, settings: Settings): string {
  const s = settings.seller;
  const numery = groupLpNumbers(offer.groups || [], offer.continuousNumbering);
  const sumy = offerTotals(offer);
  const grupy = offer.groups || [];

  let pierwszaTabela = true;

  const tabele = grupy
    .map((g, gi) => {
      const pozycje = g.items.filter((it) => !isItemEmpty(it));
      if (!pozycje.length) return '';
      // Nagłówek kolumn wystarczy raz — kolejne tabele stoją w tej samej siatce
      const zNaglowkiem = pierwszaTabela;
      pierwszaTabela = false;

      const podpis = groupLabel(grupy, gi);
      const naglowekGrupy = podpis ? `<div class="of-group-title">${esc(podpis)}</div>` : '';

      const wariantKwota = g.variant ? sumy.variants.find((w) => w.id === g.id) : undefined;
      const podsumowanieWariantu = wariantKwota
        ? `<div class="of-variant-total">
             <span class="of-variant-label">Cena wariantu</span>
             <span class="of-variant-value">${formatMoney(wariantKwota.total)}</span>
           </div>`
        : '';

      const wiersze = g.items
        .map((it, ii) => {
          if (isItemEmpty(it)) return '';
          const material = String(it.material || '').trim();
          return `
          <tr>
            <td class="of-lp">${esc(numery[gi][ii])}</td>
            <td class="of-name">
              <span class="of-name-main">${esc(it.name)}</span>
              ${material ? `<span class="of-material">${esc(material)}</span>` : ''}
            </td>
            <td class="of-qty">${esc(it.qty)}</td>
            <td class="of-price">${formatMoney(itemTotal(it))}</td>
          </tr>`;
        })
        .join('');

      return `
      <section class="of-group">
        ${naglowekGrupy}
        <table class="of-items">
          ${
            zNaglowkiem
              ? `<thead>
            <tr>
              <th class="of-lp"></th>
              <th class="of-name">${esc(columnHeaderLabel(g.header))}</th>
              <th class="of-qty">Ilość</th>
              <th class="of-price">Wartość</th>
            </tr>
          </thead>`
              : ''
          }
          <tbody>${wiersze}</tbody>
        </table>
        ${podsumowanieWariantu}
      </section>`;
    })
    .join('');

  // Rabat pokazujemy razem z wartością przed rabatem — inaczej odjęcie wisi w próżni
  const liniePodsumowania =
    offer.discountEnabled && sumy.discountAmount
      ? `<div class="of-sum-line"><span>Wartość pozycji</span><span>${formatMoney(sumy.itemsSum)}</span></div>
         <div class="of-sum-line"><span>Rabat ${esc(offer.discountPercent)}%</span><span>−${formatMoney(
          sumy.discountAmount
        )}</span></div>`
      : '';

  // Oferta złożona wyłącznie z wariantów nie ma jednej ceny całkowitej —
  // każdy wariant wyceniony jest pod swoją tabelą.
  const etykietaCeny = sumy.variants.length ? 'Cena całkowita oferty podstawowej' : 'Cena całkowita';
  const podsumowanie =
    sumy.itemsSum > 0 || !sumy.variants.length
      ? `<div class="of-sum">
           ${liniePodsumowania}
           <div class="of-grand">
             <span class="of-grand-label">${esc(etykietaCeny)}</span>
             <span class="of-grand-value">${formatMoney(sumy.total)}</span>
           </div>
         </div>`
      : '';

  // Warunki jako pary etykieta — wartość. Puste pole kwoty dostawy znaczy
  // „nie dotyczy”, brak liczby dni znaczy, że terminu nie podajemy wcale.
  const warunki = [
    wiersz('Montaż', offer.installationIncluded ? 'Wliczony w cenę' : 'Nieuwzględniony w cenie'),
    wiersz(
      'Termin realizacji',
      String(offer.deadlineDays || '').trim()
        ? `do ${esc(offer.deadlineDays)} dni roboczych od akceptacji zamówienia`
        : ''
    ),
    wiersz(
      'Dostawa',
      offer.deliveryEnabled
        ? String(offer.deliveryPrice || '').trim()
          ? formatMoney(sumy.deliveryAmount)
          : 'nie dotyczy'
        : ''
    ),
    wiersz('Oferta ważna do', offer.validityEnabled && validUntil(offer) ? esc(validUntil(offer)) : ''),
    wiersz('Uwagi', String(offer.notes || '').trim() ? esc(offer.notes).replace(/\n/g, '<br>') : '')
  ].join('');

  // Uwagi końcowe: ten sam tekst pod każdą ofertą, z Ustawień.
  // Wiersz zaczynający się od • składa się jak punkt listy, z wcięciem
  // dalszych linii; zwykły wiersz jest akapitem z odstępem pod spodem.
  const wierszeUwag = String(settings.offerClosingText || '')
    .trim()
    .split('\n')
    .map((linia) => {
      const tekst = linia.trim();
      if (!tekst) return '<div class="of-closing-space"></div>';
      const punkt = tekst.startsWith('•');
      return `<div class="${punkt ? 'of-closing-bullet' : 'of-closing-para'}">${esc(tekst)}</div>`;
    })
    .join('');

  const uwagiKoncowe = String(settings.offerClosingText || '').trim()
    ? `<div class="of-closing">${wierszeUwag}</div>`
    : '';

  const naglowekDanych = [
    wiersz('Dla', esc(offer.client || ''), 'of-value-lead'),
    wiersz('Data', `${esc(offer.place || 'Łomianki')}, ${esc(formatDatePl(offer.date))}`)
  ].join('');

  const stopka = [s.name, s.address, s.nip ? `NIP ${s.nip}` : '', s.phone ? `tel. ${s.phone}` : '', s.www]
    .filter((c) => String(c || '').trim())
    .map((c) => `<span>${esc(String(c))}</span>`)
    .join('');

  return `
  <div class="of-doc">
    <header class="of-top">
      <img class="of-mark" src="${LOGO_LECHROL}" alt="LECHROL">
      <div class="of-kind">Oferta cenowa</div>
    </header>

    <div class="of-meta">${naglowekDanych}</div>

    ${tabele}
    ${podsumowanie}

    <div class="of-terms">${warunki}</div>

    ${uwagiKoncowe}

    <div class="of-sign">
      <div class="of-label">Ofertę przygotował</div>
      <div class="of-signer">${esc(offer.issuedBy)}</div>
    </div>

    <footer class="of-foot">${stopka}</footer>
  </div>`;
}
