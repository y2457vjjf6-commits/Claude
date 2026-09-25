import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Eye, Pencil, Printer, FileDown, Mail, Trash2, FileText, ChevronDown } from 'lucide-react';
import { WZDocument } from '../types';
import { formatDatePl } from '../lib/printing';
import DocState from '../components/DocState';
import SortableTh from '../components/SortableTh';
import PopMenu from '../components/PopMenu';
import BulkBar from '../components/BulkBar';
import SelectAllBox from '../components/SelectAllBox';
import { documentMatches } from '../lib/suggestions';
import { groupByMonth, nextSort, shouldGroup, sortRows, SortState } from '../lib/listing';
import { isRowBackgroundClick, useRowKeyboard } from '../hooks/useRowKeyboard';
import { useSelection } from '../hooks/useSelection';

interface Props {
  documents: WZDocument[];
  onEdit: (id: string) => void;
  onNewDoc: () => void;
  onPreview: (doc: WZDocument, lista: WZDocument[]) => void;
  onPrint: (doc: WZDocument) => void;
  onPdf: (doc: WZDocument) => void;
  onEmail: (doc: WZDocument) => void;
  onDelete: (doc: WZDocument) => void;
  onPrintMany: (docs: WZDocument[]) => void;
  onEmailMany: (docs: WZDocument[]) => void;
  onDeleteMany: (docs: WZDocument[]) => void;
}

const KOLUMNY = 8;
/** Ile wierszy rysujemy na raz — resztę na żądanie, żeby przy wieloletniej
 *  historii nie budować setek wierszy naraz. */
const PORCJA = 100;

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

/** Polska odmiana rzeczownika po liczbie. */
export function mianoDok(n: number): string {
  if (n === 1) return 'dokument';
  const ost = n % 10;
  const dwie = n % 100;
  return ost >= 2 && ost <= 4 && (dwie < 12 || dwie > 14) ? 'dokumenty' : 'dokumentów';
}

