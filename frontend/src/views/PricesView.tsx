import { useMemo, useState } from 'react';
import { Table2 } from 'lucide-react';
import { AppState } from '../types';
import { CENNIK, cennikProdukty, ilePoprawek } from '../lib/cennik';
import { lookupPrice, surchargeAmount, toCm } from '../lib/pricing';
import { formatMoney } from '../lib/offers';
import { priceVertical, SzerokoscPasa, VERTICALE } from '../lib/verticale';

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
  const [tkanina, setTkanina] = useState(VERTICALE.tkaniny[0].nazwa);
  const [pas, setPas] = useState<SzerokoscPasa>('127');
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
            {CENNIK.length} tabel · ceny sprzedaży brutto. {ilePoprawek()} kratek poprawionych
            względem wydruku producenta — oznaczone w siatce, najedź, żeby zobaczyć pierwotną kwotę.
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
              ? `${formatMoney(odczyt.cost)} — kratka ${odczyt.cellWidth} × ${odczyt.cellHeight} cm` +
                (odczyt.printed ? ` · poprawione, w cenniku ${formatMoney(odczyt.printed)}` : '')
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
                      const wCenniku = tabela.corrected?.[`${wi}:${ki}`];
                      return (
                        <td
                          key={w}
                          className={`${trafiona ? 'prices-hit' : ''}${wCenniku ? ' prices-fixed' : ''}`}
                          title={wCenniku ? `W cenniku producenta: ${wCenniku} zł — kwota błędna` : undefined}
                        >
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

      {/* Verticale wyceniamy inaczej — tkanina za m² plus szyna za metr
          bieżący — więc nie mają siatki i dostają własny kalkulator. */}
      <div className="card">
        <h3 className="card-title">Verticale</h3>
        <p className="muted card-note">
          Cena składa się z dwóch części: tkaniny liczonej za metr kwadratowy i szyny za metr
          bieżący ({VERTICALE.szyna} zł/mb). Producent liczy minimum {VERTICALE.minTkanina} m²
          tkaniny i {VERTICALE.minSzyna} mb szyny.
        </p>
        <div className="grid2">
          <label className="field">
            <span>Tkanina</span>
            <select
              className="input"
              data-testid="vert-fabric"
              value={tkanina}
              onChange={(e) => setTkanina(e.target.value)}
            >
              {VERTICALE.tkaniny.map((t) => (
                <option key={t.nazwa} value={t.nazwa}>
                  {t.nazwa} — {t['89']} zł/m² (89 mm), {t['127']} zł/m² (127 mm)
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Szerokość pasa</span>
            <div className="group-switch" data-testid="vert-strip">
              {(['89', '127'] as SzerokoscPasa[]).map((s) => (
                <button
                  key={s}
                  className={`btn btn-small ${s === pas ? 'btn-primary' : 'btn-light'}`}
                  data-testid={`vert-strip-${s}`}
                  onClick={() => setPas(s)}
                >
                  {s} mm
                </button>
              ))}
            </div>
          </label>
        </div>
        <p className="prices-answer" data-testid="vert-answer">
          {(() => {
            if (!pytanie) return 'Podaj wymiar wyżej, żeby wycenić verticale.';
            const w = priceVertical(tkanina, pas, pytanie.width, pytanie.height);
            if (!w) return 'Podaj poprawny wymiar.';
            // przecinek dziesiętny, tak jak w kwotach — kropka wyglądałaby obco
            const miara = (x: number) => x.toFixed(2).replace('.', ',');
            return `${formatMoney(w.razem)} — tkanina ${formatMoney(w.tkanina)} za ${miara(w.metry)} m²` +
              ` + szyna ${formatMoney(w.szyna)} za ${miara(w.mb)} mb`;
          })()}
        </p>
        <table className="table" data-testid="vert-surcharges">
          <tbody>
            {VERTICALE.doplaty.map((d) => (
              <tr key={d.nazwa}>
                <td>{d.nazwa}</td>
                <td className="num">{d.procent ? `+${d.procent}%` : formatMoney(d.kwota as number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
