import { useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, LayoutGrid, Clock, Printer, FileOutput } from 'lucide-react';
import { ProductionOrder, Stage, StageEvent, UserAccount } from '../types';
import {
  leastAdvancedStage,
  OPISY_STATUSU,
  orderProgress,
  orderStatus,
  overdueOrders
} from '../lib/production';
import { todayStr } from '../lib/dates';
import { mojaPozycja, mojeZlecenie } from '../lib/departments';

interface Props {
  orders: ProductionOrder[];
  stages: Stage[];
  events: StageEvent[];
  onEdit: (id: string) => void;
  onNew: () => void;
  onBoard: () => void;
  onPrint: (order: ProductionOrder) => void;
  onDelete: (order: ProductionOrder) => void;
  onIssueWz: (order: ProductionOrder) => void;
  /** Kto patrzy — warsztat widzi tylko zlecenia ze swoich oddziałów */
  user: UserAccount | null;
  /** Warsztat ogląda i przestawia etapy; zakładanie i kasowanie to biuro */
  canEdit: boolean;
}

function mianoZlecen(n: number): string {
  if (n === 1) return 'zlecenie';
  const d = n % 10;
  const s = n % 100;
  return d >= 2 && d <= 4 && (s < 12 || s > 14) ? 'zlecenia' : 'zleceń';
}

