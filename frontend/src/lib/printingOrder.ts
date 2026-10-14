/** Kartka na warsztat.
 *
 *  Celowo inny dokument niż oferta: bez cen, bez warunków handlowych, bez
 *  grzeczności. Ma leżeć na stole przy maszynie i odpowiadać na jedno pytanie —
 *  co dokładnie zrobić i do kiedy — więc specyfikacja jest tu największym
 *  elementem, a nie przypisem.
 */
import type { ProductionOrder, Settings, Stage } from '../types';
import { etapy } from './production';
import { filledSpec } from './offers';
import { formatDatePl } from './printing';

function esc(tekst: string): string {
  return String(tekst ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildOrderHtml(order: ProductionOrder, settings: Settings): string {
  const lista = etapy(settings.stages);
  const nazwaEtapu = (id: string) => lista.find((e) => e.id === id)?.name || id;

  const pozycje = order.items
    .map((it, i) => {
      const spec = filledSpec(it.spec);
      return (
        `<tr class="zl-poz">` +
        `<td class="zl-lp">${i + 1}</td>` +
        `<td>` +
        `<div class="zl-nazwa">${esc(it.name)}</div>` +
        (it.material ? `<div class="zl-material">${esc(it.material)}</div>` : '') +
        (spec.length
          ? `<dl class="zl-spec">${spec
              .map((w) => `<dt>${esc(w.label)}</dt><dd>${esc(w.value) || '—'}</dd>`)
              .join('')}</dl>`
          : '') +
        (it.note ? `<div class="zl-uwaga">${esc(it.note)}</div>` : '') +
        `</td>` +
        `<td class="zl-ilosc">${esc(it.qty)}</td>` +
        `<td class="zl-etap">${esc(nazwaEtapu(it.stageId))}</td>` +
        `<td class="zl-podpis"></td>` +
        `</tr>`
      );
    })
    .join('');

  return `
<article class="zl" data-pagina="Zlecenie ${esc(order.number || '')}  ·  ${esc(formatDatePl(order.date))}">
  <header class="zl-top">
    <div>
      <div class="zl-kind">Zlecenie produkcyjne</div>
      <div class="zl-numer">${esc(order.number || '—')}</div>
    </div>
    <table class="zl-meta">
      <tbody>
        <tr><th>Klient</th><td>${esc(order.client) || '—'}</td></tr>
        ${order.clientAddress ? `<tr><th>Adres</th><td>${esc(order.clientAddress)}</td></tr>` : ''}
        ${order.clientPhone ? `<tr><th>Telefon</th><td>${esc(order.clientPhone)}</td></tr>` : ''}
        <tr><th>Założone</th><td>${esc(formatDatePl(order.date))}</td></tr>
        <tr class="zl-termin"><th>Termin</th><td>${order.dueDate ? esc(formatDatePl(order.dueDate)) : '—'}</td></tr>
      </tbody>
    </table>
  </header>

  ${order.notes ? `<section class="zl-uwagi"><h2>Uwagi</h2><p>${esc(order.notes)}</p></section>` : ''}

  <table class="zl-items">
    <thead>
      <tr>
        <th class="zl-lp">Lp.</th>
        <th>Co zrobić</th>
        <th class="zl-ilosc">Szt.</th>
        <th class="zl-etap">Etap</th>
        <th class="zl-podpis">Zrobione (podpis)</th>
      </tr>
    </thead>
    <tbody>${pozycje}</tbody>
  </table>
</article>`;
}

/** Nazwa pliku PDF — numer zlecenia wystarczy, klient bywa długi. */
export function orderFileName(order: ProductionOrder): string {
  const numer = String(order.number || 'zlecenie').replace(/[^\w-]+/g, '-');
  return `Zlecenie_${numer}.pdf`;
}

export function stageNames(stages: Stage[] | undefined): string[] {
  return etapy(stages).map((e) => e.name);
}
