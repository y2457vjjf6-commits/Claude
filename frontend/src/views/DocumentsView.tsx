import { ReactNode, useMemo, useState } from 'react';
import { Search, Plus, Eye, Pencil, Printer, FileDown, Mail, Trash2, FileText } from 'lucide-react';
import { WZDocument } from '../types';
import { formatDatePl } from '../lib/printing';
import StatusChips from '../components/StatusChips';
import SortableTh from '../components/SortableTh';
import { documentMatches } from '../lib/suggestions';
import { groupByMonth, nextSort, shouldGroup, sortRows, SortState } from '../lib/listing';
import { isRowBackgroundClick, useRowKeyboard } from '../hooks/useRowKeyboard';

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

const KOLUMNY = 7;

/** Wartość kolumny do sortowania. */
function wartosc(d: WZDocument, key: string): unknown {
  switch (key) {
    case 'numer':
      return d.number;
    case 'odbiorca':
      return d.contractor?.name || '';
    case 'zamowienie':
      return d.orderNo || '';
    case 'pozycje':
      return d.items.filter((i) => i.name).length;
    case 'status':
      return (d.emailedAt ? 2 : 0) + (d.printedAt ? 1 : 0);
    default:
      return d.dateIssued + String(d.seq).padStart(4, '0');
  }
}

export default function DocumentsView({ documents, onEdit, onNewDoc, onPreview, onPrint, onPdf, onEmail, onDelete }: Props) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'data', dir: 'desc' });
  const query = q.trim().toLowerCase();

  const docs = useMemo(() => {
    const znalezione = documents.filter((d) => {
      if (!query) return true;
      return documentMatches(d, query) || formatDatePl(d.dateIssued).includes(query);
    });
    return sortRows(znalezione, sort, wartosc);
  }, [documents, query, sort]);

  const anyDocs = documents.length > 0;
  const naMiesiace = shouldGroup(docs, sort, 'data');
  const grupy = naMiesiace ? groupByMonth(docs, (d) => d.dateIssued) : [{ klucz: '', etykieta: '', wiersze: docs }];
  const sortuj = (key: string) => setSort((s) => nextSort(s, key, key === 'data' || key === 'pozycje'));

  const wiersz = (d: WZDocument) => (
    <Row
      key={d.id}
      doc={d}
      onEdit={onEdit}
      onPreview={onPreview}
      onPrint={onPrint}
      onPdf={onPdf}
      onEmail={onEmail}
      onDelete={onDelete}
    />
  );

  return (
    <section className="view" data-testid="view-list">
      <h1 className="page-title">Dokumenty WZ</h1>
      {anyDocs && (
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
          <span className="spacer" />
          <button className="btn btn-primary" data-testid="new-doc-btn" onClick={onNewDoc}>
            <Plus className="icon" />
            Nowa WZ
          </button>
        </div>
      )}

      {anyDocs && (
        <>
          <div className="table-card">
            <table className="table table-rows" data-testid="docs-table">
              <thead>
                <tr>
                  <SortableTh label="Numer" sortKey="numer" sort={sort} onSort={sortuj} style={{ width: 130 }} />
                  <SortableTh label="Data" sortKey="data" sort={sort} onSort={sortuj} style={{ width: 118 }} />
                  <SortableTh label="Odbiorca" sortKey="odbiorca" sort={sort} onSort={sortuj} />
                  <SortableTh label="Nr zamówienia" sortKey="zamowienie" sort={sort} onSort={sortuj} style={{ width: 160 }} />
                  <SortableTh label="Pozycje" sortKey="pozycje" sort={sort} onSort={sortuj} className="th-num" style={{ width: 92 }} />
                  <SortableTh label="Status" sortKey="status" sort={sort} onSort={sortuj} style={{ width: 96 }} />
                  <th className="th-actions" style={{ width: 290 }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {grupy.map((g) => (
                  <Fragmenty key={g.klucz || 'wszystko'}>
                    {naMiesiace && (
                      <tr className="group-row" data-testid={`month-${g.klucz}`}>
                        <th colSpan={KOLUMNY} scope="colgroup">
                          {g.etykieta}
                          <span className="group-count">{g.wiersze.length}</span>
                        </th>
                      </tr>
                    )}
                    {g.wiersze.map(wiersz)}
                  </Fragmenty>
                ))}
                {!docs.length && (
                  <tr>
                    <td colSpan={KOLUMNY} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                      Brak wyników dla „{q.trim()}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {docs.length > 0 && (
            <p className="list-hint">
              Dwuklik lub <kbd>Enter</kbd> — edycja · <kbd>Spacja</kbd> — podgląd · <kbd>↑</kbd> <kbd>↓</kbd> — następny wiersz
            </p>
          )}
        </>
      )}

      {!anyDocs && (
        <div className="empty" data-testid="docs-empty">
          <FileText className="icon" />
          <h2 className="empty-title">Nie ma jeszcze żadnej WZ</h2>
          <p>Wystawienie pierwszego dokumentu zajmuje mniej niż minutę.</p>
          <button className="btn btn-primary" data-testid="empty-new-doc-btn" onClick={onNewDoc}>
            <Plus className="icon" />
            Nowa WZ
          </button>
        </div>
      )}
    </section>
  );
}

/** Grupowanie wymaga wielu <tr> obok siebie — stąd fragment z kluczem. */
function Fragmenty({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface RowProps {
  doc: WZDocument;
  onEdit: (id: string) => void;
  onPreview: (doc: WZDocument) => void;
  onPrint: (doc: WZDocument) => void;
  onPdf: (doc: WZDocument) => void;
  onEmail: (doc: WZDocument) => void;
  onDelete: (doc: WZDocument) => void;
}

function Row({ doc: d, onEdit, onPreview, onPrint, onPdf, onEmail, onDelete }: RowProps) {
  const naKlawisz = useRowKeyboard({ onEnter: () => onEdit(d.id), onSpace: () => onPreview(d) });

  return (
    <tr
      data-row
      tabIndex={0}
      data-testid={`doc-row-${d.id}`}
      aria-label={`Dokument ${d.number}`}
      onClick={(e) => isRowBackgroundClick(e) && e.currentTarget.focus()}
      onDoubleClick={(e) => isRowBackgroundClick(e) && onEdit(d.id)}
      onKeyDown={naKlawisz}
    >
      <td className="doc-number-cell">{d.number}</td>
      <td className="num">{formatDatePl(d.dateIssued)}</td>
      <td>{d.contractor?.name || '—'}</td>
      <td>{d.orderNo || ''}</td>
      <td className="td-num">{d.items.filter((i) => i.name).length}</td>
      <td>
        <StatusChips printedAt={d.printedAt} emailedAt={d.emailedAt} emailedTo={d.emailedTo} />
      </td>
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
  );
}
