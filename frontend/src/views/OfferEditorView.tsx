import { useEffect, useRef, useState } from 'react';
import {
  Plus, X, Save, Printer, FileDown, Mail, Trash2, ArrowLeft, Layers, GitCompareArrows, Wallet, FileOutput,
  Check, Loader2
} from 'lucide-react';
import { AppState, AskConfirm, Offer, OfferColumnHeader, OfferGroup, OfferItem } from '../types';
import { uid } from '../lib/storage';
import {
  columnHeaderLabel,
  formatMoney,
  groupLpNumbers,
  isItemEmpty,
  itemTotal,
  normalizeAmount,
  offerCosts,
  offerTotals,
  OFFER_STATUS_LABELS,
  validUntil,
  variantLetter,
  availableIssuers
} from '../lib/offers';
import { itemNameSuggestions } from '../lib/suggestions';
import { printOffer, savePdfOffer, emailOffer } from '../lib/offerActions';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { useActionState } from '../hooks/useActionState';
import SuffixField from '../components/SuffixField';

interface Props {
  state: AppState;
  editingOfferId: string | null;
  onPersist: (next: AppState) => Promise<void>;
  onSaved: (id: string) => void;
  onBack: () => void;
  onDelete: (offer: Offer) => void;
  toast: (msg: string, isError?: boolean) => void;
  emailConfirm: (message: string) => Promise<boolean>;
  onMark: (offer: Offer, patch: Partial<Offer>) => void;
  askConfirm: AskConfirm;
  /** Przepisanie tej oferty na nowy dokument WZ */
  onIssueWz: (offer: Offer) => void;
}

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const EMPTY_ITEM = (): OfferItem => ({ name: '', material: '', qty: '1', unitPrice: '' });
const NEW_GROUP = (header: OfferColumnHeader = 'material', variant = false): OfferGroup => ({
  id: uid(),
  header,
  title: '',
  variant,
  items: [EMPTY_ITEM()]
});

const HEADER_OPTIONS: OfferColumnHeader[] = ['material', 'size', 'materialSize', 'plain'];

