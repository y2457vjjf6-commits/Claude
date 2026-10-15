/** Kartka na warsztat.
 *
 *  Celowo inny dokument niż oferta: bez cen, bez warunków handlowych, bez
 *  grzeczności. Ma leżeć na stole przy maszynie i odpowiadać na jedno pytanie —
 *  co dokładnie zrobić i do kiedy — więc specyfikacja jest tu największym
 *  elementem, a nie przypisem.
 */
import type { ProductionOrder, Settings, Stage, StageEvent } from '../types';
import { etapy } from './production';
import { orderFinished, stageProtocol } from './quality';
import { filledSpec } from './offers';
import { formatDatePl } from './printing';

function esc(tekst: string): string {
  return String(tekst ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildOrderHtml(
  order: ProductionOrder,
  settings: Settings,
  events?: StageEvent[]
): string {
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
        // Zdjęcie z pomiaru mówi warsztatowi więcej niż akapit opisu
        (it.photo ? `<img class="zl-foto" src="${esc(it.photo)}" alt="">` : '') +
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

  // Protokół drukujemy dopiero, gdy jest co protokołować — na kartce
  // wędrującej z robotą po warsztacie byłby pustą rubryką.
  const protokol = orderFinished(order, settings.stages) ? stageProtocol(order, events, settings.stages) : [];
  const wierszeProtokolu = protokol
    .map(
      (w) =>
        `<tr><td>${esc(w.stage.name)}</td><td>${esc(w.osoby.join(', ')) || '—'}</td>` +
        `<td class="zl-ilosc">${w.pozycji}</td>` +
        `<td>${w.do ? esc(new Date(w.do).toLocaleString('pl-PL')) : '—'}</td></tr>`
    )
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
        ${order.ownNumber ? `<tr><th>Numer własny</th><td class="zl-wlasny">${esc(order.ownNumber)}</td></tr>` : ''}
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

  ${
    protokol.length
      ? `<section class="zl-protokol">
    <h2>Protokół wykonania</h2>
    <table class="zl-items">
      <thead><tr><th>Etap</th><th>Kto realizował</th><th class="zl-ilosc">Poz.</th><th>Zakończono</th></tr></thead>
      <tbody>${wierszeProtokolu}</tbody>
    </table>
    ${
      order.qcDoneAt
        ? `<p class="zl-odbior">Odebrane po kontroli jakości: ${esc(
            new Date(order.qcDoneAt).toLocaleString('pl-PL')
          )}${order.qcBy ? ` · ${esc(order.qcBy)}` : ''}.</p>`
        : '<p class="zl-odbior">Odbiór po kontroli jakości: ……………………………………</p>'
    }
  </section>`
      : ''
  }
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
