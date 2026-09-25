import { Settings, WZDocument } from '../types';
import { LOGO_LECHROL } from '../assets/logo';

export function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDatePl(dateStr: string): string {
  const [y, m, d] = String(dateStr || '').split('-');
  return y && m && d ? `${d}.${m}.${y}` : '';
}

/** Data i godzina po polsku, np. „20.08.2026, 14:31”. */
export function formatDateTimePl(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dwie = (n: number) => String(n).padStart(2, '0');
  return `${dwie(d.getDate())}.${dwie(d.getMonth() + 1)}.${d.getFullYear()}, ${dwie(d.getHours())}:${dwie(d.getMinutes())}`;
}

const MIN_PRINT_ROWS = 12;

export function buildPrintHtml(doc: WZDocument, settings: Settings): string {
  const s = settings.seller;
  const items = doc.items.slice();
  while (items.length < MIN_PRINT_ROWS) items.push({ name: '', unit: '', qty: '' });

  const rows = items
    .map(
      (it, i) => `
    <tr>
      <td class="col-lp">${i + 1}</td>
      <td>${esc(it.name)}</td>
      <td class="col-order">${esc(it.order)}</td>
      <td class="col-unit">${esc(it.unit)}</td>
      <td class="col-qty">${esc(it.qty)}</td>
    </tr>`
    )
    .join('');

  return `
  <div class="wz-doc">
    <div class="wz-header">
      <div>
        <div class="wz-logo"><img src="${LOGO_LECHROL}" alt="LECHROL"></div>
        <div class="wz-seller-lines">
          ${esc(s.name)}<br>
          ${esc(s.address)}<br>
          tel. ${esc(s.phone)}<br>
          ${esc(s.www)}
        </div>
      </div>
      <div class="wz-title-block">
        <div class="wz-title">WZ — Wydanie zewnętrzne</div>
        <div class="wz-number">Nr ${esc(doc.number)}</div>
        <div class="wz-subtitle">Dokument wydania towaru z magazynu</div>
      </div>
    </div>

    <div class="wz-meta">
      <div class="wz-meta-cell">
        <div class="wz-label">Data wystawienia</div>
        <div class="wz-meta-value">${esc(formatDatePl(doc.dateIssued))}</div>
      </div>
      <div class="wz-meta-cell">
        <div class="wz-label">Miejsce wystawienia</div>
        <div class="wz-meta-value">${esc(doc.place)}</div>
      </div>
      <div class="wz-meta-cell">
        <div class="wz-label">Nr zamówienia / umowy</div>
        <div class="wz-meta-value">${esc(doc.orderNo)}</div>
      </div>
    </div>

    <div class="wz-parties">
      <div class="wz-party">
        <div class="wz-label">Sprzedawca / Wydający</div>
        <div class="wz-party-row"><div class="wz-party-key">Firma:</div><div class="wz-party-val">${esc(s.name)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">Adres:</div><div class="wz-party-val">${esc(s.address)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">NIP:</div><div class="wz-party-val">${esc(s.nip)}</div></div>
      </div>
      <div class="wz-party">
        <div class="wz-label">Odbiorca / Nabywca</div>
        <div class="wz-party-row"><div class="wz-party-key">Firma / Imię:</div><div class="wz-party-val">${esc(doc.contractor?.name)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">Adres:</div><div class="wz-party-val">${esc(doc.contractor?.address)}</div></div>
        <div class="wz-party-row"><div class="wz-party-key">NIP:</div><div class="wz-party-val">${esc(doc.contractor?.nip)}</div></div>
      </div>
    </div>

    <table class="wz-items">
      <thead>
        <tr>
          <th class="col-lp">Lp.</th>
          <th>Nazwa towaru / opis</th>
          <th class="col-order">Zamówienie</th>
          <th class="col-unit">Jedn.</th>
          <th class="col-qty">Ilość</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="wz-bottom">
      <div class="wz-notes">
        <div class="wz-label">Uwagi</div>
        <div class="wz-notes-text">${esc(doc.notes)}</div>
      </div>
      <div class="wz-received">
        <div class="wz-label">Kto odebrał</div>
        <div class="wz-received-name">${esc(doc.receivedBy)}</div>
      </div>
    </div>

    <div class="wz-signatures">
      <div class="wz-sign">Wystawił / Wydał (podpis)</div>
      <div class="wz-sign">Odebrał (podpis)</div>
    </div>

    <div class="wz-footer">
      ${esc(s.name)} · ${esc(s.address)} · tel. ${esc(s.phone)} · ${esc(s.www)}
    </div>
  </div>`;
}

export function pdfFilename(doc: WZDocument): string {
  return 'WZ_' + doc.number.replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
}

import {
  emailPrintable,
  printPrintable,
  savePdfPrintable,
  PrintableDocument,
  ToastFn
} from './docActions';

// Treść wiadomości: podmienia {numer} i {odebral}. Gdy szablon nie zawiera
// {odebral}, a dokument ma wpisanego odbierającego, dopisuje osobny akapit
// zaraz za tym, który mówi o dokumencie.
export function buildEmailBody(template: string, doc: WZDocument): string {
  const received = (doc.receivedBy || '').trim();
  let text = template.replaceAll('{numer}', doc.number);

  if (text.includes('{odebral}')) {
    if (received) return text.replaceAll('{odebral}', received);
    // brak odbierającego — usuń cały wiersz z tym znacznikiem
    return text
      .split('\n')
      .filter((line) => !line.includes('{odebral}'))
      .join('\n');
  }
  if (!received) return text;

  const line = `Towar odebrał: ${received}`;
  const paragraphs = text.split('\n\n');
  const idx = paragraphs.findIndex((p) => p.includes(doc.number));
  paragraphs.splice(idx >= 0 ? idx + 1 : Math.min(1, paragraphs.length), 0, line);
  return paragraphs.join('\n\n');
}

/** Dokument WZ w postaci gotowej do wydruku, zapisu i wysyłki. */
export function wzPrintable(doc: WZDocument, settings: Settings): PrintableDocument {
  return {
    html: buildPrintHtml(doc, settings),
    fileName: pdfFilename(doc),
    recipient: doc.contractor?.email || '',
    subject: settings.emailSubject.replaceAll('{numer}', doc.number),
    body: buildEmailBody(settings.emailBody, doc),
    label: `dokument ${doc.number}`,
    missingRecipientMessage: 'Odbiorca nie ma podanego adresu e-mail. Uzupełnij go w dokumencie.'
  };
}

export const printDocument = (doc: WZDocument, settings: Settings, toast: ToastFn) =>
  printPrintable(wzPrintable(doc, settings), toast);

export const savePdfDocument = (doc: WZDocument, settings: Settings, toast: ToastFn) =>
  savePdfPrintable(wzPrintable(doc, settings), toast);

export const emailDocument = (
  doc: WZDocument,
  settings: Settings,
  toast: ToastFn,
  confirm: (message: string) => Promise<boolean>
) => emailPrintable(wzPrintable(doc, settings), settings, toast, confirm);