export default function OfferEditorView({
  state,
  editingOfferId,
  onPersist,
  onSaved,
  onBack,
  onDelete,
  toast,
  emailConfirm,
  onMark,
  askConfirm,
  onIssueWz
}: Props) {
  const existing = editingOfferId ? state.offers.find((o) => o.id === editingOfferId) || null : null;
  const initRef = useRef<string | null>('__none__');

  function initOffer(o: Offer | null): Offer {
    const d = state.settings.offerDefaults;
    return o
      ? structuredClone(o)
      : ({
          id: '',
          date: todayStr(),
          place: state.settings.place,
          client: '',
          clientEmail: '',
          groups: [NEW_GROUP()],
          continuousNumbering: true,
          discountEnabled: false,
          discountPercent: '',
          deliveryEnabled: false,
          deliveryPrice: '',
          installationIncluded: d.installationIncluded,
          deadlineDays: d.deadlineDays,
          validityEnabled: d.validityEnabled ?? false,
          validityDays: d.validityDays,
          notes: '',
          issuedBy: availableIssuers(state)[0] || '',
          legalClause: d.legalClause ?? true,
          status: 'szkic',
          createdAt: '',
          updatedAt: ''
        } as Offer);
  }

  const [offer, setOffer] = useState<Offer>(() => initOffer(existing));

  useEffect(() => {
    if (initRef.current === '__none__') {
      initRef.current = editingOfferId;
      return;
    }
    if (initRef.current !== editingOfferId) {
      initRef.current = editingOfferId;
      setOffer(initOffer(editingOfferId ? state.offers.find((o) => o.id === editingOfferId) || null : null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOfferId]);

  const savedSnapshot = useRef('');
  const dirty = savedSnapshot.current !== '' && savedSnapshot.current !== JSON.stringify(offer);

  useEffect(() => {
    savedSnapshot.current = JSON.stringify(offer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOfferId]);

  const leaveEditor = async () => {
    if (dirty && !(await askConfirm('Masz niezapisane zmiany w ofercie. Wyjść bez zapisywania?', { confirmLabel: 'Wyjdź bez zapisywania', danger: true }))) {
      return;
    }
    onBack();
  };

  const set = (patch: Partial<Offer>) => setOffer((o) => ({ ...o, ...patch }));

  const podpowiedziNazw = itemNameSuggestions(state.documents).concat(
    Array.from(
      new Set(
        state.offers.flatMap((o) => o.groups.flatMap((g) => g.items.map((it) => it.name.trim()).filter(Boolean)))
      )
    )
  );

  const numery = groupLpNumbers(offer.groups, offer.continuousNumbering);
  const sumy = offerTotals(offer);
  const koszty = offerCosts(offer);
  // Koszt własny i marża są tylko do wyceny w programie — nie ma ich na dokumencie
  const pokazKoszty = state.settings.showCosts !== false;

  // --- grupy i pozycje ---
  const setGroup = (gi: number, patch: Partial<OfferGroup>) =>
    setOffer((o) => ({ ...o, groups: o.groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)) }));

  const setItem = (gi: number, ii: number, patch: Partial<OfferItem>) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) =>
        i === gi ? { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : g
      )
    }));

  const addItem = (gi: number) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => (i === gi ? { ...g, items: [...g.items, EMPTY_ITEM()] } : g))
    }));

  const removeItem = (gi: number, ii: number) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => {
        if (i !== gi) return g;
        const items = g.items.filter((_, j) => j !== ii);
        return { ...g, items: items.length ? items : [EMPTY_ITEM()] };
      })
    }));

  const addGroup = () => setOffer((o) => ({ ...o, groups: [...o.groups, NEW_GROUP()] }));
  const addVariant = () =>
    setOffer((o) => ({ ...o, groups: [...o.groups, NEW_GROUP(o.groups[o.groups.length - 1]?.header || 'material', true)] }));
  const removeGroup = (gi: number) =>
    setOffer((o) => {
      const groups = o.groups.filter((_, i) => i !== gi);
      return { ...o, groups: groups.length ? groups : [NEW_GROUP()] };
    });

  // --- zapis ---
  async function saveOffer(): Promise<Offer | null> {
    if (!offer.date) {
      toast('Podaj datę oferty.', true);
      return null;
    }
    if (!offer.client.trim()) {
      toast('Podaj klienta, dla którego wystawiasz ofertę.', true);
      return null;
    }
    const nowIso = new Date().toISOString();
    const zapisana: Offer = {
      ...offer,
      id: offer.id || uid(),
      client: offer.client.trim(),
      clientEmail: offer.clientEmail.trim(),
      issuedBy: offer.issuedBy.trim(),
      deliveryPrice: normalizeAmount(offer.deliveryPrice),
      groups: offer.groups.map((g) => ({
        ...g,
        items: g.items.map((it) => ({
          ...it,
          unitPrice: normalizeAmount(it.unitPrice),
          totalOverride: it.totalOverride ? normalizeAmount(it.totalOverride) : it.totalOverride,
          cost: it.cost ? normalizeAmount(it.cost) : it.cost
        }))
      })),
      createdAt: offer.createdAt || nowIso,
      updatedAt: nowIso
    };
    const next = structuredClone(state);
    const idx = next.offers.findIndex((o) => o.id === zapisana.id);
    if (idx >= 0) next.offers[idx] = zapisana;
    else next.offers.push(zapisana);
    await onPersist(next);
    setOffer(zapisana);
    savedSnapshot.current = JSON.stringify(zapisana);
    if (!editingOfferId) onSaved(zapisana.id);
    return zapisana;
  }

  useEditorShortcuts({
    dirty,
    onSave: () => void handleSave(),
    onPrint: () => void handlePrint(),
    onBack: () => void leaveEditor()
  });

  const akcje = useActionState();

  const handleSave = () =>
    akcje.wykonaj('zapis', async () => {
      const z = await saveOffer();
      if (z) {
        akcje.potwierdzZapis();
        toast(`Zapisano ofertę dla: ${z.client}.`);
      }
    });
  const handlePrint = () =>
    akcje.wykonaj('druk', async () => {
      const z = await saveOffer();
      if (!z) return;
      if (await printOffer(z, state.settings, toast)) onMark(z, { printedAt: new Date().toISOString() });
    });
  const handlePdf = () =>
    akcje.wykonaj('pdf', async () => {
      const z = await saveOffer();
      if (z) await savePdfOffer(z, state.settings, toast);
    });
  const handleIssueWz = async () => {
    const z = await saveOffer();
    if (z) onIssueWz(z);
  };
  const handleEmail = () =>
    akcje.wykonaj('mail', async () => {
      const z = await saveOffer();
      if (!z) return;
      if (await emailOffer(z, state.settings, toast, emailConfirm)) {
        onMark(z, {
          emailedAt: new Date().toISOString(),
          emailedTo: z.clientEmail,
          status: z.status === 'szkic' ? 'wyslana' : z.status
        });
      }
    });

  return (
    <section className="view view-edit" data-testid="view-offer-edit">
      <div className="edit-head">
        <h1 className="page-title" data-testid="offer-edit-title">
          {existing ? `Edycja oferty — ${existing.client}` : 'Nowa oferta cenowa'}
        </h1>
        <div className="doc-number">
          <span className="doc-number-label">Wartość</span>
          <strong className="value" data-testid="offer-total">{formatMoney(sumy.total)}</strong>
        </div>
      </div>

      <div className="card">
        <div className="grid3">
          <label className="field">
            <span>Data wystawienia</span>
            <input type="date" className="input" data-testid="offer-date" value={offer.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label className="field">
            <span>Miejsce</span>
            <input type="text" className="input" data-testid="offer-place" value={offer.place} onChange={(e) => set({ place: e.target.value })} />
          </label>
          <label className="field">
            <span>Wystawił</span>
            <select className="input" data-testid="offer-issuer" value={offer.issuedBy} onChange={(e) => set({ issuedBy: e.target.value })}>
              {!availableIssuers(state).includes(offer.issuedBy) && offer.issuedBy && (
                <option value={offer.issuedBy}>{offer.issuedBy}</option>
              )}
              {availableIssuers(state).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Klient lub obiekt *</span>
            <input
              type="text"
              className="input"
              data-testid="offer-client"
              placeholder="np. Akacjowa 12 Koczargi Stare"
              value={offer.client}
              onChange={(e) => set({ client: e.target.value })}
            />
          </label>
          <label className="field">
            <span>E-mail klienta</span>
            <input type="email" className="input" data-testid="offer-client-email" value={offer.clientEmail} onChange={(e) => set({ clientEmail: e.target.value })} />
          </label>
          <label className="field">
            <span>Status oferty</span>
            <select className="input" data-testid="offer-status" value={offer.status} onChange={(e) => set({ status: e.target.value as Offer['status'] })}>
              {(Object.keys(OFFER_STATUS_LABELS) as Offer['status'][]).map((st) => (
                <option key={st} value={st}>
                  {OFFER_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
            <span className="muted field-hint">Tylko do Waszej wiadomości — nie drukuje się na ofercie.</span>
          </label>
        </div>
      </div>

      {/* ---------- Grupy pozycji ---------- */}
      <datalist id="podpowiedzi-produktow">
        {Array.from(new Set(podpowiedziNazw)).map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {offer.groups.map((g, gi) => (
        <div className="card" key={g.id} data-testid={`offer-group-${gi}`}>
          <div className="group-head">
            <div className="group-head-top">
              <h3 className="card-title">
                {g.variant ? variantLetter(offer.groups, gi) : `Tabela ${gi + 1}`}
                {g.variant && <span className="group-tag">wyceniany osobno</span>}
              </h3>
              <span className="spacer" />
              {offer.groups.length > 1 && (
                <button className="btn btn-small btn-danger" data-testid={`offer-group-remove-${gi}`} onClick={() => removeGroup(gi)}>
                  <Trash2 className="icon" />
                  Usuń tabelę
                </button>
              )}
            </div>
            <div className="group-head-fields">
            <label className="field group-title-field">
              <span>Podpis nad tabelą</span>
              <input
                type="text"
                className="input"
                data-testid={`offer-group-title-${gi}`}
                placeholder={g.variant ? variantLetter(offer.groups, gi) : 'nieobowiązkowy, np. Salon'}
                value={g.title || ''}
                onChange={(e) => setGroup(gi, { title: e.target.value })}
              />
            </label>
            <label className="field group-header-select">
              <span>Nagłówek kolumny</span>
              <select
                className="input"
                data-testid={`offer-group-header-${gi}`}
                value={g.header}
                onChange={(e) => setGroup(gi, { header: e.target.value as OfferColumnHeader })}
              >
                {HEADER_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {columnHeaderLabel(h)}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-field group-variant-check">
              <input
                type="checkbox"
                data-testid={`offer-group-variant-${gi}`}
                checked={!!g.variant}
                onChange={(e) => setGroup(gi, { variant: e.target.checked })}
              />
              <span>Wariant alternatywny (poza ceną całkowitą)</span>
            </label>
            </div>
          </div>

          <table className="table items-table offer-items-table">
            <thead>
              <tr>
                <th style={{ width: 54 }} className="th-num">Lp.</th>
                <th>Produkt</th>
                <th style={{ width: 80 }} className="th-num">Ilość</th>
                <th style={{ width: 120 }} className="th-num">Cena/szt.</th>
                {pokazKoszty && (
                  <th style={{ width: 110 }} className="th-num th-internal" title="Nie trafia na dokument dla klienta">
                    Koszt/szt.
                  </th>
                )}
                <th style={{ width: 130 }} className="th-num">Kwota</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {g.items.map((it, ii) => (
                <tr key={ii}>
                  <td>
                    <input
                      type="text"
                      className="input item-lp-input num"
                      data-testid={`offer-lp-${gi}-${ii}`} inputMode="numeric"
                      aria-label="Numer pozycji"
                      placeholder={numery[gi][ii]}
                      value={it.lpOverride || ''}
                      onChange={(e) => setItem(gi, ii, { lpOverride: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input item-name"
                      data-testid={`offer-name-${gi}-${ii}`}
                      aria-label="Nazwa produktu"
                      list="podpowiedzi-produktow"
                      placeholder="np. Rolety wolnowiszące FI32"
                      value={it.name}
                      onChange={(e) => setItem(gi, ii, { name: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input item-material"
                      data-testid={`offer-material-${gi}-${ii}`}
                      aria-label="Materiał lub wymiar"
                      placeholder="np. Materiał C102 · 186 x 202 cm"
                      value={it.material}
                      onChange={(e) => setItem(gi, ii, { material: e.target.value })}
                    />
                  </td>
                  <td>
                    <input type="text" className="input num" data-testid={`offer-qty-${gi}-${ii}`} inputMode="decimal" aria-label="Ilość" value={it.qty} onChange={(e) => setItem(gi, ii, { qty: e.target.value })} />
                  </td>
                  <td>
                    <SuffixField
                      suffix="zł"
                      normalizuj
                      testId={`offer-unit-${gi}-${ii}`}
                      ariaLabel="Cena za sztukę"
                      value={it.unitPrice}
                      onChange={(v) => setItem(gi, ii, { unitPrice: v })}
                    />
                  </td>
                  {pokazKoszty && (
                    <td>
                      <SuffixField
                        suffix="zł"
                        normalizuj
                        className="internal"
                        testId={`offer-cost-${gi}-${ii}`}
                        ariaLabel="Koszt własny za sztukę"
                        value={it.cost || ''}
                        onChange={(v) => setItem(gi, ii, { cost: v })}
                      />
                    </td>
                  )}
                  <td>
                    <SuffixField
                      suffix="zł"
                      normalizuj
                      testId={`offer-total-${gi}-${ii}`}
                      ariaLabel="Kwota za pozycję"
                      placeholder={isItemEmpty(it) ? '' : formatMoney(itemTotal(it)).replace(' zł', '')}
                      value={it.totalOverride || ''}
                      onChange={(v) => setItem(gi, ii, { totalOverride: v })}
                    />
                  </td>
                  <td>
                    <button className="btn btn-small btn-danger item-remove" data-testid={`offer-item-remove-${gi}-${ii}`} aria-label="Usuń pozycję" title="Usuń pozycję" onClick={() => removeItem(gi, ii)}>
                      <X className="icon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-light" data-testid={`offer-add-item-${gi}`} onClick={() => addItem(gi)}>
            <Plus className="icon" />
            Dodaj pozycję
          </button>
        </div>
      ))}

      <div className="actions-bar" style={{ marginBottom: 4 }}>
        <button className="btn" data-testid="offer-add-group" onClick={addGroup}>
          <Layers className="icon" />
          Dodaj tabelę
        </button>
        <button className="btn" data-testid="offer-add-variant" onClick={addVariant} title="Druga wersja wyceny, np. inny materiał — na tej samej ofercie">
          <GitCompareArrows className="icon" />
          Dodaj wariant
        </button>
        <label className="checkbox-field">
          <input
            type="checkbox"
            data-testid="offer-continuous"
            checked={offer.continuousNumbering}
            onChange={(e) => set({ continuousNumbering: e.target.checked })}
          />
          <span>Numeracja ciągła przez wszystkie tabele</span>
        </label>
      </div>

      {/* ---------- Podsumowanie ---------- */}
      <div className="card">
        <h3 className="card-title">Podsumowanie</h3>
        <div className="grid2">
          <div>
            <label className="checkbox-field">
              <input type="checkbox" data-testid="offer-discount-enabled" checked={offer.discountEnabled} onChange={(e) => set({ discountEnabled: e.target.checked })} />
              <span>Rabat procentowy</span>
            </label>
            {offer.discountEnabled && (
              <label className="field" style={{ marginTop: 8 }}>
                <span>Wysokość rabatu</span>
                <SuffixField
                  suffix="%"
                  testId="offer-discount-percent"
                  ariaLabel="Wysokość rabatu w procentach"
                  value={offer.discountPercent}
                  onChange={(v) => set({ discountPercent: v })}
                />
              </label>
            )}
          </div>
          <div>
            <label className="checkbox-field">
              <input type="checkbox" data-testid="offer-delivery-enabled" checked={offer.deliveryEnabled} onChange={(e) => set({ deliveryEnabled: e.target.checked })} />
              <span>Dostawa kurierem</span>
            </label>
            {offer.deliveryEnabled && (
              <label className="field" style={{ marginTop: 8 }}>
                <span>Szacunkowy koszt dostawy</span>
                <SuffixField
                  suffix="zł"
                  normalizuj
                  testId="offer-delivery-price"
                  ariaLabel="Szacunkowy koszt dostawy"
                  value={offer.deliveryPrice}
                  onChange={(v) => set({ deliveryPrice: v })}
                />
                <span className="muted field-hint">Puste pole wydrukuje się jako „nie dotyczy”.</span>
              </label>
            )}
          </div>
        </div>
        <div className="offer-summary-box" data-testid="offer-summary">
          <div>
            Suma pozycji: <strong>{formatMoney(sumy.itemsSum)}</strong>
          </div>
          {offer.discountEnabled && sumy.discountAmount > 0 && (
            <div>
              Rabat {offer.discountPercent}%: <strong>−{formatMoney(sumy.discountAmount)}</strong>
            </div>
          )}
          <div className="offer-summary-total">
            {sumy.variants.length ? 'Cena całkowita oferty podstawowej' : 'Cena całkowita'}:{' '}
            <strong>{formatMoney(sumy.total)}</strong>
          </div>
          {sumy.variants.map((w) => (
            <div key={w.id} data-testid={`offer-variant-total-${w.id}`}>
              {w.label}: <strong>{formatMoney(w.total)}</strong>
            </div>
          ))}
          {offer.deliveryEnabled && (
            <div className="muted">
              Dostawa: {offer.deliveryPrice.trim() ? formatMoney(sumy.deliveryAmount) : 'nie dotyczy'} (osobno, poza ceną
              całkowitą)
            </div>
          )}
          {pokazKoszty && koszty.hasCosts && (
            <div className="offer-margin" data-testid="offer-margin">
              <span className="internal-badge">
                <Wallet className="icon" />
                tylko w programie
              </span>
              <span>
                Koszt własny: <strong>{formatMoney(koszty.costSum)}</strong>
              </span>
              <span>
                Marża: <strong>{formatMoney(koszty.margin)}</strong> (
                {koszty.marginPercent.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Warunki ---------- */}
      <div className="card">
        <h3 className="card-title">Warunki oferty</h3>
        <p className="muted card-note">Te ustawienia drukują się na dokumencie dla klienta.</p>
        <div className="grid2">
          <label className="field">
            <span>Montaż</span>
            <select className="input" data-testid="offer-installation" value={offer.installationIncluded ? 'tak' : 'nie'} onChange={(e) => set({ installationIncluded: e.target.value === 'tak' })}>
              <option value="tak">Ceny uwzględniają montaż</option>
              <option value="nie">Ceny nie uwzględniają montażu</option>
            </select>
          </label>
          <label className="field">
            <span>Termin realizacji (dni roboczych od akceptacji zamówienia)</span>
            <input type="text" className="input num" data-testid="offer-deadline-days" inputMode="numeric" value={offer.deadlineDays} onChange={(e) => set({ deadlineDays: e.target.value })} />
            <span className="muted field-hint">Puste pole pomija ten wiersz na ofercie.</span>
          </label>
        </div>

        <div className="switch-row">
          <div className="switch-col">
            <label className="checkbox-field">
              <input type="checkbox" data-testid="offer-validity-enabled" checked={offer.validityEnabled} onChange={(e) => set({ validityEnabled: e.target.checked })} />
              <span>Ogranicz ważność oferty</span>
            </label>
            {offer.validityEnabled && (
              <label className="field">
                <span>Ważna przez (dni) — do {validUntil(offer) || '—'}</span>
                <input type="text" className="input num" data-testid="offer-validity-days" inputMode="numeric" value={offer.validityDays} onChange={(e) => set({ validityDays: e.target.value })} />
              </label>
            )}
          </div>
          <div className="switch-col">
            <label className="checkbox-field">
              <input
                type="checkbox"
                data-testid="offer-legal-clause"
                checked={offer.legalClause}
                onChange={(e) => set({ legalClause: e.target.checked })}
              />
              <span>Dopisz klauzulę informacyjną</span>
            </label>
            <span className="muted field-hint">Treść klauzuli ustawisz w Ustawieniach.</span>
          </div>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Uwagi na ofercie</span>
          <textarea className="input" data-testid="offer-notes" rows={3} value={offer.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>

      <div className="actions-bar actions-sticky">
        <button
          className={'btn btn-primary btn-save' + (akcje.zapisane ? ' done' : '')}
          data-testid="offer-save-btn"
          disabled={!!akcje.pracuje}
          onClick={handleSave}
        >
          {akcje.zapisane ? <Check className="icon" /> : <Save className="icon" />}
          {akcje.zapisane ? 'Zapisano' : 'Zapisz'}
        </button>
        <button className="btn" data-testid="offer-save-print-btn" disabled={!!akcje.pracuje} onClick={handlePrint}>
          {akcje.pracuje === 'druk' ? <Loader2 className="icon icon-spin" /> : <Printer className="icon" />}
          {akcje.pracuje === 'druk' ? 'Drukuję…' : 'Drukuj'}
        </button>
        <button className="btn" data-testid="offer-save-pdf-btn" disabled={!!akcje.pracuje} onClick={handlePdf}>
          {akcje.pracuje === 'pdf' ? <Loader2 className="icon icon-spin" /> : <FileDown className="icon" />}
          PDF
        </button>
        <button className="btn" data-testid="offer-save-email-btn" disabled={!!akcje.pracuje} onClick={handleEmail}>
          {akcje.pracuje === 'mail' ? <Loader2 className="icon icon-spin" /> : <Mail className="icon" />}
          {akcje.pracuje === 'mail' ? 'Wysyłam…' : 'Wyślij'}
        </button>
        <span className="shortcut-hint">
          <kbd>Ctrl</kbd>+<kbd>S</kbd> zapis · <kbd>Ctrl</kbd>+<kbd>P</kbd> wydruk · <kbd>Esc</kbd> powrót
        </span>
        <span className="spacer" />
        <button className="btn" data-testid="offer-issue-wz-btn" onClick={handleIssueWz} title="Przepisz pozycje tej oferty na dokument WZ">
          <FileOutput className="icon" />
          Wystaw WZ
        </button>
        {existing && (
          <button className="btn btn-danger" data-testid="offer-delete-btn" onClick={() => onDelete(existing)}>
            <Trash2 className="icon" />
            Usuń
          </button>
        )}
        <button className="btn btn-light" data-testid="offer-back-btn" onClick={leaveEditor}>
          <ArrowLeft className="icon" />
          Wróć
        </button>
      </div>
    </section>
  );
}
