import { useState } from 'react';
import { Search, Plus, Eye, Pencil, Printer, FileDown, Mail, Trash2, FileSpreadsheet } from 'lucide-react';
import { Offer } from '../types';
import { formatDatePl } from '../lib/printing';
import StatusChips from '../components/StatusChips';
import { formatMoney, offerTotals, OFFER_STATUS_LABELS } from '../lib/offers';

interface Props {
  offers: Offer[];
  onEdit: (id: string) => void;
  onNewOffer: () => void;
  onPreview: (offer: Offer) => void;
  onPrint: (offer: Offer) => void;
  onPdf: (offer: Offer) => void;
  onEmail: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onStatusChange: (offer: Offer, status: Offer['status']) => void;
}

export default function OffersView({
  offers,
  onEdit,
  onNewOffer,
  onPreview,
  onPrint,
  onPdf,
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

  return (
    <section className="view" data-testid="view-offers">
      <h1 className="page-title">Oferty cenowe</h1>

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

      {anyOffers && (
        <div className="table-card">
          <table className="table" data-testid="offers-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Data</th>
                <th>Klient</th>
                <th className="th-num" style={{ width: 120 }}>Wartość</th>
                <th style={{ width: 150 }}>Status</th>
                <th style={{ width: 86 }}>Wysłano</th>
                <th style={{ width: 250 }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id} data-testid={`offer-row-${o.id}`}>
                  <td className="num">{formatDatePl(o.date)}</td>
                  <td>{o.client || '—'}</td>
                  <td className="td-num">{formatMoney(offerTotals(o).total)}</td>
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
                      <button className="btn btn-small btn-light" data-testid={`offer-print-${o.id}`} aria-label="Drukuj" title="Drukuj" onClick={() => onPrint(o)}>
                        <Printer className="icon" />
                      </button>
                      <button className="btn btn-small btn-light" data-testid={`offer-pdf-${o.id}`} aria-label="Zapisz PDF" title="Zapisz PDF" onClick={() => onPdf(o)}>
                        <FileDown className="icon" />
                      </button>
                      <button className="btn btn-small btn-light" data-testid={`offer-email-${o.id}`} aria-label="Wyślij e-mailem" title="Wyślij e-mailem" onClick={() => onEmail(o)}>
                        <Mail className="icon" />
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
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
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
          <p>Nie ma jeszcze żadnej oferty. Wystaw pierwszą — zajmie to chwilę.</p>
          <button className="btn btn-primary" data-testid="offers-empty-new-btn" onClick={onNewOffer}>
            <Plus className="icon" />
            Nowa oferta
          </button>
        </div>
      )}
    </section>
  );
}
