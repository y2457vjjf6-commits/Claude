import { Offer, Settings } from '../types';
import { LOGO_LECHROL } from '../assets/logo';
import { columnHeaderLabel, formatMoney, groupLpNumbers, isItemEmpty, itemTotal, offerTotals, validUntil } from './offers';
import { esc, formatDatePl } from './printing';

/** Dokument oferty w układzie stosowanym dotąd przez firmę (Word/PDF). */
export function buildOfferHtml(offer: Offer, settings: Settings): string {
  const s = settings.seller;
  const numery = groupLpNumbers(offer.groups || [], offer.continuousNumbering);
  const sumy = offerTotals(offer);

  const tabele = (offer.groups || [])
    .map((g, gi) => {
      const pozycje = g.items.filter((it) => !isItemEmpty(it));
      if (!pozycje.length) return '';
      const wiersze = g.items
        .map((it, ii) => {
          if (isItemEmpty(it)) return '';
          const material = String(it.material || '').trim();
          return `
      <tr>
        <td class="of-lp">${esc(numery[gi][ii])}.</td>
        <td class="of-name">${esc(it.name)}${material ? `<br><span class="of-material">(${esc(material)})</span>` : ''}</td>
        <td class="of-qty">${esc(it.qty)}</td>
        <td class="of-price">${formatMoney(itemTotal(it))}</td>
      </tr>`;
        })
        .join('');
      return `
    <table class="of-items">
      <thead>
        <tr>
          <th class="of-lp">Lp.</th>
          <th class="of-name">${esc(columnHeaderLabel(g.header))}</th>
          <th class="of-qty">Ilość (szt.)</th>
          <th class="of-price">Cena (Brutto)</th>
        </tr>
      </thead>
      <tbody>${wiersze}</tbody>
    </table>`;
    })
    .join('');

  const rabat = offer.discountEnabled && sumy.discountAmount
    ? `<div class="of-sum-line">Rabat ${esc(offer.discountPercent)}%: −${formatMoney(sumy.discountAmount)}</div>`
    : '';

  const dostawa = offer.deliveryEnabled
    ? `<div class="of-bullet">• Szacunkowy koszt dostawy – ${
        offer.deliveryNotApplicable ? 'nie dotyczy' : formatMoney(sumy.deliveryAmount)
      }</div>`
    : '';

  const waznosc = offer.validityEnabled && validUntil(offer)
    ? `<div class="of-bullet">• Oferta ważna do ${esc(validUntil(offer))}</div>`
    : '';

  const uwagi = String(offer.notes || '').trim()
    ? `<div class="of-notes">${esc(offer.notes).replace(/\n/g, '<br>')}</div>`
    : '';

  const klauzula = offer.legalClause && String(settings.offerLegalText || '').trim()
    ? `<div class="of-legal">${esc(settings.offerLegalText)}</div>`
    : '';

  const klient = String(offer.client || '').trim()
    ? `<div class="of-client"><span class="of-client-label">Dla:</span> ${esc(offer.client)}</div>`
    : '';

  return `
  <div class="of-doc">
    <div class="of-logo"><img src="${LOGO_LECHROL}" alt="LECHROL"></div>

    <div class="of-head">
      <div class="of-seller">
        ${esc(s.name).toUpperCase()}<br>
        ${esc(s.address)}<br>
        ${s.nip ? `NIP: ${esc(s.nip)}<br>` : ''}
        tel. ${esc(s.phone)}
      </div>
      <div class="of-date">${esc(offer.place || 'Łomianki')}, ${esc(formatDatePl(offer.date))}</div>
    </div>

    ${klient}
    ${tabele}

    <div class="of-summary">
      ${rabat}
      <div class="of-total">Cena całkowita: ${formatMoney(sumy.total)}</div>
    </div>

    <div class="of-conditions">
      <div>Oferta sporządzona na podstawie ${esc(offer.measurementSource)} pomiarów.</div>
      <div>Ceny ${offer.installationIncluded ? 'uwzględniają' : 'nie uwzględniają'} montażu.</div>
      <div class="of-bullet">• Termin realizacji – do ${esc(offer.deadlineDays)} dni roboczych od daty ${esc(
        offer.deadlineBasis
      )} zamówienia.</div>
      ${dostawa}
      ${waznosc}
      ${uwagi}
    </div>

    ${klauzula}

    <div class="of-sign">
      <div class="of-sign-regards">Z poważaniem</div>
      <div class="of-sign-name">${esc(offer.issuedBy)}</div>
    </div>
  </div>`;
}

