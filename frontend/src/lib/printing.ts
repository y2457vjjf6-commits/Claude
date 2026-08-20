import DOMPurify from 'dompurify';
import { Settings, WZDocument } from '../types';
import { hasApi } from './storage';

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
      <td class="col-unit">${esc(it.unit)}</td>
      <td class="col-qty">${esc(it.qty)}</td>
    </tr>`
    )
    .join('');

  return `
  <div class="wz-doc">
    <div class="wz-header">
      <div>
        <div class="wz-logo-name">LECHROL</div>
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
          <th class="col-unit">Jedn.</th>
          <th class="col-qty">Ilość</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="wz-notes">
      <div class="wz-label">Uwagi</div>
      <div class="wz-notes-text">${esc(doc.notes)}</div>
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

export function sanitizedPrintHtml(doc: WZDocument, settings: Settings): string {
  return DOMPurify.sanitize(buildPrintHtml(doc, settings));
}

export function fillPrintArea(doc: WZDocument, settings: Settings): void {
  const area = document.getElementById('print-area');
  if (!area) return;
  area.innerHTML = sanitizedPrintHtml(doc, settings);
}

export function pdfFilename(doc: WZDocument): string {
  return 'WZ_' + doc.number.replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
}

type ToastFn = (msg: string, isError?: boolean) => void;

export async function printDocument(doc: WZDocument, settings: Settings, toast: ToastFn): Promise<void> {
  fillPrintArea(doc, settings);
  if (hasApi && window.wzApi) {
    const res = await window.wzApi.printDoc();
    if (!res.ok && res.error && res.error !== 'cancelled') toast('Drukowanie: ' + res.error, true);
  } else {
    window.print();
  }
}

export async function savePdfDocument(doc: WZDocument, settings: Settings, toast: ToastFn): Promise<void> {
  fillPrintArea(doc, settings);
  if (hasApi && window.wzApi) {
    const res = await window.wzApi.savePdf(pdfFilename(doc));
    if (res.ok) toast('Zapisano PDF: ' + res.filePath);
    else if (!res.canceled) toast('Błąd zapisu PDF: ' + res.error, true);
  } else {
    window.print();
  }
}

export async function emailDocument(
  doc: WZDocument,
  settings: Settings,
  toast: ToastFn,
  confirm: (message: string) => Promise<boolean>
): Promise<void> {
  if (!hasApi || !window.wzApi) {
    toast('Wysyłka e-mail dostępna tylko w aplikacji desktopowej.', true);
    return;
  }
  const to = doc.contractor?.email;
  if (!to) {
    toast('Odbiorca nie ma podanego adresu e-mail. Uzupełnij go w dokumencie.', true);
    return;
  }
  const smtp = settings.smtp;
  if (!smtp.host || !smtp.user) {
    toast('Brak konfiguracji poczty — uzupełnij dane SMTP w Ustawieniach.', true);
    return;
  }
  if (!(await confirm(`Wysłać dokument ${doc.number} na adres ${to}?`))) return;

  fillPrintArea(doc, settings);
  toast('Wysyłanie e-maila…');
  const res = await window.wzApi.sendEmail({
    smtp,
    to,
    subject: settings.emailSubject.replaceAll('{numer}', doc.number),
    text: settings.emailBody.replaceAll('{numer}', doc.number),
    filename: pdfFilename(doc)
  });
  if (res.ok) toast(`Wysłano dokument ${doc.number} na adres ${to}.`);
  else toast('Błąd wysyłki: ' + res.error, true);
}
