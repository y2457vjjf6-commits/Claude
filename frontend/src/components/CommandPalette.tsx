import { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FileSpreadsheet, Handshake, Plus, Search, Settings2, BarChart3 } from 'lucide-react';
import { AppState, ViewName } from '../types';
import { formatDatePl } from '../lib/printing';
import { formatMoney, offerTotals, OFFER_STATUS_LABELS } from '../lib/offers';

export interface PaletteHandlers {
  otworzDokument: (id: string) => void;
  otworzOferte: (id: string) => void;
  idzDo: (view: ViewName) => void;
  nowaWz: () => void;
  nowaOferta: () => void;
}

interface Props {
  state: AppState;
  handlers: PaletteHandlers;
  onClose: () => void;
}

interface Pozycja {
  id: string;
  grupa: string;
  tytul: string;
  opis: string;
  ikona: ReactElement;
  uruchom: () => void;
}

const LIMIT_GRUPY = 6;

export default function CommandPalette({ state, handlers, onClose }: Props) {
  const [q, setQ] = useState('');
  const [wybrany, setWybrany] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);

  const query = q.trim().toLowerCase();

  const pozycje = useMemo<Pozycja[]>(() => {
    const pasuje = (...pola: (string | undefined)[]) =>
      !query || pola.some((p) => String(p || '').toLowerCase().includes(query));

    const dokumenty = state.documents
      .filter((d) =>
        pasuje(d.number, d.contractor?.name, d.orderNo, formatDatePl(d.dateIssued), ...d.items.map((i) => i.name))
      )
      .sort((a, b) => b.dateIssued.localeCompare(a.dateIssued))
      .slice(0, LIMIT_GRUPY)
      .map<Pozycja>((d) => ({
        id: 'wz-' + d.id,
        grupa: 'Dokumenty WZ',
        tytul: d.number,
        opis: `${d.contractor?.name || 'bez odbiorcy'} · ${formatDatePl(d.dateIssued)}`,
        ikona: <FileText className="icon" />,
        uruchom: () => handlers.otworzDokument(d.id)
      }));

    const oferty = state.offers
      .filter((o) =>
        pasuje(o.client, o.issuedBy, formatDatePl(o.date), ...o.groups.flatMap((g) => g.items.map((i) => i.name)))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, LIMIT_GRUPY)
      .map<Pozycja>((o) => ({
        id: 'oferta-' + o.id,
        grupa: 'Oferty cenowe',
        tytul: o.client || 'Oferta bez nazwy',
        opis: `${formatMoney(offerTotals(o).total)} · ${OFFER_STATUS_LABELS[o.status]} · ${formatDatePl(o.date)}`,
        ikona: <FileSpreadsheet className="icon" />,
        uruchom: () => handlers.otworzOferte(o.id)
      }));

    const kontrahenci = state.contractors
      .filter((c) => pasuje(c.name, c.nip, c.address, c.email))
      .slice(0, LIMIT_GRUPY)
      .map<Pozycja>((c) => ({
        id: 'kontrahent-' + c.id,
        grupa: 'Kontrahenci',
        tytul: c.name,
        opis: [c.nip, c.address].filter(Boolean).join(' · ') || 'brak danych kontaktowych',
        ikona: <Handshake className="icon" />,
        uruchom: () => handlers.idzDo('contractors')
      }));

    const dzialania: Pozycja[] = [
      {
        id: 'akcja-wz',
        grupa: 'Działania',
        tytul: 'Nowa WZ',
        opis: 'Wystaw dokument wydania zewnętrznego',
        ikona: <Plus className="icon" />,
        uruchom: handlers.nowaWz
      },
      {
        id: 'akcja-oferta',
        grupa: 'Działania',
        tytul: 'Nowa oferta cenowa',
        opis: 'Wyceń zamówienie dla klienta',
        ikona: <Plus className="icon" />,
        uruchom: handlers.nowaOferta
      },
      {
        id: 'akcja-zestawienia',
        grupa: 'Działania',
        tytul: 'Zestawienia',
        opis: 'Wydane pozycje w wybranym miesiącu',
        ikona: <BarChart3 className="icon" />,
        uruchom: () => handlers.idzDo('reports')
      },
      {
        id: 'akcja-ustawienia',
        grupa: 'Działania',
        tytul: 'Ustawienia',
        opis: 'Dane firmy, poczta, kopia zapasowa',
        ikona: <Settings2 className="icon" />,
        uruchom: () => handlers.idzDo('settings')
      }
    ].filter((a) => pasuje(a.tytul, a.opis));

    return [...dokumenty, ...oferty, ...kontrahenci, ...dzialania];
  }, [state, query, handlers]);

  useEffect(() => {
    setWybrany(0);
  }, [query]);

  useEffect(() => {
    listaRef.current?.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' });
  }, [wybrany]);

  const uruchom = (poz: Pozycja | undefined) => {
    if (!poz) return;
    poz.uruchom();
    onClose();
  };

  const naKlawisz = (ev: React.KeyboardEvent) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setWybrany((i) => (i + 1) % Math.max(1, pozycje.length));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setWybrany((i) => (i - 1 + pozycje.length) % Math.max(1, pozycje.length));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      uruchom(pozycje[wybrany]);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      onClose();
    }
  };

  let poprzedniaGrupa = '';

  return (
    <div className="modal-overlay palette-overlay" data-testid="palette-overlay" onClick={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Szukaj w programie" onClick={(e) => e.stopPropagation()}>
        <div className="palette-search">
          <Search className="icon" aria-hidden="true" />
          <input
            type="text"
            className="palette-input"
            data-testid="palette-input"
            placeholder="Szukaj dokumentu, oferty, kontrahenta…"
            aria-label="Szukaj w programie"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={naKlawisz}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="palette-list" ref={listaRef} role="listbox" aria-label="Wyniki">
          {pozycje.map((poz, idx) => {
            const nowaGrupa = poz.grupa !== poprzedniaGrupa;
            poprzedniaGrupa = poz.grupa;
            return (
              <div key={poz.id}>
                {nowaGrupa && <div className="palette-group">{poz.grupa}</div>}
                <button
                  type="button"
                  className={'palette-item' + (idx === wybrany ? ' active' : '')}
                  data-testid={`palette-item-${poz.id}`}
                  role="option"
                  aria-selected={idx === wybrany}
                  onMouseEnter={() => setWybrany(idx)}
                  onClick={() => uruchom(poz)}
                >
                  {poz.ikona}
                  <span className="palette-title">{poz.tytul}</span>
                  <span className="palette-desc">{poz.opis}</span>
                </button>
              </div>
            );
          })}
          {!pozycje.length && <div className="palette-empty">Nic nie pasuje do „{q.trim()}”.</div>}
        </div>

        <div className="palette-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> wybór
          </span>
          <span>
            <kbd>Enter</kbd> otwórz
          </span>
          <span>
            <kbd>Ctrl</kbd>+<kbd>K</kbd> wywołanie
          </span>
        </div>
      </div>
    </div>
  );
}
