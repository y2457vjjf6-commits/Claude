import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Eye, Pencil, Mail, Trash2, FileSpreadsheet, FileOutput, BellRing, Printer, FileDown, ChevronDown
} from 'lucide-react';
import { Offer } from '../types';
import { formatDatePl } from '../lib/printing';
import DocState from '../components/DocState';
import StatusMenu from '../components/StatusMenu';
import SortableTh from '../components/SortableTh';
import PopMenu from '../components/PopMenu';
import BulkBar from '../components/BulkBar';
import SelectAllBox from '../components/SelectAllBox';
import { useSelection } from '../hooks/useSelection';
import { formatMoney, offerCosts, offersAwaitingReply, offerTotals, OFFER_STATUS_LABELS } from '../lib/offers';
import { groupByMonth, nextSort, shouldGroup, sortRows, SortState } from '../lib/listing';
import { isRowBackgroundClick, useRowKeyboard } from '../hooks/useRowKeyboard';

interface Props {
  offers: Offer[];
  /** Po ilu dniach bez odpowiedzi przypominać o wysłanej ofercie */
  followUpDays: number;
  /** Czy pokazywać kolumnę marży (dane wewnętrzne) */
  showCosts: boolean;
  onIssueWz: (offer: Offer) => void;
  onEdit: (id: string) => void;
  onNewOffer: () => void;
  onPreview: (offer: Offer, lista: Offer[]) => void;
  onPrint: (offer: Offer) => void;
  onPdf: (offer: Offer) => void;
  onEmail: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onPrintMany: (offers: Offer[]) => void;
  onEmailMany: (offers: Offer[]) => void;
  onDeleteMany: (offers: Offer[]) => void;
  onStatusChange: (offer: Offer, status: Offer['status']) => void;
}

const PORCJA = 100;

/** Polska odmiana rzeczownika po liczbie. */
export function mianoOfert(n: number): string {
  if (n === 1) return 'oferta';
  const ost = n % 10;
  const dwie = n % 100;
  return ost >= 2 && ost <= 4 && (dwie < 12 || dwie > 14) ? 'oferty' : 'ofert';
}

type Filtr = 'wszystkie' | Offer['status'];

function wartoscKolumny(o: Offer, key: string): unknown {
  switch (key) {
    case 'klient':
      return o.client || '';
    case 'wartosc':
      return offerTotals(o).total;
    case 'marza':
      return offerCosts(o).hasCosts ? offerCosts(o).margin : null;
    case 'status':
      return OFFER_STATUS_LABELS[o.status];
    default:
      return o.date + o.createdAt;
  }
}

