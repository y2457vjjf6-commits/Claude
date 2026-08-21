import { useMemo, useState } from 'react';
import { BarChart3, Printer, Mail } from 'lucide-react';
import { AppState, WZDocument } from '../types';
import { formatDatePl, formatDateTimePl } from '../lib/printing';

interface Props {
  state: AppState;
}

/** Sumuje ilości, gdy da się je odczytać jako liczbę; inaczej zlicza wystąpienia. */
function sumujPozycje(dokumenty: WZDocument[]) {
  const mapa = new Map<string, { nazwa: string; jednostka: string; ilosc: number; nieliczbowe: number }>();
  for (const doc of dokumenty) {
    for (const it of doc.items || []) {
      const nazwa = (it.name || '').trim();
      if (!nazwa) continue;
      const jednostka = (it.unit || '').trim();
      const klucz = nazwa.toLowerCase() + '|' + jednostka.toLowerCase();
      const wpis = mapa.get(klucz) || { nazwa, jednostka, ilosc: 0, nieliczbowe: 0 };
      const liczba = Number(String(it.qty || '').replace(',', '.'));
      if (Number.isFinite(liczba)) wpis.ilosc += liczba;
      else if ((it.qty || '').trim()) wpis.nieliczbowe += 1;
      mapa.set(klucz, wpis);
    }
  }
  return Array.from(mapa.values()).sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
}

function miesiacDokumentu(doc: WZDocument): string {
  return (doc.dateIssued || '').slice(0, 7); // RRRR-MM
}

const NAZWY_MIESIECY = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
];

function etykietaMiesiaca(rrrrMm: string): string {
  const [r, m] = rrrrMm.split('-');
  const idx = Number(m) - 1;
  return NAZWY_MIESIECY[idx] ? `${NAZWY_MIESIECY[idx]} ${r}` : rrrrMm;
}

export default function ReportsView({ state }: Props) {
  const [odbiorca, setOdbiorca] = useState('');
  const [miesiac, setMiesiac] = useState('');

  const odbiorcy = useMemo(() => {
    const zbior = new Set<string>();
    for (const d of state.documents) {
      const n = (d.contractor?.name || '').trim();
      if (n) zbior.add(n);
    }
    return Array.from(zbior).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [state.documents]);

  const miesiace = useMemo(() => {
    const zbior = new Set<string>();
    for (const d of state.documents) {
      const m = miesiacDokumentu(d);
      if (m) zbior.add(m);
    }
    return Array.from(zbior).sort().reverse();
  }, [state.documents]);

  const wybrane = useMemo(() => {
    return state.documents
      .filter((d) => !odbiorca || (d.contractor?.name || '').trim() === odbiorca)
      .filter((d) => !miesiac || miesiacDokumentu(d) === miesiac)
      .slice()
      .sort((a, b) => a.dateIssued.localeCompare(b.dateIssued) || Number(a.seq) - Number(b.seq));
  }, [state.documents, odbiorca, miesiac]);

  const podsumowanie = useMemo(() => sumujPozycje(wybrane), [wybrane]);
  const filtrWybrany = Boolean(odbiorca || miesiac);

  return (
    <section className="view" data-testid="view-reports">
      <h1 className="page-title">Zestawienia</h1>

      <div className="card">
        <div className="grid2">
          <label className="field">
            <span>Odbiorca</span>
            <select className="input" data-testid="report-contractor" value={odbiorca} onChange={(e) => setOdbiorca(e.target.value)}>
              <option value="">— wszyscy —</option>
              {odbiorcy.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Miesiąc</span>
            <select className="input" data-testid="report-month" value={miesiac} onChange={(e) => setMiesiac(e.target.value)}>
              <option value="">— wszystkie —</option>
              {miesiace.map((m) => (
                <option key={m} value={m}>{etykietaMiesiaca(m)}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!wybrane.length && (
        <div className="empty" data-testid="reports-empty">
          <BarChart3 className="icon" />
          <p>
            {state.documents.length
              ? 'Brak dokumentów dla wybranego odbiorcy i miesiąca.'
              : 'Nie ma jeszcze żadnych dokumentów do zestawienia.'}
          </p>
        </div>
      )}

      {wybrane.length > 0 && (
        <>
          <div className="card">
            <h3 className="card-title">
              Wydane pozycje{filtrWybrany ? '' : ' (wszystkie dokumenty)'} — {wybrane.length}{' '}
              {wybrane.length === 1 ? 'dokument' : 'dokumentów'}
            </h3>
            <div className="table-card">
              <table className="table" data-testid="report-summary">
                <thead>
                  <tr>
                    <th>Nazwa towaru / opis</th>
                    <th style={{ width: 110 }}>Jedn.</th>
                    <th className="th-num" style={{ width: 120 }}>Razem</th>
                  </tr>
                </thead>
                <tbody>
                  {podsumowanie.map((w) => (
                    <tr key={w.nazwa + w.jednostka}>
                      <td>{w.nazwa}</td>
                      <td>{w.jednostka}</td>
                      <td className="td-num">
                        {w.ilosc ? w.ilosc.toLocaleString('pl-PL') : ''}
                        {w.nieliczbowe > 0 && (
                          <span className="muted" title="Ilości wpisane opisowo, nie dało się ich zsumować">
                            {w.ilosc ? ' + ' : ''}{w.nieliczbowe}×?
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Dokumenty w zestawieniu</h3>
            <div className="table-card">
              <table className="table" data-testid="report-documents">
                <thead>
                  <tr>
                    <th style={{ width: 130 }}>Numer</th>
                    <th style={{ width: 110 }}>Data</th>
                    <th>Odbiorca</th>
                    <th style={{ width: 150 }}>Kto odebrał</th>
                    <th className="th-num" style={{ width: 76 }}>Pozycje</th>
                    <th style={{ width: 96 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {wybrane.map((d) => (
                    <tr key={d.id}>
                      <td className="doc-number-cell">{d.number}</td>
                      <td className="num">{formatDatePl(d.dateIssued)}</td>
                      <td>{d.contractor?.name || '—'}</td>
                      <td>{d.receivedBy || ''}</td>
                      <td className="td-num">{d.items.filter((i) => i.name).length}</td>
                      <td>
                        <div className="doc-status">
                          {d.printedAt && (
                            <span className="status-chip" title={`Drukowano ${formatDateTimePl(d.printedAt)}`}>
                              <Printer className="icon" />
                            </span>
                          )}
                          {d.emailedAt && (
                            <span className="status-chip" title={`Wysłano ${formatDateTimePl(d.emailedAt)}`}>
                              <Mail className="icon" />
                            </span>
                          )}
                          {!d.printedAt && !d.emailedAt && <span className="muted">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
