/** Kontrola jakości i protokół zlecenia.
 *
 *  Dwie rzeczy, o które prosił warsztat:
 *
 *  1. **Protokół** — po skończeniu zlecenia widać, kto prowadził każdy etap.
 *     Nie liczymy tego na nowo: wszystko stoi już w dzienniku, bo każde
 *     przestawienie etapu dopisuje wpis z imieniem i godziną.
 *  2. **Zdjęcie odbioru** — dowód, że to, co wyjechało, wyglądało tak, jak
 *     wyglądało. Robi się je telefonem po zeskanowaniu kodu ze zlecenia.
 */
import type { ProductionOrder, Stage, StageEvent } from '../types';
import { czyKoncowy, etapy } from './production';

/** Czy zlecenie jest skończone — wszystkie pozycje w etapie końcowym.
 *  Puste zlecenie skończone nie jest: nie ma czego odbierać. */
export function orderFinished(order: ProductionOrder, stages: Stage[] | undefined): boolean {
  return order.items.length > 0 && order.items.every((it) => czyKoncowy(stages, it.stageId));
}

export interface WierszProtokolu {
  stage: Stage;
  /** Kto prowadził ten etap — w kolejności pierwszego wejścia */
  osoby: string[];
  /** Kiedy pozycje pierwszy raz weszły w ten etap i kiedy ostatni */
  od?: string;
  do?: string;
  /** Ile pozycji przez ten etap przeszło */
  pozycji: number;
}

/** Protokół: etap po etapie, kto go robił i kiedy.
 *
 *  Czytamy z dziennika, a nie z bieżących etapów pozycji — zlecenie, które
 *  cofnięto i poprawiono, ma przejść przez etap dwa razy i ma to być widać.
 */
export function stageProtocol(
  order: ProductionOrder,
  events: StageEvent[] | undefined,
  stages: Stage[] | undefined
): WierszProtokolu[] {
  const lista = etapy(stages);
  const moje = (events || [])
    .filter((e) => e.orderId === order.id)
    .slice()
    .sort((a, b) => (a.at < b.at ? -1 : 1));

  return lista
    .map((stage) => {
      const wejscia = moje.filter((e) => e.toStageId === stage.id);
      const osoby: string[] = [];
      for (const e of wejscia) {
        const kto = String(e.by || '').trim();
        if (kto && !osoby.includes(kto)) osoby.push(kto);
      }
      return {
        stage,
        osoby,
        od: wejscia[0]?.at,
        do: wejscia[wejscia.length - 1]?.at,
        pozycji: new Set(wejscia.map((e) => e.itemId)).size
      };
    })
    // Etapy, przez które nic nie przeszło, pomijamy — protokół ma być
    // sprawozdaniem z tego, co się wydarzyło, a nie spisem możliwości.
    .filter((w) => w.pozycji > 0);
}

/** Treść zakodowana w kodzie QR: adres strony, którą otwiera telefon. */
export function qcLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/q/${token}`;
}
