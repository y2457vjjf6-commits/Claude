import { useEffect, useMemo, useState } from 'react';
import { OfferItem } from '../types';
import { CENNIK, cennikProdukty } from '../lib/cennik';
import { lookupPrice, matchTable, parseDimensions, surchargeAmount, toCm } from '../lib/pricing';
import { formatMoney } from '../lib/offers';

interface Props {
  /** Pozycja, dla której wybieramy cenę — podpowiada produkt i wymiar */
  item: Pick<OfferItem, 'name' | 'material'>;
  onPick: (kwota: number) => void;
  onClose: () => void;
}

/** Ręczny wybór ceny z cennika producenta.
 *
 *  Automatyczne podstawianie działa tylko wtedy, gdy nazwa pozycji zawiera
 *  nazwę produktu z cennika. W praktyce pozycje nazywa się dowolnie, więc
 *  tu wybiera się produkt, grupę i wymiar z ręki, a program odczytuje kwotę.
 */
export default function PricePicker({ item, onPick, onClose }: Props) {
  const produkty = useMemo(() => cennikProdukty(), []);
  const podpowiedz = useMemo(() => matchTable(item, CENNIK), [item]);
  const wymiarPozycji = useMemo(() => parseDimensions(item.material, item.name), [item]);

  // Jeśli program sam rozpoznał produkt, zaczynamy od niego — rzadziej, ale bywa
  const [produktId, setProduktId] = useState(() => {
    const z = podpowiedz?.id || '';
    const p = produkty.find((x) => z.startsWith(x.id));
    return p?.id || produkty[0]?.id || '';
  });
  const [grupa, setGrupa] = useState(() => podpowiedz?.id.split('-').pop() || 'A');
  const [szer, setSzer] = useState(wymiarPozycji ? String(wymiarPozycji.width) : '');
  const [wys, setWys] = useState(wymiarPozycji ? String(wymiarPozycji.height) : '');
  const [doplaty, setDoplaty] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const produkt = produkty.find((p) => p.id === produktId);
  const tabela = CENNIK.find((t) => t.id === `${produktId}-${grupa}`) || null;
  const liczba = (s: string) => {
    const n = parseFloat(s.replace(',', '.'));
    return isFinite(n) ? toCm(n) : NaN;
  };
  const wymiar = { width: liczba(szer), height: liczba(wys) };
  const maWymiar = isFinite(wymiar.width) && isFinite(wymiar.height);
  const odczyt = tabela && maWymiar ? lookupPrice(tabela, wymiar) : null;

  // dopłata procentowa liczy się od ceny z siatki, więc podajemy ją jako podstawę
  const podstawa = odczyt?.cost;
  const wybraneDoplaty = (tabela?.surcharges || []).filter((d) => doplaty.includes(d.name));
  const sumaDoplat = wybraneDoplaty.reduce((s, d) => s + (surchargeAmount(d, wymiar, podstawa) ?? 0), 0);
  const razem = odczyt ? odczyt.cost + sumaDoplat : null;

  return (
    <div className="modal-overlay" data-testid="price-picker-overlay" onClick={onClose}>
      <div
        className="modal-card price-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Wybierz cenę z cennika"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="card-title">Cena z cennika</h3>
        <p className="muted card-note">
          {item.name ? `Pozycja: ${item.name}` : 'Nowa pozycja'}
          {wymiarPozycji ? ` · wymiar z pozycji: ${wymiarPozycji.width} × ${wymiarPozycji.height} cm` : ''}
        </p>

        <label className="field">
          <span>Produkt</span>
          <select
            className="input"
            data-testid="picker-product"
            value={produktId}
            onChange={(e) => {
              setProduktId(e.target.value);
              setDoplaty([]);
              const nowy = produkty.find((p) => p.id === e.target.value);
              if (nowy && !nowy.grupy.includes(grupa)) setGrupa(nowy.grupy[0]);
            }}
          >
            {produkty.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nazwa}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Grupa materiału</span>
          <div className="group-switch" data-testid="picker-groups">
            {(produkt?.grupy || []).map((g) => (
              <button
                key={g}
                className={`btn btn-small ${g === grupa ? 'btn-primary' : 'btn-light'}`}
                data-testid={`picker-group-${g}`}
                onClick={() => setGrupa(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </label>

        <div className="grid2">
          <label className="field">
            <span>Szerokość (cm)</span>
            <input
              type="text"
              className="input num"
              data-testid="picker-width"
              inputMode="decimal"
              value={szer}
              onChange={(e) => setSzer(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Wysokość (cm)</span>
            <input
              type="text"
              className="input num"
              data-testid="picker-height"
              inputMode="decimal"
              value={wys}
              onChange={(e) => setWys(e.target.value)}
            />
          </label>
        </div>

        {!!tabela?.surcharges?.length && (
          <details className="picker-doplaty">
            <summary data-testid="picker-doplaty">Dopłaty{doplaty.length ? ` (${doplaty.length})` : ''}</summary>
            {tabela.surcharges.map((d, di) => {
              const kwota = surchargeAmount(d, wymiar, podstawa);
              return (
                <label className="checkbox-field cennik-doplata" key={d.name}>
                  <input
                    type="checkbox"
                    data-testid={`picker-doplata-${di}`}
                    checked={doplaty.includes(d.name)}
                    disabled={kwota === null}
                    onChange={(e) =>
                      setDoplaty((lista) =>
                        e.target.checked ? [...lista, d.name] : lista.filter((n) => n !== d.name)
                      )
                    }
                  />
                  <span>
                    {d.name} — {kwota === null ? 'poza tabelą' : formatMoney(kwota)}
                  </span>
                </label>
              );
            })}
          </details>
        )}

        <p className="prices-answer" data-testid="picker-answer">
          {!maWymiar
            ? 'Podaj wymiar, żeby odczytać cenę.'
            : odczyt
              ? `${formatMoney(razem as number)} — kratka ${odczyt.cellWidth} × ${odczyt.cellHeight} cm` +
                (sumaDoplat ? ` + dopłaty ${formatMoney(sumaDoplat)}` : '')
              : 'Ten wymiar jest poza tabelą producenta.'}
        </p>

        <div className="modal-actions">
          <button className="btn btn-light" data-testid="picker-cancel" onClick={onClose}>
            Anuluj
          </button>
          <button
            className="btn btn-primary"
            data-testid="picker-accept"
            disabled={razem === null}
            onClick={() => razem !== null && onPick(razem)}
          >
            Wstaw kwotę
          </button>
        </div>
      </div>
    </div>
  );
}
