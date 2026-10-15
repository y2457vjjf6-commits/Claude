import { useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductionOrder, Stage, StageEvent, UserAccount } from '../types';
import { czyKoncowy, etapy, nastepnyEtap, poprzedniEtap } from '../lib/production';
import { nazwaOsoby } from '../lib/departments';
import { todayStr } from '../lib/dates';

interface Props {
  orders: ProductionOrder[];
  stages: Stage[];
  /** Potrzebne, żeby pokazać imię osoby przypisanej do pozycji */
  users: UserAccount[];
  onBack: () => void;
  onOpen: (id: string) => void;
  onAdvance: (order: ProductionOrder, itemId: string, stageId: string) => void;
}

interface Karta {
  order: ProductionOrder;
  itemId: string;
  tytul: string;
  klient: string;
  termin?: string;
  qty: string;
  note?: string;
  numerWlasny?: string;
  kto?: string;
}

export default function BoardView({ orders, stages, users, onBack, onOpen, onAdvance }: Props) {
  const lista = etapy(stages);
  const dzis = todayStr();

  // Tablica pokazuje robotę w toku. Zlecenia wstrzymane i rzeczy już wydane
  // tylko by ją zagracały — od archiwum jest lista.
  const kolumny = useMemo(() => {
    const mapa = new Map<string, Karta[]>(lista.map((e) => [e.id, []]));
    for (const o of orders) {
      if (o.onHold) continue;
      for (const it of o.items) {
        if (czyKoncowy(stages, it.stageId)) continue;
        const kolumna = mapa.get(it.stageId);
        if (!kolumna) continue;
        kolumna.push({
          order: o,
          itemId: it.id,
          tytul: it.name || '—',
          klient: o.client,
          termin: o.dueDate,
          qty: it.qty,
          note: it.note,
          numerWlasny: o.ownNumber,
          kto: nazwaOsoby(users, it.assignee)
        });
      }
    }
    // W każdej kolumnie najpilniejsze na górze
    for (const karty of Array.from(mapa.values())) {
      karty.sort((a, b) => (a.termin || '9999-12-31') < (b.termin || '9999-12-31') ? -1 : 1);
    }
    return mapa;
  }, [orders, lista, stages, users]);

  return (
    <section className="view" data-testid="view-board">
      <header className="view-head editor-head">
        <button className="btn btn-light" data-testid="board-back" onClick={onBack}>
          <ArrowLeft className="icon" />
          Wróć
        </button>
        <h1 className="page-title">Tablica produkcji</h1>
      </header>

      <div className="board" data-testid="board">
        {lista
          .filter((e) => !czyKoncowy(stages, e.id))
          .map((e) => {
            const karty = kolumny.get(e.id) || [];
            return (
              <div className="board-col" key={e.id} data-testid={`board-col-${e.id}`}>
                <div className="board-col-head" style={{ borderTopColor: e.color }}>
                  <span>{e.name}</span>
                  <span className="chip-count">{karty.length}</span>
                </div>
                {karty.map((k) => {
                  const dalej = nastepnyEtap(stages, e.id);
                  const wstecz = poprzedniEtap(stages, e.id);
                  const popsute = !!k.termin && k.termin <= dzis;
                  return (
                    <div
                      className={'board-card' + (popsute ? ' late' : '')}
                      key={k.itemId}
                      data-testid={`board-card-${k.itemId}`}
                    >
                      <button
                        className="board-card-open"
                        data-testid={`board-open-${k.itemId}`}
                        onClick={() => onOpen(k.order.id)}
                        title="Otwórz zlecenie"
                      >
                        <span className="board-card-title">{k.tytul}</span>
                        <span className="board-card-meta">
                          {k.klient}
                          {k.numerWlasny ? ` · ${k.numerWlasny}` : ''}
                          {Number(k.qty) > 1 ? ` · ${k.qty} szt.` : ''}
                          {k.termin ? ` · ${k.termin}` : ''}
                        </span>
                        {k.kto && <span className="board-card-who">{k.kto}</span>}
                        {k.note && <span className="board-card-note">{k.note}</span>}
                      </button>
                      <div className="board-card-moves">
                        {wstecz && (
                          <button
                            className="btn btn-small btn-light"
                            data-testid={`board-prev-${k.itemId}`}
                            title={`Cofnij na: ${wstecz.name}`}
                            aria-label={`Cofnij na: ${wstecz.name}`}
                            onClick={() => onAdvance(k.order, k.itemId, wstecz.id)}
                          >
                            <ChevronLeft className="icon" />
                          </button>
                        )}
                        {dalej && (
                          <button
                            className="btn btn-small btn-light board-card-next"
                            data-testid={`board-next-${k.itemId}`}
                            title={`Przestaw na: ${dalej.name}`}
                            onClick={() => onAdvance(k.order, k.itemId, dalej.id)}
                          >
                            <span className="board-next-label">{dalej.name}</span>
                            <ChevronRight className="icon" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!karty.length && <p className="board-empty muted">pusto</p>}
              </div>
            );
          })}
      </div>
    </section>
  );
}
