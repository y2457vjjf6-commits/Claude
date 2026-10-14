import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, X, Printer, Split, PauseCircle, PlayCircle, Check } from 'lucide-react';
import { AppState, OrderItem, ProductionOrder, StageEvent } from '../types';
import {
  czyKoncowy,
  etapy,
  nastepnyEtap,
  orderHistory,
  orderProgress,
  splitItem,
  stageEvent
} from '../lib/production';
import { uid } from '../lib/storage';
import { filledSpec } from '../lib/offers';

interface Props {
  state: AppState;
  order: ProductionOrder;
  /** Zapisuje zlecenie; podany wpis dziennika dopisuje się tą samą drogą,
   *  żeby zmiana etapu i zapis zlecenia nie wyścigały się o plik. */
  onSave: (order: ProductionOrder, event?: StageEvent) => Promise<ProductionOrder>;
  onBack: () => void;
  onPrint: (order: ProductionOrder) => void;
  toast: (msg: string, isError?: boolean) => void;
  /** Warsztat: etapy i notatki tak, reszta nie. Pola zostają widoczne —
   *  zablokowane, a nie ukryte, bo warsztat ma widzieć termin i adres. */
  readOnly?: boolean;
}

/** Ile czasu po ostatnim klawiszu zapisujemy wersję roboczą. Na tyle krótko,
 *  żeby nic nie przepadło przy zamknięciu okna, i na tyle długo, żeby nie
 *  zapisywać po każdej literze. */
const AUTOZAPIS_MS = 1200;

