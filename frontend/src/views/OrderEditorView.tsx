import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Plus, X, Printer, Split, PauseCircle, PlayCircle, Check, ChevronLeft, ChevronRight,
  ImagePlus, Trash2, ChevronUp, ChevronDown
} from 'lucide-react';
import { AppState, OrderItem, ProductionOrder, StageEvent, UserAccount } from '../types';
import {
  czyKoncowy,
  etapy,
  etapyGlowne,
  nastepnyEtap,
  orderHistory,
  podetapy,
  poprzedniEtap,
  orderProgress,
  splitItem,
  stageEvent,
  substepEvent,
  substepState
} from '../lib/production';
import { uid } from '../lib/storage';
import { filledSpec, movedBy } from '../lib/offers';
import { podpis } from '../lib/auth';
import QualityCard from '../components/QualityCard';
import {
  autoAssignee,
  departmentForProduct,
  OPISY_ODDZIALOW,
  peopleForDepartment
} from '../lib/departments';
import { MAX_BOK_ZLECENIE, resizePhoto } from '../lib/photos';
import { autoSpecFor, domyslnaSpec, matchSpecTemplate, uzyteczneWiersze } from '../lib/specTemplates';

interface Props {
  state: AppState;
  order: ProductionOrder;
  /** Zapisuje zlecenie; podany wpis dziennika dopisuje się tą samą drogą,
   *  żeby zmiana etapu i zapis zlecenia nie wyścigały się o plik. */
  onSave: (order: ProductionOrder, event?: StageEvent) => Promise<ProductionOrder>;
  onBack: () => void;
  onPrint: (order: ProductionOrder) => void;
  toast: (msg: string, isError?: boolean) => void;
  /** Kto jest zalogowany — jego imieniem podpisują się zmiany etapów */
  user: UserAccount | null;
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
  user,
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
  // Wpis w dzienniku podpisuje ZALOGOWANY, a nie pierwsza osoba z listy
  // wystawiających. Historia odpowiada na pytanie „kto to zrobił" — podpis
  // kogoś, kogo przy komputerze nie było, jest gorszy niż brak podpisu.
  const kto = podpis(user, state.settings.issuers?.[0] || '');
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
    setOrder((o) => ({
      ...o,
      items: o.items.map((it, i) => {
        if (i !== ii) return it;
        const nowa = { ...it, ...patch };
        // Po wpisaniu nazwy produktu pozycja bez własnej specyfikacji dostaje
        // szablon tego produktu; gdy go nie ma — wiersze domyślne.
        if (!('name' in patch) && !('material' in patch)) return nowa;
        return {
          ...nowa,
          spec: autoSpecFor(nowa, state.settings) || nowa.spec,
          // Jedna osoba w oddziale = oczywisty wybór, więc program robi go sam.
          // Przy dwóch kandydatach decyzja zostaje przy człowieku.
          assignee: nowa.assignee || autoAssignee(nowa, state.users) || undefined
        };
      })
    }));

  /** Zmiana etapu zapisuje się od razu i zostawia ślad w dzienniku. */
  const przestaw = (ii: number, stageId: string) => {
    const it = order.items[ii];
    if (!it || it.stageId === stageId) return;
    const wpis = stageEvent({ ...order, id: nadane.current.id }, it, stageId, kto, it.note);
    const nowe = { ...order, items: order.items.map((x, i) => (i === ii ? { ...x, stageId } : x)) };
    setOrder(nowe);
    void zapisz(nowe, wpis);
  };

  /** Zdjęcie przy pozycji — ze schowka (Ctrl+V) albo z pliku. Trzymamy je
   *  zmniejszone: z pomiaru trzeba odczytać wymiar, ale nie ma powodu, żeby
   *  plik danych rósł o oryginał z telefonu. */
  const wgrajZdjecie = async (ii: number, plik: File | null | undefined) => {
    if (!plik || !plik.type.startsWith('image/')) {
      toast('To nie jest obraz.', true);
      return;
    }
    try {
      setItem(ii, { photo: await resizePhoto(plik, MAX_BOK_ZLECENIE) });
      toast('Zdjęcie dodane do pozycji.');
    } catch {
      toast('Nie udało się odczytać tego obrazu.', true);
    }
  };

  const zeSchowka = (ii: number, e: React.ClipboardEvent) => {
    const obraz = Array.from(e.clipboardData?.items || []).find((x) => x.type.startsWith('image/'));
    if (!obraz) return;
    e.preventDefault();
    void wgrajZdjecie(ii, obraz.getAsFile());
  };

