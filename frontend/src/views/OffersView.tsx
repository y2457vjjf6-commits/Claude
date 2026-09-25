import { ReactNode, useMemo, useState } from 'react';
import { Search, Plus, Eye, Pencil, Mail, Trash2, FileSpreadsheet, FileOutput, BellRing } from 'lucide-react';
import { Offer } from '../types';
import { formatDatePl } from '../lib/printing';
import StatusChips from '../components/StatusChips';
import StatusMenu from '../components/StatusMenu';
import SortableTh from '../components/SortableTh';
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
  onPreview: (offer: Offer) => void;
  onEmail: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onStatusChange: (offer: Offer, status: Offer['status']) => void;
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

export default function OffersView({
  offers,
  followUpDays,
  showCosts,
  onIssueWz,
  onEdit,
  onNewOffer,
  onPreview,
  onEmail,
  onDelete,
  onStatusChange
}: Props) {
  const [q, setQ] = useState('');
  const [filtr, setFiltr] = useState<Filtr>('wszystkie');
  const [sort, setSort] = useState<SortState>({ key: 'data', dir: 'desc' });
  const query = q.trim().toLowerCase();

  const lista = useMemo(() => {
    const znalezione = offers.filter((o) => {
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
    return sortRows(znalezione, sort, wartoscKolumny);
  }, [offers, query, filtr, sort]);

  const anyOffers = offers.length > 0;
  const przypomnienia = offersAwaitingReply(offers, followUpDays);
  const kolumnaMarzy = showCosts && offers.some((o) => offerCosts(o).hasCosts);
  const kolumn = kolumnaMarzy ? 7 : 6;
  const naMiesiace = shouldGroup(lista, sort, 'data');
  const grupy = naMiesiace ? groupByMonth(lista, (o) => o.date) : [{ klucz: '', etykieta: '', wiersze: lista }];
  const sortuj = (key: string) => setSort((s) => nextSort(s, key, key === 'data' || key === 'wartosc' || key === 'marza'));

  const licznik = (f: Filtr) => (f === 'wszystkie' ? offers.length : offers.filter((o) => o.status === f).length);
  const filtry: Filtr[] = ['wszystkie', 'szkic', 'wyslana', 'zaakceptowana', 'odrzucona'];

  return (
    <section className="view" data-testid="view-offers">
      <h1 className="page-title">Oferty cenowe</h1>

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

      {anyOffers && (
        <>
          <div className="table-card">
            <table className="table table-rows" data-testid="offers-table">
              <thead>
                <tr>
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
                  <th style={{ width: 86 }}>Wysłano</th>
                  <th className="th-actions" style={{ width: 236 }}>Akcje</th>
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
                        onEdit={onEdit}
                        onPreview={onPreview}
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
          {lista.length > 0 && (
            <p className="list-hint">
              Dwuklik lub <kbd>Enter</kbd> — edycja · <kbd>Spacja</kbd> — podgląd · <kbd>↑</kbd> <kbd>↓</kbd> — następny wiersz
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
  onEdit: (id: string) => void;
  onPreview: (offer: Offer) => void;
  onEmail: (offer: Offer) => void;
  onIssueWz: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onStatusChange: (offer: Offer, status: Offer['status']) => void;
}

function Row({ offer: o, kolumnaMarzy, onEdit, onPreview, onEmail, onIssueWz, onDelete, onStatusChange }: RowProps) {
  const naKlawisz = useRowKeyboard({ onEnter: () => onEdit(o.id), onSpace: () => onPreview(o) });
  const koszty = offerCosts(o);

  return (
    <tr
      data-row
      tabIndex={0}
      data-testid={`offer-row-${o.id}`}
      aria-label={`Oferta dla ${o.client}`}
      onClick={(e) => isRowBackgroundClick(e) && e.currentTarget.focus()}
      onDoubleClick={(e) => isRowBackgroundClick(e) && onEdit(o.id)}
      onKeyDown={naKlawisz}
    >
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
        <StatusChips printedAt={o.printedAt} emailedAt={o.emailedAt} emailedTo={o.emailedTo} />
      </td>
      <td>
        <div className="row-actions">
          <button className="btn btn-small btn-light" data-testid={`offer-preview-${o.id}`} aria-label="Podgląd" title="Podgląd" onClick={() => onPreview(o)}>
            <Eye className="icon" />
          </button>
          <button className="btn btn-small btn-light" data-testid={`offer-edit-${o.id}`} onClick={() => onEdit(o.id)}>
            <Pencil className="icon" />
            Edytuj
          </button>
          <button className="btn btn-small btn-light" data-testid={`offer-email-${o.id}`} aria-label="Wyślij e-mailem" title="Wyślij e-mailem" onClick={() => onEmail(o)}>
            <Mail className="icon" />
          </button>
          <button
            className="btn btn-small btn-light"
            data-testid={`offer-issue-wz-${o.id}`}
            aria-label="Wystaw WZ z tej oferty"
            title="Wystaw WZ z tej oferty"
            onClick={() => onIssueWz(o)}
          >
            <FileOutput className="icon" />
          </button>
          <button className="btn btn-small btn-danger" data-testid={`offer-delete-${o.id}`} aria-label="Usuń" title="Usuń" onClick={() => onDelete(o)}>
            <Trash2 className="icon" />
          </button>
        </div>
      </td>
    </tr>
  );
}
