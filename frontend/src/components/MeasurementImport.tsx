import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileUp, Loader2, X } from 'lucide-react';
import { AppState, Offer } from '../types';
import { parseEml } from '../lib/eml';
import { groupsFromMeasurement, parseMeasurementMail, withoutPrice } from '../lib/measurementMail';
import { blankOffer, formatMoney, itemTotal } from '../lib/offers';
import { priceTablesFor } from '../lib/cennik';
import { todayStr } from '../lib/dates';

interface Props {
  state: AppState;
  /** Gotowy szkic — otwiera się w edytorze, do sprawdzenia przez człowieka */
  onCreate: (offer: Offer) => void;
  onClose: () => void;
}

/** Import pomiaru: plik `.eml` z poczty albo wklejona treść wiadomości.
 *
 *  Oferta nigdy nie wystawia się sama. Import kończy się szkicem otwartym
 *  w edytorze — ceny z cennika są podstawione, ale podpis pod nimi stawia
 *  człowiek, który widział, czego brakuje. */
export default function MeasurementImport({ state, onCreate, onClose }: Props) {
  const [temat, setTemat] = useState('');
  const [tresc, setTresc] = useState('');
  const [produkt, setProdukt] = useState('');
  const [plik, setPlik] = useState('');
  const [czyta, setCzyta] = useState(false);
  const [blad, setBlad] = useState('');
  const [nadPolem, setNadPolem] = useState(false);
  const wejscie = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabele = useMemo(() => priceTablesFor(state.priceTables), [state.priceTables]);

  const pomiar = useMemo(() => parseMeasurementMail(temat, tresc), [temat, tresc]);
  // Nazwa produktu jest jedna na całą wiadomość, więc poprawia się ją raz:
  // pomiarowiec dopisuje w pierwszej linii uwagi („kolor do ustalenia”),
  // a tu widać, co wyjdzie na dokumencie przy każdej pozycji.
  const nazwa = produkt.trim() || pomiar.product;
  const grupy = useMemo(
    () => groupsFromMeasurement({ ...pomiar, product: nazwa }, tabele),
    [pomiar, nazwa, tabele]
  );

  const sztuk = pomiar.items.reduce((s, i) => s + i.qty, 0);
  const suma = grupy.reduce((s, g) => s + g.items.reduce((x, i) => x + itemTotal(i), 0), 0);
  const bezCeny = withoutPrice(grupy);
  const pokoje = grupy.filter((g) => (g.title || '').trim()).length;

  async function wczytajPlik(f: File) {
    setCzyta(true);
    setBlad('');
    try {
      const bajty = new Uint8Array(await f.arrayBuffer());
      const mail = parseEml(bajty);
      if (!mail.text.trim()) {
        setBlad('W tym pliku nie ma treści tekstowej. Otwórz wiadomość w poczcie i wklej jej treść poniżej.');
      } else {
        setPlik(f.name);
        setTemat(mail.subject || f.name.replace(/\.eml$/i, ''));
        setTresc(mail.text);
        setProdukt('');
      }
    } catch {
      setBlad('Nie udało się odczytać pliku. Wklej treść wiadomości poniżej.');
    } finally {
      setCzyta(false);
    }
  }

  function utworz() {
    const oferta = blankOffer(state, todayStr(), grupy);
    onCreate({ ...oferta, client: temat.trim() });
  }

  const gotowe = pomiar.items.length > 0;

  return (
    <div className="modal-overlay" data-testid="import-overlay" onClick={onClose}>
      <div
        className="import-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import pomiaru z poczty"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="import-head">
          <h2 className="import-title">Import pomiaru z poczty</h2>
          <button className="btn btn-ghost" data-testid="import-close-btn" aria-label="Zamknij" title="Zamknij (Esc)" onClick={onClose}>
            <X className="icon" />
          </button>
        </div>

        <div className="import-body">
          <div
            className={'import-drop' + (nadPolem ? ' is-over' : '')}
            data-testid="import-drop"
            onDragOver={(e) => {
              e.preventDefault();
              setNadPolem(true);
            }}
            onDragLeave={() => setNadPolem(false)}
            onDrop={(e) => {
              e.preventDefault();
              setNadPolem(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void wczytajPlik(f);
            }}
          >
            {czyta ? <Loader2 className="icon spin" /> : <FileUp className="icon" />}
            <div>
              <strong>Przeciągnij tu wiadomość z pomiarem</strong>
              <p className="muted">
                Plik <code>.eml</code> zapisany z poczty — temat, pomieszczenia i wymiary wczytają się same.
              </p>
            </div>
            <button className="btn btn-light" data-testid="import-file-btn" onClick={() => wejscie.current?.click()}>
              Wybierz plik
            </button>
            <input
              ref={wejscie}
              type="file"
              accept=".eml,message/rfc822"
              hidden
              data-testid="import-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void wczytajPlik(f);
                e.target.value = '';
              }}
            />
          </div>

          {plik && (
            <p className="muted" data-testid="import-file-name">
              Wczytano: {plik}
            </p>
          )}
          {blad && (
            <div className="notice-card notice-warn" data-testid="import-error">
              <div className="notice-head">
                <AlertTriangle className="icon" />
                <span>{blad}</span>
              </div>
            </div>
          )}

          <label className="field">
            <span>Klient albo obiekt</span>
            <input
              className="input"
              data-testid="import-subject"
              value={temat}
              placeholder="np. Wiślana 11c / 1"
              onChange={(e) => setTemat(e.target.value)}
            />
            <span className="field-hint">Temat wiadomości. Trafia na ofertę jako odbiorca — można go tu poprawić.</span>
          </label>

          <label className="field">
            <span>Treść wiadomości</span>
            <textarea
              className="input import-text"
              data-testid="import-text"
              rows={8}
              value={tresc}
              placeholder={'Żaluzja drewniana 25\nKuchnia\n85,7 x 109 L\n95,5 x 120 LP'}
              onChange={(e) => setTresc(e.target.value)}
            />
            <span className="field-hint">
              Pierwsza linia to produkt, krótka linia bez cyfr to pomieszczenie, reszta to wymiary. Litery przy
              wymiarze liczą sztuki i stronę mechanizmu: <code>L</code> — jedna lewa, <code>LP</code> — lewa i prawa,{' '}
              <code>LLPP</code> — dwie lewe i dwie prawe.
            </span>
          </label>

          {gotowe && (
            <>
              <label className="field">
                <span>Nazwa produktu na ofercie</span>
                <input
                  className="input"
                  data-testid="import-product"
                  value={nazwa}
                  onChange={(e) => setProdukt(e.target.value)}
                />
                <span className="field-hint">
                  Jedna na całą wycenę. Skróć ją, jeśli pomiarowiec dopisał w tej linii uwagę — uwaga ma miejsce w
                  specyfikacji pozycji, nie w nazwie produktu.
                </span>
              </label>

              <div className="import-summary" data-testid="import-summary">
                <span>
                  <strong>{sztuk}</strong> {sztuk === 1 ? 'sztuka' : 'szt.'} w <strong>{pokoje || 1}</strong>{' '}
                  {pokoje === 1 ? 'tabeli' : 'tabelach'}
                </span>
                <span className="spacer" />
                <span>
                  Razem z cennika: <strong>{formatMoney(suma)}</strong>
                </span>
              </div>

              {pomiar.missingSide > 0 && (
                <div className="notice-card notice-warn" data-testid="import-missing-side">
                  <div className="notice-head">
                    <AlertTriangle className="icon" />
                    <span>
                      {pomiar.missingSide === 1
                        ? 'Jedna pozycja nie ma oznaczonej strony sterowania'
                        : `${pomiar.missingSide} pozycje nie mają oznaczonej strony sterowania`}{' '}
                      — zostawiam je puste do uzupełnienia, bo zgadnięta strona to źle uszyty produkt.
                    </span>
                  </div>
                </div>
              )}
              {bezCeny > 0 && (
                <div className="notice-card notice-warn" data-testid="import-missing-price">
                  <div className="notice-head">
                    <AlertTriangle className="icon" />
                    <span>
                      {bezCeny === 1 ? 'Jedna pozycja nie ma ceny' : `${bezCeny} pozycji nie ma ceny`} w cenniku —
                      wymiar wypada poza tabelą albo produkt nazywa się inaczej niż w cenniku.
                    </span>
                  </div>
                </div>
              )}
              {pomiar.unknown.length > 0 && (
                <div className="notice-card notice-warn" data-testid="import-unknown">
                  <div className="notice-head">
                    <AlertTriangle className="icon" />
                    <span>
                      Nie rozumiem tych linii: {pomiar.unknown.map((l) => `„${l}”`).join(', ')}. Nie trafią do oferty —
                      sprawdź, czy nie ma w nich wymiaru.
                    </span>
                  </div>
                </div>
              )}

              <div className="table-card">
                <table className="table table-rows" data-testid="import-preview">
                  <thead>
                    <tr>
                      <th>Pomieszczenie</th>
                      <th>Wymiar</th>
                      <th>Strona</th>
                      <th className="num">Szt.</th>
                      <th className="num">Cena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupy.map((g) =>
                      g.items.map((i, idx) => (
                        <tr key={g.id + idx} data-row>
                          <td>{idx === 0 ? g.title || '—' : ''}</td>
                          <td>{i.material}</td>
                          <td>
                            {i.spec?.find((w) => w.label === 'Strona sterowania')?.value || (
                              <span className="muted">do uzupełnienia</span>
                            )}
                          </td>
                          <td className="num">{i.qty}</td>
                          <td className="num">
                            {String(i.unitPrice || '').trim() ? (
                              formatMoney(itemTotal(i))
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-light" data-testid="import-cancel-btn" onClick={onClose}>
            Anuluj
          </button>
          <button
            className="btn btn-primary"
            data-testid="import-create-btn"
            disabled={!gotowe}
            onClick={utworz}
            title={gotowe ? '' : 'Najpierw wczytaj albo wklej treść wiadomości'}
          >
            Utwórz szkic oferty
          </button>
        </div>
      </div>
    </div>
  );
}
