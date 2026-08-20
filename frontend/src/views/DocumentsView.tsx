import { useMemo, useState } from 'react';
import { Search, Plus, Eye, Pencil, Printer, FileDown, Mail, Trash2, FileText } from 'lucide-react';
import { WZDocument } from '../types';
import { formatDatePl } from '../lib/printing';

interface Props {
  documents: WZDocument[];
  onEdit: (id: string) => void;
  onNewDoc: () => void;
  onPreview: (doc: WZDocument) => void;
  onPrint: (doc: WZDocument) => void;
  onPdf: (doc: WZDocument) => void;
  onEmail: (doc: WZDocument) => void;
  onDelete: (doc: WZDocument) => void;
}

export default function DocumentsView({ documents, onEdit, onNewDoc, onPreview, onPrint, onPdf, onEmail, onDelete }: Props) {
  const [q, setQ] = useState<string>('');
  const query = q.trim().toLowerCase();

  const docs = useMemo(
    () =>
      documents
        .slice()
        .sort((a, b) => b.dateIssued.localeCompare(a.dateIssued) || Number(b.seq) - Number(a.seq))
        .filter((d) => {
          if (!query) return true;
          return [d.number, d.contractor?.name, d.orderNo, d.dateIssued, formatDatePl(d.dateIssued)].some((v) =>
            String(v || '').toLowerCase().includes(query)
          );
        }),
    [documents, query]
  );

  const anyDocs = documents.length > 0;

  return (
    <section className="view" data-testid="view-list">
      <h1 className="page-title">Dokumenty WZ</h1>
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon" />
          <input
            type="search"
            className="input"
            data-testid="search-docs-input"
            placeholder="Szukaj: numer, kontrahent, nr zamówienia, data…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="muted num" data-testid="docs-count">
          {docs.length ? `Dokumentów: ${docs.length}` : ''}
        </span>
      </div>

      {anyDocs && (
        <div className="table-card">
          <table className="table" data-testid="docs-table">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Numer</th>
                <th style={{ width: 110 }}>Data</th>
                <th>Odbiorca</th>
                <th style={{ width: 150 }}>Nr zamówienia</th>
                <th className="th-num" style={{ width: 76 }}>Pozycje</th>
                <th style={{ width: 290 }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} data-testid={`doc-row-${d.id}`}>
                  <td className="doc-number-cell">{d.number}</td>
                  <td className="num">{formatDatePl(d.dateIssued)}</td>
                  <td>{d.contractor?.name || '—'}</td>
                  <td>{d.orderNo || ''}</td>
                  <td className="td-num">{d.items.filter((i) => i.name).length}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-small btn-light" data-testid={`doc-preview-${d.id}`} aria-label="Podgląd" title="Podgląd" onClick={() => onPreview(d)}>
                        <Eye className="icon" />
                      </button>
                      <button className="btn btn-small btn-light" data-testid={`doc-edit-${d.id}`} onClick={() => onEdit(d.id)}>
                        <Pencil className="icon" />
                        Edytuj
                      </button>
                      <button className="btn btn-small btn-light" data-testid={`doc-print-${d.id}`} aria-label="Drukuj" title="Drukuj" onClick={() => onPrint(d)}>
                        <Printer className="icon" />
                      </button>
                      <button className="btn btn-small btn-light" data-testid={`doc-pdf-${d.id}`} aria-label="Zapisz PDF" title="Zapisz PDF" onClick={() => onPdf(d)}>
                        <FileDown className="icon" />
                      </button>
                      <button className="btn btn-small btn-light" data-testid={`doc-email-${d.id}`} aria-label="Wyślij e-mailem" title="Wyślij e-mailem" onClick={() => onEmail(d)}>
                        <Mail className="icon" />
                      </button>
                      <button className="btn btn-small btn-danger" data-testid={`doc-delete-${d.id}`} aria-label="Usuń" title="Usuń" onClick={() => onDelete(d)}>
                        <Trash2 className="icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!docs.length && (
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

      {!anyDocs && (
        <div className="empty" data-testid="docs-empty">
          <FileText className="icon" />
          <p>Brak dokumentów. Wystaw pierwszą WZ — zajmie to mniej niż minutę.</p>
          <button className="btn btn-primary" data-testid="empty-new-doc-btn" onClick={onNewDoc}>
            <Plus className="icon" />
            Nowa WZ
          </button>
        </div>
      )}
    </section>
  );
}
