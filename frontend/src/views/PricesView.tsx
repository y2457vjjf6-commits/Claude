import { useMemo, useState } from 'react';
import { Table2 } from 'lucide-react';
import { AppState } from '../types';
import { CENNIK, cennikProdukty } from '../lib/cennik';
import { lookupPrice, surchargeAmount, toCm } from '../lib/pricing';
import { formatMoney } from '../lib/offers';

interface Props {
  state: AppState;
}

/** Przeglądarka cennika producenta: siatka szerokość × wysokość dla wybranego
 *  produktu i grupy materiału. Służy do sprawdzenia ceny przez telefon, bez
 *  zakładania oferty. */
export default function PricesView({ state }: Props) {
  const produkty = useMemo(() => cennikProdukty(), []);
  const [produktId, setProduktId] = useState(produkty[0]?.id || '');
  const [grupa, setGrupa] = useState('A');
  const [szer, setSzer] = useState('');
  const [wys, setWys] = useState('');

  const produkt = produkty.find((p) => p.id === produktId) || produkty[0];
  const tabela = CENNIK.find((t) => t.id === `${produkt?.id}-${grupa}`) || null;

  // Szukana kratka — podświetlamy ją w siatce, żeby było widać, skąd jest kwota
  const pytanie =
    szer.trim() && wys.trim()
      ? { width: toCm(parseFloat(szer.replace(',', '.'))), height: toCm(parseFloat(wys.replace(',', '.'))) }
      : null;
  const odczyt = tabela && pytanie && isFinite(pytanie.width) && isFinite(pytanie.height)
    ? lookupPrice(tabela, pytanie)
    : null;

  return (
    <section className="view" data-testid="view-prices">
      <header className="view-head">
        <div>
          <h1 className="view-title">Cennik</h1>
          <p className="view-meta" data-testid="prices-meta">
            {CENNIK.length} tabel · ceny sprzedaży brutto wprost z cennika producenta
          </p>
        </div>
      </header>

      <div className="card">
        <div className="grid2">
          <label className="field">
            <span>Produkt</span>
            <select
              className="input"
              data-testid="prices-product"
              value={produktId}
              onChange={(e) => {
                setProduktId(e.target.value);
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
            <span className="muted field-hint">{produkt ? `Cennik Lechrol 2026, ${produkt.strona}` : ''}</span>
          </label>
          <label className="field">
            <span>Grupa materiału</span>
            <div className="group-switch" data-testid="prices-groups">
              {(produkt?.grupy || []).map((g) => (
                <button
                  key={g}
                  className={`btn btn-small ${g === grupa ? 'btn-primary' : 'btn-light'}`}
                  data-testid={`prices-group-${g}`}
                  onClick={() => setGrupa(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="grid2" style={{ marginTop: 14 }}>
          <label className="field">
            <span>Szerokość (cm)</span>
            <input
              type="text"
              className="input num"
              data-testid="prices-width"
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
              data-testid="prices-height"
              inputMode="decimal"
              value={wys}
              onChange={(e) => setWys(e.target.value)}
            />
          </label>
        </div>

        <p className="prices-answer" data-testid="prices-answer">
          {!pytanie
            ? 'Podaj wymiar, żeby odczytać cenę.'
            : odczyt
              ? `${formatMoney(odczyt.cost)} — kratka ${odczyt.cellWidth} × ${odczyt.cellHeight} cm`
              : 'Ten wymiar jest poza tabelą producenta.'}
        </p>
      </div>

      {tabela && (
        <div className="card">
          <h3 className="card-title">
            <Table2 className="icon" /> {tabela.name}
          </h3>
          <div className="prices-scroll">
            <table className="table prices-grid" data-testid="prices-grid">
              <thead>
                <tr>
                  <th className="prices-corner">wys. \ szer.</th>
                  {tabela.widths.map((w) => (
                    <th key={w} className={odczyt?.cellWidth === w ? 'prices-hit-col' : ''}>
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.heights.map((h, wi) => (
                  <tr key={h} className={odczyt?.cellHeight === h ? 'prices-hit-row' : ''}>
                    <th>{h}</th>
                    {tabela.widths.map((w, ki) => {
                      const cena = tabela.prices[wi]?.[ki];
                      const trafiona = odczyt?.cellWidth === w && odczyt?.cellHeight === h;
                      return (
                        <td key={w} className={trafiona ? 'prices-hit' : ''}>
                          {cena === null || cena === undefined ? '—' : cena}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!!tabela?.surcharges?.length && (
        <div className="card">
          <h3 className="card-title">Dopłaty do tego produktu</h3>
          <table className="table" data-testid="prices-surcharges">
            <tbody>
              {tabela.surcharges.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td className="num">
                    {typeof d.amount === 'number'
                      ? formatMoney(d.amount)
                      : pytanie && surchargeAmount(d, pytanie, odczyt?.cost) !== null
                        ? `${formatMoney(surchargeAmount(d, pytanie, odczyt?.cost) as number)} (dla podanego wymiaru)`
                        : d.by === 'width'
                          ? 'zależy od szerokości'
                          : 'zależy od wysokości'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
