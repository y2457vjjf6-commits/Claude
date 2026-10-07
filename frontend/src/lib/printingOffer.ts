import { Offer, OfferGroup, Settings } from '../types';
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

/** Tabela pozycji jednej grupy: Lp., produkt, ilość, cena za sztukę, wartość. */
function tabela(g: OfferGroup, numery: string[], zNaglowkiem: boolean): string {
  const wiersze = g.items
    .map((it, ii) => {
      if (isItemEmpty(it)) return '';
      const material = String(it.material || '').trim();
      const sztuk = parseFloat(String(it.qty).replace(',', '.')) || 0;
      const zaSztuke = sztuk ? itemTotal(it) / sztuk : itemTotal(it);
      return `
          <tr>
            <td class="of-lp">${esc(numery[ii])}</td>
            <td class="of-name">
              <span class="of-name-main">${esc(it.name)}</span>
              ${material ? `<span class="of-material">${esc(material)}</span>` : ''}
            </td>
            <td class="of-qty">${esc(it.qty)}</td>
            <td class="of-unit">${formatMoney(zaSztuke)}</td>
            <td class="of-price">${formatMoney(itemTotal(it))}</td>
          </tr>`;
    })
    .join('');

  const naglowek = zNaglowkiem
    ? `<thead>
            <tr>
              <th class="of-lp"></th>
              <th class="of-name">${esc(columnHeaderLabel(g.header))}</th>
              <th class="of-qty">Ilość</th>
              <th class="of-unit">Cena/szt.</th>
              <th class="of-price">Wartość</th>
            </tr>
          </thead>`
    : '';

  return `<table class="of-items">${naglowek}<tbody>${wiersze}</tbody></table>`;
}

/**
 * Oferta cenowa — układ arkusza pomiarowego: po lewej wąska kolumna etykiet,
 * po prawej treść i kwoty na wspólnej osi. Linie rozdzielają dane, nie zdobią;
 * pomarańcz firmowy pojawia się wyłącznie jako akcent, nigdy jako tło treści.
 */
export function buildOfferHtml(offer: Offer, settings: Settings): string {
  const s = settings.seller;
  const grupy = offer.groups || [];
  const numery = groupLpNumbers(grupy, offer.continuousNumbering);
  const sumy = offerTotals(offer);

  const podstawowe = grupy.map((g, i) => ({ g, i })).filter(({ g }) => !g.variant);
  const warianty = grupy.map((g, i) => ({ g, i })).filter(({ g }) => g.variant);

  // Kwota za pomieszczenie ma sens dopiero wtedy, gdy pomieszczeń jest kilka —
  // przy jednym powtarzałaby cenę całkowitą tuż pod nią.
  const zKwotaPokoju = podstawowe.filter(({ g }) => g.items.some((it) => !isItemEmpty(it))).length > 1;

  let pierwszaTabela = true;
  const sekcjePodstawowe = podstawowe
    .map(({ g, i }) => {
      if (!g.items.some((it) => !isItemEmpty(it))) return '';
      const zNaglowkiem = pierwszaTabela;
      pierwszaTabela = false;
      const podpis = groupLabel(grupy, i);
      const naglowek = podpis
        ? `<div class="of-room">
             <span class="of-room-name">${esc(podpis)}</span>
             ${zKwotaPokoju ? `<span class="of-room-sum">${formatMoney(groupSum(g))}</span>` : ''}
           </div>`
        : '';
      return `<section class="of-group">${naglowek}${tabela(g, numery[i], zNaglowkiem)}</section>`;
    })
    .join('');

  // Warianty zebrane w jedną sekcję z wyraźnym podpisem: to alternatywy,
  // a nie dodatkowe pozycje do doliczenia.
  const sekcjaWariantow = warianty.length
    ? `<section class="of-variants">
         <div class="of-variants-head">
           <span class="of-variants-title">Warianty do wyboru</span>
           <span class="of-variants-note">Cena dotyczy jednego z nich — nie sumuje się z ceną całkowitą.</span>
         </div>
         ${warianty
           .map(({ g, i }) => {
             if (!g.items.some((it) => !isItemEmpty(it))) return '';
             const kwota = sumy.variants.find((w) => w.id === g.id);
             const podpis = groupLabel(grupy, i);
             const zNaglowkiem = pierwszaTabela;
             pierwszaTabela = false;
             return `<div class="of-variant">
                  <div class="of-room">
                    <span class="of-room-name">${esc(podpis)}</span>
                    ${kwota ? `<span class="of-room-sum">${formatMoney(kwota.total)}</span>` : ''}
                  </div>
                  ${tabela(g, numery[i], zNaglowkiem)}
                </div>`;
           })
           .join('')}
       </section>`
    : '';

  const liniePodsumowania =
    offer.discountEnabled && sumy.discountAmount
      ? `<div class="of-sum-line"><span>Wartość pozycji</span><span>${formatMoney(sumy.itemsSum)}</span></div>
         <div class="of-sum-line"><span>Rabat ${esc(offer.discountPercent)}%</span><span>−${formatMoney(
          sumy.discountAmount
        )}</span></div>`
      : '';

  // Ceny w cenniku są brutto, więc netto wyliczamy wstecz — tylko dla firm
  const vat = offerVat(sumy.total);
  const rozbicieVat = offer.vatBreakdown
    ? `<div class="of-vat">
         <div class="of-sum-line"><span>W tym netto</span><span>${formatMoney(vat.netto)}</span></div>
         <div class="of-sum-line"><span>VAT ${vat.rate}%</span><span>${formatMoney(vat.vat)}</span></div>
       </div>`
    : '';

  const etykietaCeny = warianty.length ? 'Cena całkowita oferty podstawowej' : 'Cena całkowita';
  const podsumowanie =
    sumy.itemsSum > 0 || !warianty.length
      ? `<div class="of-sum">
           ${liniePodsumowania}
           <div class="of-grand">
             <span class="of-grand-label">${esc(etykietaCeny)}</span>
             <span class="of-grand-value">${formatMoney(sumy.total)}</span>
           </div>
           ${rozbicieVat}
         </div>`
      : '';

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
      <div class="of-ident">
        <div class="of-kind">Oferta cenowa</div>
        ${offer.number ? `<div class="of-number">${esc(offer.number)}</div>` : ''}
      </div>
    </header>

    <div class="of-meta">${naglowekDanych}</div>

    ${sekcjePodstawowe}
    ${sekcjaWariantow}
    ${podsumowanie}

    <div class="of-terms">${warunki}</div>

    ${uwagiKoncowe}

    <div class="of-sign">
      <div class="of-label">Ofertę przygotował</div>
      <div class="of-signer">${esc(offer.issuedBy)}</div>
      ${
        String(offer.issuedByPhone || '').trim()
          ? `<div class="of-signer-phone">tel. ${esc(String(offer.issuedByPhone).trim())}</div>`
          : ''
      }
    </div>

    <footer class="of-foot">${stopka}</footer>
  </div>`;
}