export default function OffersView(props: Props) {
  const { offers, followUpDays, showCosts, onIssueWz, onEdit, onNewOffer, onPreview, onPrint, onPdf, onEmail, onDelete, onStatusChange } = props;
  const [q, setQ] = useState('');
  const [filtr, setFiltr] = useState<Filtr>('wszystkie');
  const [sort, setSort] = useState<SortState>({ key: 'data', dir: 'desc' });
  const [limit, setLimit] = useState(PORCJA);
  const query = q.trim().toLowerCase();

  const znalezione = useMemo(() => {
    const pasujace = offers.filter((o) => {
      if (filtr !== 'wszystkie' && o.status !== filtr) return false;
      if (!query) return true;
      const pola = [
        o.client,
        o.issuedBy,
        o.notes,
        formatDatePl(o.date),
        OFFER_STATUS_LABELS[o.status],
        ...o.groups.flatMap((g) => g.items.flatMap((it) => [it.name, it.material]))
      ];
      return pola.some((v) => String(v || '').toLowerCase().includes(query));
    });
    return sortRows(pasujace, sort, wartoscKolumny);
  }, [offers, query, filtr, sort]);

  useEffect(() => setLimit(PORCJA), [query, filtr, sort]);

  const lista = znalezione.slice(0, limit);
  const zaznaczanie = useSelection(lista.map((o) => o.id));
  const zaznaczoneOferty = lista.filter((o) => zaznaczanie.zbior.has(o.id));

  const anyOffers = offers.length > 0;
  const sumaWszystkich = offers.reduce((s, o) => s + offerTotals(o).total, 0);
  const przypomnienia = offersAwaitingReply(offers, followUpDays);
  const kolumnaMarzy = showCosts && offers.some((o) => offerCosts(o).hasCosts);
  const kolumn = kolumnaMarzy ? 8 : 7;
  const naMiesiace = shouldGroup(lista, sort, 'data');
  const grupy = naMiesiace ? groupByMonth(lista, (o) => o.date) : [{ klucz: '', etykieta: '', wiersze: lista }];
  const sortuj = (key: string) => setSort((s) => nextSort(s, key, key === 'data' || key === 'wartosc' || key === 'marza'));

  const licznik = (f: Filtr) => (f === 'wszystkie' ? offers.length : offers.filter((o) => o.status === f).length);
  const filtry: Filtr[] = ['wszystkie', 'szkic', 'wyslana', 'zaakceptowana', 'odrzucona'];

  return (
    <section className="view" data-testid="view-offers">
      <header className="view-head">
        <h1 className="page-title">Oferty cenowe</h1>
        {anyOffers && (
          <p className="view-meta" data-testid="offers-count">
            {offers.length} {mianoOfert(offers.length)} · łącznie {formatMoney(sumaWszystkich)}
            {przypomnienia.length ? ` · ${przypomnienia.length} czeka na decyzję` : ''}
          </p>
        )}
      </header>

      {anyOffers && (
        <div className="toolbar">
          <div className="search-wrap">
            <Search className="icon" />
            <input
              type="search"
              className="input"
              data-testid="search-offers-input"
              placeholder="Szukaj: klient, produkt, status, data…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="chips" role="group" aria-label="Filtr statusu">
            {filtry.map((f) => (
              <button
                key={f}
                type="button"
                className={'chip' + (filtr === f ? ' active' : '')}
                data-testid={`filter-${f}`}
                aria-pressed={filtr === f}
                onClick={() => setFiltr(f)}
              >
                {f === 'wszystkie' ? 'Wszystkie' : OFFER_STATUS_LABELS[f]}
                <span className="chip-count">{licznik(f)}</span>
              </button>
            ))}
          </div>
          <span className="spacer" />
          <button className="btn btn-primary" data-testid="new-offer-btn" onClick={onNewOffer}>
            <Plus className="icon" />
            Nowa oferta
          </button>
        </div>
      )}

      {przypomnienia.length > 0 && (
        <div className="notice-card notice-warn" data-testid="offers-followup">
          <div className="notice-head">
            <BellRing className="icon" />
            {przypomnienia.length === 1
              ? 'Jedna wysłana oferta czeka na decyzję klienta'
              : `Wysłane oferty czekające na decyzję: ${przypomnienia.length}`}
          </div>
          <div className="followup-list">
            {przypomnienia.map(({ offer, days }) => (
              <div className="followup-row" key={offer.id} data-testid={`followup-${offer.id}`}>
                <span className="followup-client">{offer.client || '—'}</span>
                <span className="followup-days">
                  {formatMoney(offerTotals(offer).total)} · wysłana {days} {days === 1 ? 'dzień' : 'dni'} temu
                </span>
                <span className="spacer" />
                <button className="btn btn-small btn-light" data-testid={`followup-open-${offer.id}`} onClick={() => onEdit(offer.id)}>
                  <Pencil className="icon" />
                  Otwórz
                </button>
                <button className="btn btn-small btn-light" data-testid={`followup-email-${offer.id}`} onClick={() => onEmail(offer)}>
                  <Mail className="icon" />
                  Wyślij ponownie
                </button>
                <button
                  className="btn btn-small btn-light"
                  data-testid={`followup-accepted-${offer.id}`}
                  onClick={() => onStatusChange(offer, 'zaakceptowana')}
                >
                  Zaakceptowana
                </button>
                <button
                  className="btn btn-small btn-light"
                  data-testid={`followup-rejected-${offer.id}`}
                  onClick={() => onStatusChange(offer, 'odrzucona')}
                >
                  Odrzucona
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {zaznaczoneOferty.length > 0 && (
        <BulkBar
          ile={zaznaczoneOferty.length}
          rzeczownik={mianoOfert}
          onPrint={() => props.onPrintMany(zaznaczoneOferty)}
          onEmail={() => props.onEmailMany(zaznaczoneOferty)}
          onDelete={() => {
            props.onDeleteMany(zaznaczoneOferty);
            zaznaczanie.wyczysc();
          }}
          onClear={zaznaczanie.wyczysc}
        />
      )}

      {anyOffers && (
        <>
          <div className="table-card">
            <table className="table table-rows" data-testid="offers-table">
              <thead>
                <tr>
                  <th className="th-select">
                    <SelectAllBox
                      ileZaznaczonych={zaznaczoneOferty.length}
                      ileWszystkich={lista.length}
                      onToggle={zaznaczanie.wszystkie}
                    />
                  </th>
                  <SortableTh label="Data" sortKey="data" sort={sort} onSort={sortuj} style={{ width: 118 }} />
                  <SortableTh label="Klient" sortKey="klient" sort={sort} onSort={sortuj} />
                  <SortableTh label="Wartość" sortKey="wartosc" sort={sort} onSort={sortuj} className="th-num" style={{ width: 130 }} />
                  {kolumnaMarzy && (
                    <SortableTh
                      label="Marża"
                      sortKey="marza"
                      sort={sort}
                      onSort={sortuj}
                      className="th-num th-internal"
                      style={{ width: 128 }}
                    />
                  )}
                  <SortableTh label="Status" sortKey="status" sort={sort} onSort={sortuj} style={{ width: 170 }} />
                  <th style={{ width: 122 }}>Stan</th>
                  <th className="th-actions" style={{ width: 138 }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {grupy.map((g) => (
                  <Fragmenty key={g.klucz || 'wszystko'}>
                    {naMiesiace && (
                      <tr className="group-row" data-testid={`month-${g.klucz}`}>
                        <th colSpan={kolumn} scope="colgroup">
                          {g.etykieta}
                          <span className="group-count">{g.wiersze.length}</span>
                          <span className="group-sum">
                            {formatMoney(g.wiersze.reduce((s, o) => s + offerTotals(o).total, 0))}
                          </span>
                        </th>
                      </tr>
                    )}
                    {g.wiersze.map((o) => (
                      <Row
                        key={o.id}
                        offer={o}
                        kolumnaMarzy={kolumnaMarzy}
                        zaznaczony={zaznaczanie.zbior.has(o.id)}
                        onSelect={zaznaczanie.przelacz}
                        onEdit={onEdit}
                        onPreview={(of) => onPreview(of, lista)}
                        onPrint={onPrint}
                        onPdf={onPdf}
                        onEmail={onEmail}
                        onIssueWz={onIssueWz}
                        onDelete={onDelete}
                        onStatusChange={onStatusChange}
                      />
                    ))}
                  </Fragmenty>
                ))}
                {!lista.length && (
                  <tr>
                    <td colSpan={kolumn} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      {query ? `Brak wyników dla „${q.trim()}”.` : 'Żadna oferta nie ma tego statusu.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {znalezione.length > lista.length && (
            <button className="btn btn-light more-btn" data-testid="more-offers" onClick={() => setLimit((l) => l + PORCJA)}>
              <ChevronDown className="icon" />
              Pokaż kolejne {Math.min(PORCJA, znalezione.length - lista.length)} (zostało {znalezione.length - lista.length})
            </button>
          )}

          {lista.length > 0 && (
            <p className="list-hint">
              Dwuklik lub <kbd>Enter</kbd> — edycja · <kbd>Spacja</kbd> — podgląd · <kbd>↑</kbd> <kbd>↓</kbd> — następny
              wiersz · <kbd>Shift</kbd>+klik — zaznacz zakres
            </p>
          )}
        </>
      )}

      {!anyOffers && (
        <div className="empty" data-testid="offers-empty">
          <FileSpreadsheet className="icon" />
          <h2 className="empty-title">Nie ma jeszcze żadnej oferty</h2>
          <p>Wyceny zebrane w jednym miejscu: wyślesz je mailem i sprawdzisz, na które klient nie odpowiedział.</p>
          <button className="btn btn-primary" data-testid="offers-empty-new-btn" onClick={onNewOffer}>
            <Plus className="icon" />
            Nowa oferta
          </button>
        </div>
      )}
    </section>
  );
}

function Fragmenty({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface RowProps {
  offer: Offer;
  kolumnaMarzy: boolean;
  zaznaczony: boolean;
  onSelect: (id: string, zakres: boolean) => void;
  onEdit: (id: string) => void;
  onPreview: (offer: Offer) => void;
  onPrint: (offer: Offer) => void;
  onPdf: (offer: Offer) => void;
  onEmail: (offer: Offer) => void;
  onIssueWz: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onStatusChange: (offer: Offer, status: Offer['status']) => void;
}

function Row({
  offer: o,
  kolumnaMarzy,
  zaznaczony,
  onSelect,
  onEdit,
  onPreview,
  onPrint,
  onPdf,
  onEmail,
  onIssueWz,
  onDelete,
  onStatusChange
}: RowProps) {
  const naKlawisz = useRowKeyboard({ onEnter: () => onEdit(o.id), onSpace: () => onPreview(o) });
  const koszty = offerCosts(o);

  return (
    <tr
      data-row
      tabIndex={0}
      className={zaznaczony ? 'selected' : undefined}
      data-testid={`offer-row-${o.id}`}
      aria-label={`Oferta dla ${o.client}`}
      onClick={(e) => isRowBackgroundClick(e) && e.currentTarget.focus()}
      onDoubleClick={(e) => isRowBackgroundClick(e) && onEdit(o.id)}
      onKeyDown={naKlawisz}
    >
      <td className="cell-select">
        <label className="check-hit">
        <input
          type="checkbox"
          className="row-check"
          data-testid={`offer-check-${o.id}`}
          aria-label={`Zaznacz ofertę dla ${o.client}`}
          checked={zaznaczony}
          onChange={() => undefined}
          onClick={(e) => onSelect(o.id, e.shiftKey)}
        />
        </label>
      </td>
      <td className="num">{formatDatePl(o.date)}</td>
      <td>
        {o.client || '—'}
        {!!o.wzDocumentIds?.length && (
          <span className="group-tag" data-testid={`offer-has-wz-${o.id}`} title="Z tej oferty wystawiono już dokument WZ">
            WZ
          </span>
        )}
      </td>
      <td className="td-money">{formatMoney(offerTotals(o).total)}</td>
      {kolumnaMarzy && (
        <td className="td-num muted" data-testid={`offer-margin-${o.id}`}>
          {koszty.hasCosts ? formatMoney(koszty.margin) : '—'}
        </td>
      )}
      <td>
        <StatusMenu status={o.status} onChange={(s) => onStatusChange(o, s)} testId={`offer-status-${o.id}`} />
      </td>
      <td>
        <DocState printedAt={o.printedAt} emailedAt={o.emailedAt} emailedTo={o.emailedTo} />
      </td>
      <td>
        <div className="row-actions">
          <button className="btn btn-small btn-light" data-testid={`offer-edit-${o.id}`} onClick={() => onEdit(o.id)}>
            <Pencil className="icon" />
            Edytuj
          </button>
          <PopMenu
            testId={`offer-more-${o.id}`}
            label={`Więcej działań dla oferty ${o.client}`}
            items={[
              { key: 'preview', label: 'Podgląd', ikona: <Eye className="icon" />, onPick: () => onPreview(o) },
              { key: 'print', label: 'Drukuj', ikona: <Printer className="icon" />, onPick: () => onPrint(o) },
              { key: 'pdf', label: 'Zapisz PDF', ikona: <FileDown className="icon" />, onPick: () => onPdf(o) },
              { key: 'email', label: 'Wyślij e-mailem', ikona: <Mail className="icon" />, onPick: () => onEmail(o) },
              { key: 'wz', label: 'Wystaw WZ', ikona: <FileOutput className="icon" />, onPick: () => onIssueWz(o) },
              {
                key: 'delete',
                label: 'Usuń',
                ikona: <Trash2 className="icon" />,
                separator: true,
                danger: true,
                onPick: () => onDelete(o)
              }
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