/** Ile dni do terminu — ujemnie, gdy po terminie. */
function doTerminu(due: string | undefined, dzis: string): number | null {
  if (!due) return null;
  const a = new Date(due + 'T00:00:00');
  const b = new Date(dzis + 'T00:00:00');
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export default function OrdersView({
  orders,
  stages,
  events,
  onEdit,
  onNew,
  onBoard,
  onPrint,
  onDelete,
  onIssueWz,
  user,
  canEdit
}: Props) {
  const [q, setQ] = useState('');
  // Zakładka etapu. „Wszystkie" to lista robocza, każdy etap z osobna
  // odpowiada na pytanie „co dziś czeka na materiał", bez przeglądania całości.
  const [etapFiltr, setEtapFiltr] = useState<string>('wszystkie');
  const dzis = todayStr();
  // Warsztat widzi tylko swoje oddziały — i to samo musi dotyczyć liczników
  // oraz przypomnień, bo inaczej program mówiłby o zleceniach, których nie widać.
  const moje = useMemo(() => orders.filter((o) => mojeZlecenie(user, o)), [orders, user]);
  const spoznione = useMemo(() => overdueOrders(moje, stages, dzis), [moje, stages, dzis]);

  const widoczne = useMemo(() => {
    const szukane = q.trim().toLowerCase();
    const pasuje = (o: ProductionOrder) =>
      !szukane ||
      [o.number, o.ownNumber, o.client, o.notes, ...o.items.map((i) => `${i.name} ${i.material}`)]
        .join(' ')
        .toLowerCase()
        .includes(szukane);
    // Zlecenie trafia do zakładki etapu, gdy choć jedna jego pozycja tam stoi —
    // zlecenie z ośmioma roletami bywa naraz w trzech etapach.
    const wEtapie = (o: ProductionOrder) =>
      etapFiltr === 'wszystkie' || o.items.some((i) => i.stageId === etapFiltr);
    // Niewydane na górze, w kolejności terminu — to jest lista „co robimy dalej",
    // a nie archiwum, więc najpilniejsze ma stać najwyżej.
    return moje
      .filter((o) => pasuje(o) && wEtapie(o))
      .slice()
      .sort((a, b) => {
        const zrobione = (o: ProductionOrder) => (orderStatus(o, stages) === 'wydane' ? 1 : 0);
        if (zrobione(a) !== zrobione(b)) return zrobione(a) - zrobione(b);
        const termin = (o: ProductionOrder) => o.dueDate || '9999-12-31';
        if (termin(a) !== termin(b)) return termin(a) < termin(b) ? -1 : 1;
        return (b.number || '') < (a.number || '') ? -1 : 1;
      });
  }, [moje, stages, q, etapFiltr]);

  const ileWEtapie = (id: string) =>
    id === 'wszystkie'
      ? moje.length
      : moje.filter((o) => o.items.some((i) => i.stageId === id && mojaPozycja(user, i))).length;

  return (
    <section className="view" data-testid="view-orders">
      <header className="view-head">
        <h1 className="page-title">Zlecenia</h1>
        {moje.length > 0 && (
          <p className="view-meta" data-testid="orders-count">
            {moje.length} {mianoZlecen(moje.length)}
            {spoznione.length ? ` · ${spoznione.length} po terminie` : ''}
          </p>
        )}
      </header>

      <div className="toolbar">
        {moje.length > 0 && (
          <div className="search-wrap">
            <Search className="icon" />
            <input
              type="search"
              className="input"
              data-testid="search-orders-input"
              placeholder="Szukaj: klient, numer, produkt…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        )}
        <span className="spacer" />
        <button className="btn btn-light" data-testid="orders-board-btn" onClick={onBoard}>
          <LayoutGrid className="icon" />
          Tablica
        </button>
        {canEdit && (
          <button className="btn btn-primary" data-testid="new-order-btn" onClick={onNew}>
            <Plus className="icon" />
            Nowe zlecenie
          </button>
        )}
      </div>

      {spoznione.length > 0 && (
        <div className="notice-card notice-warn" data-testid="orders-overdue">
          <div className="notice-head">
            <Clock className="icon" />
            {spoznione.length === 1
              ? 'Jedno zlecenie jest po terminie albo kończy się dziś'
              : `Zleceń po terminie albo na dziś: ${spoznione.length}`}
          </div>
          <div className="followup-list">
            {spoznione.map((o) => (
              <div className="followup-row" key={o.id} data-testid={`order-overdue-${o.id}`}>
                <span className="followup-client">{o.client || '—'}</span>
                <span className="followup-days">
                  {o.number} · termin {o.dueDate}
                </span>
                <span className="spacer" />
                <button className="btn btn-small btn-light" onClick={() => onEdit(o.id)}>
                  <Pencil className="icon" />
                  Otwórz
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {moje.length > 0 && (
        <div className="chips tabs" data-testid="stage-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={'chip' + (etapFiltr === 'wszystkie' ? ' active' : '')}
            aria-selected={etapFiltr === 'wszystkie'}
            data-testid="stage-tab-wszystkie"
            onClick={() => setEtapFiltr('wszystkie')}
          >
            Wszystkie
            <span className="chip-count">{ileWEtapie('wszystkie')}</span>
          </button>
          {stages.map((e) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              className={'chip' + (etapFiltr === e.id ? ' active' : '')}
              aria-selected={etapFiltr === e.id}
              data-testid={`stage-tab-${e.id}`}
              onClick={() => setEtapFiltr(e.id)}
            >
              <span className="stage-dot" style={{ background: e.color }} />
              {e.name}
              <span className="chip-count">{ileWEtapie(e.id)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="tab-panel" key={etapFiltr} data-testid="orders-panel">
      {moje.length === 0 ? (
        <div className="empty-state" data-testid="orders-empty">
          <p>
            {orders.length
              ? 'Nie ma zleceń dla Twoich oddziałów.'
              : 'Nie ma jeszcze żadnego zlecenia.'}
          </p>
          <p className="muted">
            Zlecenie zakłada się z zaakceptowanej oferty — przycisk „Zleć do produkcji” w menu wiersza
            na liście ofert — albo od zera przyciskiem powyżej.
          </p>
          {canEdit && (
            <button className="btn btn-primary" data-testid="orders-empty-new-btn" onClick={onNew}>
              <Plus className="icon" />
              Nowe zlecenie
            </button>
          )}
        </div>
      ) : (
        <table className="table" data-testid="orders-table">
          <thead>
            <tr>
              <th>Numer</th>
              <th>Numer własny</th>
              <th>Klient</th>
              <th>Termin</th>
              <th>Etap</th>
              <th>Postęp</th>
              <th style={{ width: 190 }}></th>
            </tr>
          </thead>
          <tbody data-testid="orders-body">
            {widoczne.map((o) => {
              const postep = orderProgress(o, stages);
              const etap = leastAdvancedStage(o, stages);
              const stan = orderStatus(o, stages);
              const dni = doTerminu(o.dueDate, dzis);
              return (
                <tr key={o.id} data-testid={`order-row-${o.id}`} onDoubleClick={() => onEdit(o.id)}>
                  <td className="mono">{o.number || '—'}</td>
                  <td className="mono">{o.ownNumber || '—'}</td>
                  <td>{o.client || '—'}</td>
                  <td className={dni !== null && dni <= 0 && stan !== 'wydane' ? 'cennik-brak' : ''}>
                    {o.dueDate || '—'}
                    {dni !== null && stan !== 'wydane' && (
                      <span className="muted">
                        {' '}
                        {dni < 0 ? `(${-dni} dni po)` : dni === 0 ? '(dziś)' : `(za ${dni} dni)`}
                      </span>
                    )}
                  </td>
                  <td>
                    {stan === 'wstrzymane' ? (
                      <span className="stage-dot-label">{OPISY_STATUSU.wstrzymane}</span>
                    ) : (
                      <span className="stage-dot-label">
                        <span className="stage-dot" style={{ background: etap?.color || '#888' }} />
                        {etap?.name || '—'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="progress-wrap" title={`${postep.zrobione} z ${postep.wszystkie}`}>
                      <span className="progress-bar">
                        <span className="progress-fill" style={{ width: `${postep.procent}%` }} />
                      </span>
                      <span className="muted">
                        {postep.zrobione} z {postep.wszystkie}
                      </span>
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-small btn-light"
                        data-testid={`order-edit-${o.id}`}
                        onClick={() => onEdit(o.id)}
                      >
                        <Pencil className="icon" />
                        Otwórz
                      </button>
                      {canEdit && (
                      <button
                        className="btn btn-small btn-light"
                        data-testid={`order-wz-${o.id}`}
                        aria-label="Wystaw WZ"
                        title="Wystaw dokument WZ na podstawie tego zlecenia"
                        onClick={() => onIssueWz(o)}
                      >
                        <FileOutput className="icon" />
                      </button>
                      )}
                      <button
                        className="btn btn-small btn-light"
                        data-testid={`order-print-${o.id}`}
                        aria-label="Kartka na warsztat"
                        title="Kartka na warsztat"
                        onClick={() => onPrint(o)}
                      >
                        <Printer className="icon" />
                      </button>
                      {canEdit && (
                      <button
                        className="btn btn-small btn-danger"
                        data-testid={`order-delete-${o.id}`}
                        aria-label="Usuń zlecenie"
                        title="Usuń zlecenie"
                        onClick={() => onDelete(o)}
                      >
                        <Trash2 className="icon" />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      </div>
      {events.length > 0 && <span hidden data-testid="orders-events-count">{events.length}</span>}
    </section>
  );
}