export default function OrderEditorView({
  state,
  order: zrodlo,
  onSave,
  onBack,
  onPrint,
  toast,
  readOnly = false
}: Props) {
  const [order, setOrder] = useState<ProductionOrder>(() => structuredClone(zrodlo));
  const [zapisano, setZapisano] = useState<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pierwszy = useRef(true);

  // Zlecenie dostaje numer dopiero przy pierwszym zapisie. Trzymamy go w ref,
  // bo kolejny zapis może ruszyć, zanim React zdąży przerysować ekran — a bez
  // tego drugi zapis założyłby drugie zlecenie zamiast poprawić pierwsze.
  const nadane = useRef<{ id: string; number?: string; seq?: number }>({
    id: zrodlo.id,
    number: zrodlo.number,
    seq: zrodlo.seq
  });
  const orderRef = useRef(order);
  orderRef.current = order;
  // Zapisy ustawiamy w kolejkę: autozapis tekstu i przestawienie etapu potrafią
  // trafić w tę samą chwilę, a plik jest jeden.
  const kolejka = useRef<Promise<unknown>>(Promise.resolve());

  const lista = etapy(state.settings.stages);
  const kto = state.settings.currentUser || state.settings.issuers?.[0] || '';
  const historia = orderHistory(nadane.current.id, state.stageEvents);
  const postep = orderProgress(order, state.settings.stages);

  const zapisz = (o: ProductionOrder, event?: StageEvent) => {
    kolejka.current = kolejka.current.then(async () => {
      const zapisane = await onSave(
        { ...o, id: o.id || nadane.current.id, number: o.number || nadane.current.number, seq: o.seq ?? nadane.current.seq },
        event
      );
      nadane.current = { id: zapisane.id, number: zapisane.number, seq: zapisane.seq };
      setOrder((b) => (b.id ? b : { ...b, id: zapisane.id, number: zapisane.number, seq: zapisane.seq }));
      setZapisano(new Date().toLocaleTimeString('pl-PL'));
    });
    return kolejka.current;
  };

  // Autozapis wersji roboczej. Zmiany etapu idą osobną drogą — natychmiast.
  useEffect(() => {
    if (pierwszy.current) {
      pierwszy.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void zapisz(orderRef.current);
    }, AUTOZAPIS_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Wyjście z ekranu nie może zgubić tego, co ktoś właśnie wpisał. Sprzątanie
  // z pustą listą zależności uruchamia się tylko przy zamknięciu ekranu —
  // inaczej strzelałoby przy każdym naciśnięciu klawisza.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void zapisz(orderRef.current);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const set = (patch: Partial<ProductionOrder>) => setOrder((o) => ({ ...o, ...patch }));
  const setItem = (ii: number, patch: Partial<OrderItem>) =>
    setOrder((o) => ({ ...o, items: o.items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) }));

  /** Zmiana etapu zapisuje się od razu i zostawia ślad w dzienniku. */
  const przestaw = (ii: number, stageId: string) => {
    const it = order.items[ii];
    if (!it || it.stageId === stageId) return;
    const wpis = stageEvent({ ...order, id: nadane.current.id }, it, stageId, kto, it.note);
    const nowe = { ...order, items: order.items.map((x, i) => (i === ii ? { ...x, stageId } : x)) };
    setOrder(nowe);
    void zapisz(nowe, wpis);
  };

  const rozbij = (ii: number) => {
    const czesci = splitItem(order.items[ii]);
    if (czesci.length < 2) {
      toast('Ta pozycja jest na jedną sztukę — nie ma czego rozbijać.', true);
      return;
    }
    setOrder((o) => ({ ...o, items: [...o.items.slice(0, ii), ...czesci, ...o.items.slice(ii + 1)] }));
    toast(`Rozbito na ${czesci.length} sztuk — każda ma teraz własny etap.`);
  };

  const nazwaEtapu = (id: string) => lista.find((e) => e.id === id)?.name || id;

  return (
    <section className="view" data-testid="view-order-edit">
      <header className="view-head editor-head">
        <button className="btn btn-light" data-testid="order-back" onClick={onBack}>
          <ArrowLeft className="icon" />
          Wróć
        </button>
        <h1 className="page-title">{order.number || 'Nowe zlecenie'}</h1>
        <span className="spacer" />
        {zapisano && (
          <span className="muted" data-testid="order-saved-at">
            <Check className="icon" /> zapisano {zapisano}
          </span>
        )}
        {!readOnly && (
        <button
          className="btn btn-light"
          data-testid="order-hold"
          onClick={() => set({ onHold: !order.onHold })}
        >
          {order.onHold ? <PlayCircle className="icon" /> : <PauseCircle className="icon" />}
          {order.onHold ? 'Wznów' : 'Wstrzymaj'}
        </button>
        )}
        <button className="btn btn-light" data-testid="order-print" onClick={() => onPrint(order)}>
          <Printer className="icon" />
          Kartka na warsztat
        </button>
      </header>

      <div className="card">
        <div className="grid2">
          <label className="field">
            <span>Klient</span>
            <input
              type="text"
              className="input"
              data-testid="order-client"
            disabled={readOnly}
              value={order.client}
              onChange={(e) => set({ client: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Termin realizacji</span>
            <input
              type="date"
              className="input"
              data-testid="order-due"
            disabled={readOnly}
              value={order.dueDate || ''}
              onChange={(e) => set({ dueDate: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Adres montażu</span>
            <input
              type="text"
              className="input"
              data-testid="order-address"
            disabled={readOnly}
              placeholder="gdzie jedziemy montować"
              value={order.clientAddress || ''}
              onChange={(e) => set({ clientAddress: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Telefon</span>
            <input
              type="text"
              className="input"
              data-testid="order-phone"
            disabled={readOnly}
              value={order.clientPhone || ''}
              onChange={(e) => set({ clientPhone: e.target.value })}
            />
          </label>
        </div>
        <label className="field">
          <span>Uwagi dla warsztatu</span>
          <textarea
            className="input"
            rows={2}
            data-testid="order-notes"
            disabled={readOnly}
            value={order.notes || ''}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </label>
        <p className="muted field-hint" data-testid="order-progress">
          Zrobione {postep.zrobione} z {postep.wszystkie} · zapisuje się samo, bez klikania.
          {readOnly ? ' Z tego stanowiska zmieniasz etapy i notatki.' : ''}
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">Pozycje</h3>
        {order.items.map((it, ii) => {
          const dalej = nastepnyEtap(state.settings.stages, it.stageId);
          const gotowa = czyKoncowy(state.settings.stages, it.stageId);
          return (
            <div className={'order-item' + (gotowa ? ' done' : '')} key={it.id} data-testid={`order-item-${ii}`}>
              <div className="order-item-head">
                <input
                  type="text"
                  className="input"
                  disabled={readOnly}
                  data-testid={`order-item-name-${ii}`}
                  placeholder="co produkujemy"
                  value={it.name}
                  onChange={(e) => setItem(ii, { name: e.target.value })}
                />
                <input
                  type="text"
                  className="input num"
                  disabled={readOnly}
                  data-testid={`order-item-qty-${ii}`}
                  aria-label="Ilość"
                  value={it.qty}
                  onChange={(e) => setItem(ii, { qty: e.target.value })}
                />
                {!readOnly && (
                <button
                  className="btn btn-small btn-danger item-remove"
                  data-testid={`order-item-remove-${ii}`}
                  aria-label="Usuń pozycję"
                  onClick={() => setOrder((o) => ({ ...o, items: o.items.filter((_, i) => i !== ii) }))}
                >
                  <X className="icon" />
                </button>
                )}
              </div>
              {it.material && <p className="muted order-item-material">{it.material}</p>}
              {filledSpec(it.spec).length > 0 && (
                <dl className="order-item-spec" data-testid={`order-item-spec-${ii}`}>
                  {filledSpec(it.spec).map((w, k) => (
                    <div key={k}>
                      <dt>{w.label}</dt>
                      <dd>{w.value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="order-item-stage">
                <select
                  className="input"
                  data-testid={`order-item-stageid-${ii}`}
                  aria-label="Etap"
                  value={it.stageId}
                  onChange={(e) => przestaw(ii, e.target.value)}
                >
                  {lista.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                {dalej && (
                  <button
                    className="btn btn-small btn-light"
                    data-testid={`order-item-next-${ii}`}
                    title={`Przestaw na: ${dalej.name}`}
                    onClick={() => przestaw(ii, dalej.id)}
                  >
                    Dalej: {dalej.name}
                  </button>
                )}
                <input
                  type="text"
                  className="input"
                  data-testid={`order-item-note-${ii}`}
                  placeholder="notatka, np. czekamy na poprawiony wymiar"
                  value={it.note || ''}
                  onChange={(e) => setItem(ii, { note: e.target.value })}
                />
                {!readOnly && (
                <button
                  className="btn btn-small btn-light"
                  data-testid={`order-item-split-${ii}`}
                  title="Rozbij na pojedyncze sztuki — gdy idą różnym tempem"
                  onClick={() => rozbij(ii)}
                >
                  <Split className="icon" />
                  Rozbij
                </button>
                )}
              </div>
            </div>
          );
        })}
        {!readOnly && (
        <button
          className="btn btn-light"
          data-testid="order-add-item"
          onClick={() =>
            setOrder((o) => ({
              ...o,
              items: [...o.items, { id: uid(), name: '', material: '', qty: '1', stageId: lista[0].id }]
            }))
          }
        >
          <Plus className="icon" />
          Dodaj pozycję
        </button>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Historia</h3>
        {historia.length === 0 ? (
          <p className="muted">Jeszcze nic się nie wydarzyło.</p>
        ) : (
          <ul className="order-log" data-testid="order-log">
            {historia.map((w) => (
              <li key={w.id}>
                <span className="order-log-at">{new Date(w.at).toLocaleString('pl-PL')}</span>
                <span className="order-log-what">
                  {order.items.find((i) => i.id === w.itemId)?.name || 'pozycja'}:{' '}
                  {w.fromStageId ? `${nazwaEtapu(w.fromStageId)} → ` : ''}
                  <strong>{nazwaEtapu(w.toStageId)}</strong>
                </span>
                {w.by && <span className="order-log-by">{w.by}</span>}
                {w.note && <span className="order-log-note">{w.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
