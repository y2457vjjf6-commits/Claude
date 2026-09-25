import { useState } from 'react';
import { Search, Plus, Eye, Pencil, Mail, Trash2, FileSpreadsheet, FileOutput, BellRing } from 'lucide-react';
import { Offer } from '../types';
import { formatDatePl } from '../lib/printing';
import StatusChips from '../components/StatusChips';
import { formatMoney, offerCosts, offersAwaitingReply, offerTotals, OFFER_STATUS_LABELS } from '../lib/offers';

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
  const query = q.trim().toLowerCase();

  const lista = offers
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .filter((o) => {
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

  const anyOffers = offers.length > 0;
  const przypomnienia = offersAwaitingReply(offers, followUpDays);
  // Kolumna marży pojawia się tylko wtedy, gdy w ofertach są wpisane koszty
  const kolumnaMarzy = showCosts && offers.some((o) => offerCosts(o).hasCosts);
  const kolumn = kolumnaMarzy ? 7 : 6;

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
        <span className="muted num" data-testid="offers-count">
          {lista.length ? `Ofert: ${lista.length}` : ''}
        </span>
        <span style={{ flex: 1 }} />
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
        <div className="table-card">
          <table className="table" data-testid="offers-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Data</th>
                <th>Klient</th>
                <th className="th-num" style={{ width: 120 }}>Wartość</th>
                {kolumnaMarzy && (
                  <th className="th-num th-internal" style={{ width: 128 }} title="Dane wewnętrzne — nie trafiają na dokument">
                    Marża
                  </th>
                )}
                <th style={{ width: 190 }}>Status</th>
                <th style={{ width: 86 }}>Wysłano</th>
                <th className="th-actions" style={{ width: 236 }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} data-testid={`offer-row-${o.id}`}>
                  <td className="num">{formatDatePl(o.date)}</td>
                  <td>
                    {o.client || '—'}
                    {!!o.wzDocumentIds?.length && (
                      <span
                        className="group-tag"
                        data-testid={`offer-has-wz-${o.id}`}
                        title="Z tej oferty wystawiono już dokument WZ"
                      >
                        WZ
                      </span>
                    )}
                  </td>
                  <td className="td-money">{formatMoney(offerTotals(o).total)}</td>
                  {kolumnaMarzy && (
                    <td className="td-num muted" data-testid={`offer-margin-${o.id}`}>
                      {offerCosts(o).hasCosts ? formatMoney(offerCosts(o).margin) : '—'}
                    </td>
                  )}
                  <td>
                    <select
                      className="input input-small"
                      data-testid={`offer-status-${o.id}`}
                      value={o.status}
                      onChange={(e) => onStatusChange(o, e.target.value as Offer['status'])}
                    >
                      {(Object.keys(OFFER_STATUS_LABELS) as Offer['status'][]).map((s) => (
                        <option key={s} value={s}>
                          {OFFER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
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
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={kolumn} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                    Brak wyników dla „{q.trim()}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