  /** Odhaczenie podkategorii. Zapisuje się od razu i zostawia ślad w dzienniku
   *  — także wtedy, gdy ktoś ptaszka zdejmuje. */
  const odhacz = (ii: number, substageId: string, done: boolean) => {
    const it = order.items[ii];
    if (!it) return;
    void zapisz(orderRef.current, substepEvent(nadane.current.id, it.id, substageId, done, kto));
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

  const szablonDla = (it: OrderItem) => matchSpecTemplate(it, state.settings.specTemplates);

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
            <span>Numer własny</span>
            <input
              type="text"
              className="input"
              data-testid="order-own-number"
              disabled={readOnly}
              placeholder="np. zamówienie klienta albo własne oznaczenie"
              value={order.ownNumber || ''}
              onChange={(e) => set({ ownNumber: e.target.value })}
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

      <datalist id="podpowiedzi-specyfikacji-zlecenia">
        {[
          'Szerokość całkowita',
          'Wysokość całkowita',
          'Kolor kasety',
          'Kolor prowadnic',
          'Kolor materiału',
          'Typ prowadnic',
          'Typ montażu',
          'Strona sterowania',
          'Napęd',
          'Sterowanie'
        ].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="card">
        <h3 className="card-title">Pozycje</h3>
        {order.items.map((it, ii) => {
          const dzialPozycji = departmentForProduct(it);
          const dalej = nastepnyEtap(state.settings.stages, it.stageId, dzialPozycji);
          const wstecz = poprzedniEtap(state.settings.stages, it.stageId, dzialPozycji);
          const kroki = podetapy(state.settings.stages, it.stageId, dzialPozycji);
          const odhaczenia = substepState(it.id, state.stageEvents);
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
              <details className="item-spec" open={filledSpec(it.spec).length > 0}>
                <summary data-testid={`order-spec-${ii}`}>
                  <span className="spec-title">
                    Specyfikacja{(it.spec || []).length ? ` (${(it.spec || []).length})` : ''}
                  </span>
                  {!readOnly && szablonDla(it) && (
                    <button
                      className="btn btn-small btn-light spec-btn"
                      data-testid={`order-spec-template-${ii}`}
                      title={`Wstaw specyfikację zapisaną dla „${szablonDla(it)!.name}"`}
                      onClick={(e) => {
                        e.preventDefault();
                        setItem(ii, { spec: uzyteczneWiersze(szablonDla(it)) });
                      }}
                    >
                      Szablon
                    </button>
                  )}
                </summary>
                {(it.spec || []).map((w, si) => (
                  <div className="spec-row" key={si}>
                    <input
                      type="text"
                      className="input"
                      disabled={readOnly}
                      data-testid={`order-spec-label-${ii}-${si}`}
                      aria-label="Co"
                      list="podpowiedzi-specyfikacji-zlecenia"
                      placeholder="np. Kolor kasety"
                      value={w.label}
                      onChange={(e) =>
                        setItem(ii, {
                          spec: (it.spec || []).map((x, k) => (k === si ? { ...x, label: e.target.value } : x))
                        })
                      }
                    />
                    <input
                      type="text"
                      className="input"
                      disabled={readOnly}
                      data-testid={`order-spec-value-${ii}-${si}`}
                      aria-label="Jakie"
                      value={w.value}
                      onChange={(e) =>
                        setItem(ii, {
                          spec: (it.spec || []).map((x, k) => (k === si ? { ...x, value: e.target.value } : x))
                        })
                      }
                    />
                    {!readOnly && (
                      <div className="spec-row-actions">
                        <button
                          className="btn btn-small btn-light item-remove"
                          data-testid={`order-spec-up-${ii}-${si}`}
                          aria-label="Przesuń wyżej"
                          disabled={si === 0}
                          onClick={() => setItem(ii, { spec: movedBy(it.spec || [], si, -1) })}
                        >
                          <ChevronUp className="icon" />
                        </button>
                        <button
                          className="btn btn-small btn-light item-remove"
                          data-testid={`order-spec-down-${ii}-${si}`}
                          aria-label="Przesuń niżej"
                          disabled={si === (it.spec || []).length - 1}
                          onClick={() => setItem(ii, { spec: movedBy(it.spec || [], si, 1) })}
                        >
                          <ChevronDown className="icon" />
                        </button>
                        <button
                          className="btn btn-small btn-danger item-remove"
                          data-testid={`order-spec-remove-${ii}-${si}`}
                          aria-label="Usuń wiersz"
                          onClick={() => setItem(ii, { spec: (it.spec || []).filter((_, k) => k !== si) })}
                        >
                          <X className="icon" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <button
                    className="btn btn-small btn-light"
                    data-testid={`order-spec-add-${ii}`}
                    onClick={() => setItem(ii, { spec: [...(it.spec || []), { label: '', value: '' }] })}
                  >
                    <Plus className="icon" />
                    Dodaj wiersz
                  </button>
                )}
              </details>

              {kroki.length > 0 && (
                <ul className="substeps" data-testid={`order-substeps-${ii}`}>
                  {kroki.map((k) => {
                    const stan = odhaczenia[k.id];
                    return (
                      <li key={k.id} className={stan?.done ? 'done' : ''}>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            data-testid={`order-substep-${ii}-${k.id}`}
                            checked={!!stan?.done}
                            onChange={(e) => odhacz(ii, k.id, e.target.checked)}
                          />
                          <span>{k.name}</span>
                        </label>
                        {stan && (
                          <span className="substep-kto">
                            {stan.done ? '' : 'cofnięte · '}
                            {stan.by || '—'} · {new Date(stan.at).toLocaleString('pl-PL')}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="order-item-photo" data-testid={`order-photo-${ii}`}>
                {it.photo ? (
                  <>
                    <img src={it.photo} alt="Zdjęcie pozycji" className="order-photo-thumb" />
                    {!readOnly && (
                      <button
                        className="btn btn-small btn-light"
                        data-testid={`order-photo-remove-${ii}`}
                        onClick={() => setItem(ii, { photo: undefined })}
                      >
                        <Trash2 className="icon" />
                        Usuń zdjęcie
                      </button>
                    )}
                  </>
                ) : (
                  !readOnly && (
                    <>
                      <div
                        className="photo-drop"
                        data-testid={`order-photo-drop-${ii}`}
                        tabIndex={0}
                        onPaste={(e) => zeSchowka(ii, e)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          void wgrajZdjecie(ii, e.dataTransfer.files?.[0]);
                        }}
                      >
                        Kliknij i wklej zdjęcie (Ctrl+V) albo przeciągnij tutaj plik
                      </div>
                      <label className="btn btn-small btn-light">
                        <ImagePlus className="icon" />
                        Wybierz plik
                        <input
                          type="file"
                          accept="image/*"
                          className="photo-file"
                          data-testid={`order-photo-input-${ii}`}
                          onChange={(e) => {
                            void wgrajZdjecie(ii, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </>
                  )
                )}
              </div>
              <div className="order-item-stage">
                {wstecz && (
                  <button
                    className="btn btn-small btn-light"
                    data-testid={`order-item-prev-${ii}`}
                    title={`Cofnij na: ${wstecz.name}`}
                    aria-label={`Cofnij na: ${wstecz.name}`}
                    onClick={() => przestaw(ii, wstecz.id)}
                  >
                    <ChevronLeft className="icon" />
                  </button>
                )}
                <select
                  className="input"
                  data-testid={`order-item-stageid-${ii}`}
                  aria-label="Etap"
                  disabled={readOnly}
                  value={it.stageId}
                  onChange={(e) => przestaw(ii, e.target.value)}
                >
                  {etapyGlowne(state.settings.stages, departmentForProduct(it)).map((e) => (
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
                    {dalej.name}
                    <ChevronRight className="icon" />
                  </button>
                )}
                {(() => {
                  const dzial = departmentForProduct(it);
                  const ludzie = peopleForDepartment(state.users, dzial);
                  if (!ludzie.length) return null;
                  return (
                    <select
                      className="input order-assignee"
                      data-testid={`order-item-assignee-${ii}`}
                      aria-label="Kto robi"
                      disabled={readOnly}
                      title={
                        dzial
                          ? `Oddział: ${OPISY_ODDZIALOW[dzial]} — pokazujemy tylko tych, którzy w nim pracują`
                          : 'Nie rozpoznaliśmy oddziału po nazwie produktu'
                      }
                      value={it.assignee || ''}
                      onChange={(e) => setItem(ii, { assignee: e.target.value || undefined })}
                    >
                      <option value="">— kto robi —</option>
                      {ludzie.map((u) => (
                        <option key={u.login} value={u.login}>
                          {u.name || u.login}
                        </option>
                      ))}
                    </select>
                  );
                })()}
                <input
                  type="text"
                  className="input order-note"
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
              items: [
                ...o.items,
                {
                  id: uid(),
                  name: '',
                  material: '',
                  qty: '1',
                  stageId: lista[0].id,
                  spec: domyslnaSpec({ name: '', material: '' }, state.settings)
                }
              ]
            }))
          }
        >
          <Plus className="icon" />
          Dodaj pozycję
        </button>
        )}
      </div>

      <QualityCard
        order={order}
        events={state.stageEvents || []}
        stages={lista}
        user={user}
        onChange={(patch) => {
          const nowe = { ...orderRef.current, ...patch };
          setOrder(nowe);
          void zapisz(nowe);
        }}
        toast={toast}
      />

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