export default function DocumentsView(props: Props) {
  const { documents, onEdit, onNewDoc, onPreview, onPrint, onPdf, onEmail, onDelete } = props;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'data', dir: 'desc' });
  const [limit, setLimit] = useState(PORCJA);
  const query = q.trim().toLowerCase();

  const znalezione = useMemo(() => {
    const pasujace = documents.filter((d) => {
      if (!query) return true;
      return documentMatches(d, query) || formatDatePl(d.dateIssued).includes(query);
    });
    return sortRows(pasujace, sort, wartosc);
  }, [documents, query, sort]);

  useEffect(() => setLimit(PORCJA), [query, sort]);

  const docs = znalezione.slice(0, limit);
  const zaznaczanie = useSelection(docs.map((d) => d.id));
  const zaznaczoneDok = docs.filter((d) => zaznaczanie.zbior.has(d.id));

  const anyDocs = documents.length > 0;
  const naMiesiace = shouldGroup(docs, sort, 'data');
  const grupy = naMiesiace ? groupByMonth(docs, (d) => d.dateIssued) : [{ klucz: '', etykieta: '', wiersze: docs }];
  const sortuj = (key: string) => setSort((s) => nextSort(s, key, key === 'data' || key === 'pozycje'));
  const ostatni = useMemo(() => documents.map((d) => d.dateIssued).sort().slice(-1)[0], [documents]);

  return (
    <section className="view" data-testid="view-list">
      <header className="view-head">
        <h1 className="page-title">Dokumenty WZ</h1>
        {anyDocs && (
          <p className="view-meta" data-testid="docs-count">
            {documents.length} {mianoDok(documents.length)}
            {ostatni ? ` · ostatni ${formatDatePl(ostatni)}` : ''}
            {query ? ` · pasujących: ${znalezione.length}` : ''}
          </p>
        )}
      </header>

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
          <span className="spacer" />
          <button className="btn btn-primary" data-testid="new-doc-btn" onClick={onNewDoc}>
            <Plus className="icon" />
            Nowa WZ
          </button>
        </div>
      )}

      {zaznaczoneDok.length > 0 && (
        <BulkBar
          ile={zaznaczoneDok.length}
          rzeczownik={mianoDok}
          onPrint={() => props.onPrintMany(zaznaczoneDok)}
          onEmail={() => props.onEmailMany(zaznaczoneDok)}
          onDelete={() => {
            props.onDeleteMany(zaznaczoneDok);
            zaznaczanie.wyczysc();
          }}
          onClear={zaznaczanie.wyczysc}
        />
      )}

      {anyDocs && (
        <>
          <div className="table-card">
            <table className="table table-rows" data-testid="docs-table">
              <thead>
                <tr>
                  <th className="th-select">
                    <SelectAllBox
                      ileZaznaczonych={zaznaczoneDok.length}
                      ileWszystkich={docs.length}
                      onToggle={zaznaczanie.wszystkie}
                    />
                  </th>
                  <SortableTh label="Numer" sortKey="numer" sort={sort} onSort={sortuj} style={{ width: 130 }} />
                  <SortableTh label="Data" sortKey="data" sort={sort} onSort={sortuj} style={{ width: 118 }} />
                  <SortableTh label="Odbiorca" sortKey="odbiorca" sort={sort} onSort={sortuj} />
                  <SortableTh label="Nr zamówienia" sortKey="zamowienie" sort={sort} onSort={sortuj} style={{ width: 160 }} />
                  <SortableTh label="Pozycje" sortKey="pozycje" sort={sort} onSort={sortuj} className="th-num" style={{ width: 92 }} />
                  <SortableTh label="Stan" sortKey="status" sort={sort} onSort={sortuj} style={{ width: 122 }} />
                  <th className="th-actions" style={{ width: 138 }}>Akcje</th>
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
                    {g.wiersze.map((d) => (
                      <Row
                        key={d.id}
                        doc={d}
                        zaznaczony={zaznaczanie.zbior.has(d.id)}
                        onSelect={zaznaczanie.przelacz}
                        onEdit={onEdit}
                        onPreview={(dok) => onPreview(dok, docs)}
                        onPrint={onPrint}
                        onPdf={onPdf}
                        onEmail={onEmail}
                        onDelete={onDelete}
                      />
                    ))}
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

          {znalezione.length > docs.length && (
            <button className="btn btn-light more-btn" data-testid="more-docs" onClick={() => setLimit((l) => l + PORCJA)}>
              <ChevronDown className="icon" />
              Pokaż kolejne {Math.min(PORCJA, znalezione.length - docs.length)} (zostało {znalezione.length - docs.length})
            </button>
          )}

          {docs.length > 0 && (
            <p className="list-hint">
              Dwuklik lub <kbd>Enter</kbd> — edycja · <kbd>Spacja</kbd> — podgląd · <kbd>↑</kbd> <kbd>↓</kbd> — następny
              wiersz · <kbd>Shift</kbd>+klik — zaznacz zakres
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

function Fragmenty({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface RowProps {
  doc: WZDocument;
  zaznaczony: boolean;
  onSelect: (id: string, zakres: boolean) => void;
  onEdit: (id: string) => void;
  onPreview: (doc: WZDocument) => void;
  onPrint: (doc: WZDocument) => void;
  onPdf: (doc: WZDocument) => void;
  onEmail: (doc: WZDocument) => void;
  onDelete: (doc: WZDocument) => void;
}

function Row({ doc: d, zaznaczony, onSelect, onEdit, onPreview, onPrint, onPdf, onEmail, onDelete }: RowProps) {
  const naKlawisz = useRowKeyboard({ onEnter: () => onEdit(d.id), onSpace: () => onPreview(d) });

  return (
    <tr
      data-row
      tabIndex={0}
      className={zaznaczony ? 'selected' : undefined}
      data-testid={`doc-row-${d.id}`}
      aria-label={`Dokument ${d.number}`}
      onClick={(e) => isRowBackgroundClick(e) && e.currentTarget.focus()}
      onDoubleClick={(e) => isRowBackgroundClick(e) && onEdit(d.id)}
      onKeyDown={naKlawisz}
    >
      <td className="cell-select">
        <label className="check-hit">
        <input
          type="checkbox"
          className="row-check"
          data-testid={`doc-check-${d.id}`}
          aria-label={`Zaznacz dokument ${d.number}`}
          checked={zaznaczony}
          onChange={() => undefined}
          onClick={(e) => onSelect(d.id, e.shiftKey)}
        />
        </label>
      </td>
      <td className="doc-number-cell">{d.number}</td>
      <td className="num">{formatDatePl(d.dateIssued)}</td>
      <td>{d.contractor?.name || '—'}</td>
      <td>{d.orderNo || ''}</td>
      <td className="td-num">{d.items.filter((i) => i.name).length}</td>
      <td>
        <DocState printedAt={d.printedAt} emailedAt={d.emailedAt} emailedTo={d.emailedTo} />
      </td>
      <td>
        <div className="row-actions">
          <button className="btn btn-small btn-light" data-testid={`doc-edit-${d.id}`} onClick={() => onEdit(d.id)}>
            <Pencil className="icon" />
            Edytuj
          </button>
          <PopMenu
            testId={`doc-more-${d.id}`}
            label={`Więcej działań dla ${d.number}`}
            items={[
              { key: 'preview', label: 'Podgląd', ikona: <Eye className="icon" />, onPick: () => onPreview(d) },
              { key: 'print', label: 'Drukuj', ikona: <Printer className="icon" />, onPick: () => onPrint(d) },
              { key: 'pdf', label: 'Zapisz PDF', ikona: <FileDown className="icon" />, onPick: () => onPdf(d) },
              { key: 'email', label: 'Wyślij e-mailem', ikona: <Mail className="icon" />, onPick: () => onEmail(d) },
              {
                key: 'delete',
                label: 'Usuń',
                ikona: <Trash2 className="icon" />,
                separator: true,
                danger: true,
                onPick: () => onDelete(d)
              }
            ]}
          />
        </div>
      </td>
    </tr>
  );
}
