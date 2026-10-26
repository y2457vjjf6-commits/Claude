import { useEffect, useRef, useState } from 'react';
import {
  Plus, X, Save, Printer, FileDown, Mail, Trash2, ArrowLeft, Layers, GitCompareArrows, Wallet, FileOutput,
  Check, Loader2, Table2, Copy, ClipboardPaste, FileText, ChevronUp, ChevronDown, Factory,
  Columns3, CheckCircle2
} from 'lucide-react';
import { AppState, AskConfirm, Offer, OfferColumnHeader, OfferDiscountRule, OfferGroup, OfferItem, OfferSpecRow } from '../types';
import { uid } from '../lib/storage';
import { todayStr } from '../lib/dates';
import {
  columnHeaderLabel,
  filledSpec,
  formatMoney,
  groupLpNumbers,
  isItemEmpty,
  itemTotal,
  movedBy,
  normalizeAmount,
  offerCosts,
  offerTotals,
  OFFER_STATUS_LABELS,
  validUntil,
  variantLetter,
  VAT_RATES,
  offerVatRate,
  availableIssuers,
  issuerPhone,
  parseNumber,
  wierszyOdmiana
} from '../lib/offers';
import {
  applyOptionSpec,
  commonName,
  fullOptionItem,
  isOptionGroup,
  newOption,
  optionLabel,
  optionsFromVariants,
  selectedOption,
  syncOptions,
  toOptionGroup,
  toPlainGroup
} from '../lib/offerOptions';
import { discountSource, itemDiscountPercent, offerProducts } from '../lib/discounts';
import { normalizujNazwe } from '../lib/photos';
import { itemNameSuggestions } from '../lib/suggestions';
import { printOffer, savePdfOffer, emailOffer } from '../lib/offerActions';
import { computeOfferNumberFor } from '../lib/numbering';
import { photoFor } from '../lib/photos';
import { priceTablesFor } from '../lib/cennik';
import { dimensionConflict, itemDimensions, opiszWycene, priceItem, surchargeAmount } from '../lib/pricing';
import { autoSpecFor, matchSpecTemplate, uzyteczneWiersze } from '../lib/specTemplates';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { useActionState } from '../hooks/useActionState';
import SuffixField from '../components/SuffixField';
import PricePicker from '../components/PricePicker';

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
  /** Założenie zlecenia produkcyjnego z tej oferty */
  onProduce: (offer: Offer) => void;
  /** Treść oferty skopiowanej do nowej — wypełnia świeży formularz */
  prefill?: Offer | null;
  /** Schowek na specyfikację; trzymany poza edytorem, żeby przetrwał
   *  przejście do innej oferty */
  specClipboard?: OfferSpecRow[] | null;
  onSpecClipboard?: (rows: OfferSpecRow[] | null) => void;
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
  onIssueWz,
  onProduce,
  prefill = null,
  specClipboard = null,
  onSpecClipboard
}: Props) {
  const existing = editingOfferId ? state.offers.find((o) => o.id === editingOfferId) || null : null;
  const initRef = useRef<string | null>('__none__');

  function initOffer(o: Offer | null): Offer {
    const d = state.settings.offerDefaults;
    // Kopia oferty przychodzi gotowa — ma już wszystko poza numerem, który
    // nada się przy zapisie, bo edytor pracuje tu w trybie nowej oferty.
    if (!o && prefill) return structuredClone(prefill);
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
          issuedByPhone: issuerPhone(state, availableIssuers(state)[0] || ''),
          // Rysunek produktu ma każda nowa oferta: program niesie wbudowane
          // ikony, więc nie ma już czego czekać na wgranie zdjęć.
          showPhotos: true,
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

  // Numer oferty liczymy na bieżąco, żeby był widoczny jeszcze przed zapisem
  const numerOferty = computeOfferNumberFor(state.offers, editingOfferId, offer.date);
  const numery = groupLpNumbers(offer.groups, offer.continuousNumbering);
  const sumy = offerTotals(offer);
  const koszty = offerCosts(offer);
  // Koszt własny i marża są tylko do wyceny w programie — nie ma ich na dokumencie
  const pokazKoszty = state.settings.showCosts !== false;

  // Ile pozycji dostanie zdjęcie — widać to jeszcze przed wydrukiem, żeby
  // nikogo nie zaskoczyło puste miejsce przy połowie oferty.
  const bibliotekaZdjec = state.settings.productPhotos || [];
  const wypelnione = offer.groups.flatMap((g) => g.items.filter((it) => !isItemEmpty(it)));
  const wszystkieP = wypelnione.length;
  const zZdjeciem = wypelnione.filter((it) => photoFor(it, state.settings)).length;
  const zeSpecyfikacja = wypelnione.filter((it) => (it.spec || []).length > 0).length;

  // --- grupy i pozycje ---
  const setGroup = (gi: number, patch: Partial<OfferGroup>) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => (i === gi ? syncOptions({ ...g, ...patch }) : g))
    }));

  // Która opcja jest otwarta w której grupie. Trzymane poza ofertą — to stan
  // patrzenia, nie treść dokumentu, i nie ma po co trafiać na dysk.
  const [otwartaOpcja, setOtwartaOpcja] = useState<Record<string, string>>({});

  /** Opcja aktualnie edytowana w tej grupie. */
  const biezacaOpcja = (g: OfferGroup) => {
    const opcje = g.options || [];
    return opcje.find((o) => o.id === otwartaOpcja[g.id]) || opcje[0] || null;
  };

  /** Pozycje pokazywane w tabeli grupy: szkielet albo wiersze otwartej opcji. */
  const pozycjeGrupy = (g: OfferGroup): OfferItem[] =>
    isOptionGroup(g) ? biezacaOpcja(g)?.items || [] : g.items;

  // Która pozycja ma otwarte okno wyboru ceny z cennika
  const [wybieraczka, setWybieraczka] = useState<{ gi: number; ii: number } | null>(null);

  // Schowek na specyfikację. Kolejne pozycje różnią się zwykle samym wymiarem —
  // reszta parametrów (kolor kasety, prowadnice, strona sterowania) jest ta sama,
  // a przepisywanie jej ręcznie przy ośmiu oknach to proszenie się o pomyłkę.
  // Trzyma go App, nie edytor: dzięki temu skopiowaną specyfikację da się wkleić
  // także po wyjściu do listy i otwarciu zupełnie innej oferty. Na dysk nie
  // trafia — to podręczna kopia, a nie dane oferty.
  const schowekSpec = specClipboard;

  const kopiujSpec = (spec: OfferSpecRow[]) => {
    const pary = filledSpec(spec);
    onSpecClipboard?.(pary);
    toast(`Skopiowano specyfikację: ${wierszyOdmiana(pary.length)}. Można ją wkleić także w innej ofercie.`);
  };

  // --- cennik producenta ---
  const tabeleCennika = priceTablesFor(state.priceTables);

  /** Przelicza pozycję po cenniku: cenę i kwoty zaznaczonych dopłat.
   *
   *  Cena wpisana ręcznie jest nietykalna — podstawiamy tylko wtedy, gdy pole
   *  jest puste albo poprzednia kwota też pochodzi z cennika. Dopłaty liczymy
   *  od nowa po każdej zmianie wymiaru, bo profil montażowy rośnie z szerokością. */
  const przelicz = (it: OfferItem): OfferItem => {
    const wycena = priceItem(it, tabeleCennika);
    const wymiar = itemDimensions(it);
    const dostepne = wycena.table?.surcharges || [];
    const doplaty = (it.surcharges || []).map((d) => {
      const wzorzec = dostepne.find((x) => x.name === d.name);
      if (!wzorzec) return d;
      // dopłata procentowa liczy się od ceny pozycji, więc podajemy ją obok wymiaru
      const kwota = surchargeAmount(wzorzec, wymiar, parseNumber(it.unitPrice));
      return kwota === null ? d : { ...wzorzec, amount: kwota };
    });

    const reczna = String(it.unitPrice || '').trim() !== '' && it.priceSource !== 'cennik';
    if (reczna) return { ...it, surcharges: doplaty };
    if (wycena.status !== 'ok' || typeof wycena.cost !== 'number') {
      // kwota z cennika przestała obowiązywać — czyścimy ją, zamiast zostawiać starą
      return { ...it, unitPrice: '', priceSource: undefined, surcharges: doplaty };
    }
    return { ...it, unitPrice: String(wycena.cost), priceSource: 'cennik', surcharges: doplaty };
  };

  /** Jedna pozycja po naniesieniu poprawki — razem z przeliczeniem z cennika.
   *  `opis` podaje, czym pozycja jest naprawdę: w grupie opcji wymiar siedzi
   *  w szkielecie, a materiał w opcji, i cena liczy się dopiero z obu. */
  const poPoprawce = (it: OfferItem, patch: Partial<OfferItem>, opis?: OfferItem): OfferItem => {
    // ręczna zmiana ceny odbiera cennikowi prawo do jej nadpisywania
    const zrodlo = 'unitPrice' in patch ? { priceSource: undefined } : {};
    const nowa = { ...it, ...patch, ...zrodlo };
    // wymiar bierze się także z pól specyfikacji, więc ich zmiana
    // musi przeliczyć cenę tak samo jak poprawka opisu pozycji
    const zmianaOpisu = 'name' in patch || 'material' in patch || 'spec' in patch;
    if (!zmianaOpisu) return nowa;
    if (opis) {
      // W grupie opcji szablon zakłada się na szkielecie, bo rubryki produktu
      // są wspólne dla wszystkich opcji. Tu liczymy już tylko cenę — z pełnego
      // opisu (wymiar ze szkieletu, materiał z opcji), ale zapisujemy wyłącznie
      // to, co do opcji należy.
      const wyceniona = przelicz({ ...nowa, material: fullOptionItem(opis, nowa).material, spec: opis.spec });
      return {
        ...nowa,
        unitPrice: wyceniona.unitPrice,
        priceSource: wyceniona.priceSource,
        surcharges: wyceniona.surcharges
      };
    }
    // Szablon przypisany do produktu wchodzi przed wyceną: jego wiersze
    // mogą nieść wymiar, a wtedy cena ma się policzyć od razu z nich.
    // Pozycję z własną specyfikacją zostawia w spokoju.
    const zSzablonu = 'name' in patch || 'material' in patch ? autoSpecFor(nowa, state.settings) : null;
    return przelicz(zSzablonu ? { ...nowa, spec: zSzablonu } : nowa);
  };

  /** Pola, które w grupie opcji należą do wszystkich alternatyw naraz.
   *  Nazwy produktu tu nie ma: opcje bywają różnymi produktami i wpisanie
   *  jednej nazwy nie może przestawiać pozostałym. */
  const WSPOLNE_POLA: (keyof OfferItem)[] = ['qty', 'lpOverride'];

  /** Poprawka w grupie opcji. Nazwa, ilość i Lp. opisują jedno i to samo okno,
   *  więc idą do szkieletu i rozchodzą się na wszystkie opcje. Materiał, cena
   *  i koszt są tym, czym opcje się różnią, więc zostają przy otwartej opcji.
   *  Specyfikacja dzieli się po wierszach — rozstrzyga o tym `applyOptionSpec`. */
  const zmienWGrupieOpcji = (g: OfferGroup, ii: number, patch: Partial<OfferItem>): OfferGroup => {
    const biezaca = biezacaOpcja(g);
    if (!biezaca) return g;

    const doSzkieletu: Partial<OfferItem> = {};
    const doOpcji: Partial<OfferItem> = {};
    for (const klucz of Object.keys(patch) as (keyof OfferItem)[]) {
      if (WSPOLNE_POLA.includes(klucz)) (doSzkieletu as Record<string, unknown>)[klucz] = patch[klucz];
      else (doOpcji as Record<string, unknown>)[klucz] = patch[klucz];
    }
    if ('spec' in patch) doSzkieletu.spec = applyOptionSpec(g.items[ii], patch.spec || []);

    const items = g.items.map((it, j) => (j === ii ? { ...it, ...doSzkieletu } : it));
    const options = (g.options || []).map((o) =>
      o.id !== biezaca.id
        ? o
        : { ...o, items: o.items.map((it, j) => (j === ii ? poPoprawce(it, doOpcji, items[ii]) : it)) }
    );
    const zmieniona = syncOptions({ ...g, items, options });
    if (!('name' in patch)) return zmieniona;

    // Szablon parametrów produktu zakładamy tam, gdzie produkt faktycznie
    // mieszka: przy wspólnej nazwie na szkielecie, żeby rubryki („Kolor
    // kasety”) miały wszystkie opcje; przy różnych produktach — tylko przy
    // tej opcji, bo to jej produkt.
    const wspolna = commonName(zmieniona, ii);
    const wzorzec = wspolna
      ? { ...zmieniona.items[ii], name: wspolna }
      : zmieniona.options!.find((o) => o.id === biezaca.id)!.items[ii];
    const szablon = autoSpecFor(wzorzec, state.settings);
    if (!szablon) return zmieniona;
    if (wspolna) {
      return syncOptions({
        ...zmieniona,
        items: zmieniona.items.map((it, j) => (j === ii ? { ...it, spec: szablon } : it))
      });
    }
    return syncOptions({
      ...zmieniona,
      options: zmieniona.options!.map((o) =>
        o.id !== biezaca.id
          ? o
          : { ...o, items: o.items.map((it, j) => (j === ii ? { ...it, spec: szablon } : it)) }
      )
    });
  };

  const setItem = (gi: number, ii: number, patch: Partial<OfferItem>) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => {
        if (i !== gi) return g;
        if (isOptionGroup(g)) return zmienWGrupieOpcji(g, ii, patch);
        return { ...g, items: g.items.map((it, j) => (j === ii ? poPoprawce(it, patch) : it)) };
      })
    }));

  // Wiersz dodany albo usunięty musi wejść do każdej opcji naraz — tabela
  // porównawcza bez zgodnych wierszy porównywałaby salon z sypialnią.
  const addItem = (gi: number) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => (i === gi ? syncOptions({ ...g, items: [...g.items, EMPTY_ITEM()] }) : g))
    }));

  const removeItem = (gi: number, ii: number) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => {
        if (i !== gi) return g;
        const items = g.items.filter((_, j) => j !== ii);
        return syncOptions({ ...g, items: items.length ? items : [EMPTY_ITEM()] });
      })
    }));

  const addGroup = () => setOffer((o) => ({ ...o, groups: [...o.groups, NEW_GROUP()] }));

  /* ------------------------------- opcje ------------------------------- */

  const addOptionGroup = () =>
    setOffer((o) => {
      const nowa = toOptionGroup(NEW_GROUP(o.groups[o.groups.length - 1]?.header || 'material'));
      return { ...o, groups: [...o.groups, nowa] };
    });

  /** Zamiana zwykłej tabeli w grupę opcji i z powrotem. Przy zwijaniu zostaje
   *  wybrana opcja — reszta była propozycją, nie zamówieniem. */
  const przelaczOpcje = (gi: number) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => (i === gi ? (isOptionGroup(g) ? toPlainGroup(g) : toOptionGroup(g)) : g))
    }));

  const addOption = (gi: number) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => {
        if (i !== gi || !isOptionGroup(g)) return g;
        const dodana = newOption(g);
        setOtwartaOpcja((x) => ({ ...x, [g.id]: dodana.id }));
        return syncOptions({ ...g, options: [...(g.options || []), dodana] });
      })
    }));

  const removeOption = (gi: number, id: string) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) => {
        if (i !== gi || !isOptionGroup(g)) return g;
        const zostaja = (g.options || []).filter((x) => x.id !== id);
        // ostatnia opcja znika razem z całą grupą opcji — zostaje zwykła tabela
        if (!zostaja.length) return toPlainGroup(g);
        return syncOptions({
          ...g,
          options: zostaja,
          selectedOptionId: g.selectedOptionId === id ? undefined : g.selectedOptionId
        });
      })
    }));

  const setOption = (gi: number, id: string, patch: { title?: string }) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) =>
        i === gi && isOptionGroup(g)
          ? { ...g, options: (g.options || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }
          : g
      )
    }));

  /** Wskazanie opcji, którą klient wybrał: wchodzi do ceny całkowitej i idzie
   *  dalej do produkcji oraz na WZ. Ponowne kliknięcie cofa wybór. */
  const wybierzOpcje = (gi: number, id: string) =>
    setOffer((o) => ({
      ...o,
      groups: o.groups.map((g, i) =>
        i === gi ? { ...g, selectedOptionId: g.selectedOptionId === id ? undefined : id } : g
      )
    }));

  /* ------------------------------- rabaty ------------------------------- */

  // Produkty, które faktycznie stoją w tej wycenie — po nich ustawia się
  // stawki, zamiast wpisywać nazwy z pamięci.
  const produktyWyceny = offerProducts(offer);

  /** Stawka wpisana wprost dla tej nazwy produktu, albo nic. */
  const stawkaProduktu = (nazwa: string): OfferDiscountRule | undefined =>
    (offer.discountRules || []).find((r) => normalizujNazwe(r.name) === normalizujNazwe(nazwa));

  /** Ustawia albo zdejmuje stawkę produktu. `null` oddaje go rabatowi
   *  podstawowemu — to co innego niż stawka „0”, która rabat wyłącza. */
  const ustawStawke = (nazwa: string, procent: string | null) =>
    setOffer((o) => {
      const reszta = (o.discountRules || []).filter(
        (r) => normalizujNazwe(r.name) !== normalizujNazwe(nazwa)
      );
      return {
        ...o,
        discountRules: procent === null ? reszta : [...reszta, { id: uid(), name: nazwa, percent: procent }]
      };
    });

  const maWarianty = offer.groups.some((g) => g.variant);
  const konwertujWarianty = async () => {
    if (
      !(await askConfirm(
        'Zamienić warianty alternatywne na grupę opcji? Każdy wariant stanie się opcją, ' +
          'a przy każdej stanie pełna cena oferty. Oferty już wysłanych to nie dotyczy — ' +
          'zmiana obejmuje tylko tę, którą masz otwartą, i zapisze się dopiero przy zapisie.',
        { confirmLabel: 'Zamień na opcje' }
      ))
    ) {
      return;
    }
    setOffer((o) => optionsFromVariants(o));
    toast('Warianty zamienione na grupę opcji. Sprawdź nazwy i ceny przed wysłaniem.');
  };
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
      seq: offer.seq || numerOferty.seq,
      number: offer.number || numerOferty.number,
      client: offer.client.trim(),
      clientEmail: offer.clientEmail.trim(),
      issuedBy: offer.issuedBy.trim(),
      issuedByPhone: String(offer.issuedByPhone || '').trim(),
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

  /** Oferta → zlecenie produkcyjne. Zapisujemy najpierw, bo zlecenie ma
   *  wskazywać ofertę, a ta bez zapisu nie ma jeszcze numeru. */
  const handleProduce = async () => {
    const z = await saveOffer();
    if (z) onProduce(z);
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
          <span className="doc-number-label">{offer.number || numerOferty.number}</span>
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
            <select
              className="input"
              data-testid="offer-issuer"
              value={offer.issuedBy}
              onChange={(e) =>
                // zmiana osoby podstawia jej numer — wpisany ręcznie zostaje przy ofercie
                set({ issuedBy: e.target.value, issuedByPhone: issuerPhone(state, e.target.value) })
              }
            >
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
          <label className="field">
            <span>Telefon wystawiającego</span>
            <input
              type="text"
              className="input"
              data-testid="offer-issuer-phone"
              placeholder={issuerPhone(state, offer.issuedBy) || 'np. 511 697 697'}
              value={offer.issuedByPhone || ''}
              onChange={(e) => set({ issuedByPhone: e.target.value })}
            />
            <span className="muted field-hint">
              Podstawia się z osoby wybranej powyżej; numery przypiszesz w Ustawieniach. Drukuje się
              pod nazwiskiem na ofercie. Puste pole pomija ten wiersz.
            </span>
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
            <span>Adres odbiorcy</span>
            <input
              type="text"
              className="input"
              data-testid="offer-client-address"
              placeholder="np. ul. Długa 118/4, 18-300 Zambrów"
              value={offer.clientAddress || ''}
              onChange={(e) => set({ clientAddress: e.target.value })}
            />
            <span className="muted field-hint">Drukuje się pod nazwą. Puste pole pomija ten wiersz.</span>
          </label>
          <label className="field">
            <span>NIP odbiorcy</span>
            <input
              type="text"
              className="input"
              data-testid="offer-client-nip"
              placeholder="tylko dla firm"
              value={offer.clientNip || ''}
              onChange={(e) => set({ clientNip: e.target.value })}
            />
            <label className="field" style={{ marginTop: 8 }}>
              <span>Weź dane z kartoteki</span>
              <select
                className="input"
                data-testid="offer-client-from-book"
                value=""
                onChange={(e) => {
                  const k = state.contractors.find((c) => c.id === e.target.value);
                  if (!k) return;
                  set({
                    client: k.name,
                    clientAddress: k.address || '',
                    clientNip: k.nip || '',
                    clientEmail: k.email || offer.clientEmail
                  });
                }}
              >
                <option value="">— wybierz kontrahenta —</option>
                {state.contractors.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
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

      {/* Nazwy parametrów, które wracają na większości ofert — podpowiedź
          oszczędza wpisywania i pilnuje, żeby na dokumencie brzmiały tak samo. */}
      <datalist id="podpowiedzi-specyfikacji">
        {[
          'Szerokość całkowita',
          'Wysokość całkowita',
          'Kolor kasety',
          'Kolor prowadnic',
          'Kolor materiału',
          'Kolor listwy końcowej',
          'Typ prowadnic',
          'Typ montażu',
          'Strona sterowania',
          'Napęd',
          'Typ napędu',
          'Sterowanie',
          'Wysokość kasety',
          'Moskitiera',
          'Wariant wykonania'
        ].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {offer.groups.map((g, gi) => {
        const opcyjna = isOptionGroup(g);
        const opcje = g.options || [];
        const biezaca = opcyjna ? biezacaOpcja(g) : null;
        const pozycje = pozycjeGrupy(g);
        const wyceny = sumy.optionGroups.find((x) => x.groupId === g.id);
        return (
        <div className={`card${opcyjna ? ' group-options' : ''}`} key={g.id} data-testid={`offer-group-${gi}`}>
          <div className="group-head">
            <div className="group-head-top">
              <h3 className="card-title">
                {g.variant ? variantLetter(offer.groups, gi) : opcyjna ? `Opcje — tabela ${gi + 1}` : `Tabela ${gi + 1}`}
                {g.variant && <span className="group-tag">wyceniany osobno</span>}
                {opcyjna && <span className="group-tag">do wyboru, nie sumują się</span>}
              </h3>
              <span className="spacer" />
              <button
                className="btn btn-small btn-light"
                data-testid={`offer-group-options-${gi}`}
                title={
                  opcyjna
                    ? 'Zostanie wybrana opcja, reszta zniknie'
                    : 'Zamień tę tabelę w zestaw alternatyw do porównania'
                }
                onClick={() => przelaczOpcje(gi)}
              >
                <Columns3 className="icon" />
                {opcyjna ? 'Zwiń do zwykłej tabeli' : 'Zamień na opcje'}
              </button>
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
            {/* Stary mechanizm wariantów: pokazujemy go tylko tam, gdzie już
                działa, żeby nowe oferty nie miały dwóch podobnych funkcji obok
                siebie. Wyłączyć wolno zawsze, włączyć — już nie. */}
            {g.variant && (
              <label className="checkbox-field group-variant-check">
                <input
                  type="checkbox"
                  data-testid={`offer-group-variant-${gi}`}
                  checked
                  onChange={() => setGroup(gi, { variant: false })}
                />
                <span>Wariant alternatywny (poza ceną całkowitą)</span>
              </label>
            )}
            </div>
          </div>

          {opcyjna && (
            <div className="options-bar" data-testid={`offer-options-bar-${gi}`}>
              <div className="options-tabs" role="tablist" aria-label="Opcje do wyboru">
                {opcje.map((o, oi) => {
                  const kwota = wyceny?.options.find((x) => x.id === o.id);
                  return (
                    <button
                      key={o.id}
                      role="tab"
                      aria-selected={o.id === biezaca?.id}
                      className={`option-tab${o.id === biezaca?.id ? ' is-active' : ''}${
                        o.id === g.selectedOptionId ? ' is-chosen' : ''
                      }`}
                      data-testid={`offer-option-tab-${gi}-${oi}`}
                      onClick={() => setOtwartaOpcja((x) => ({ ...x, [g.id]: o.id }))}
                    >
                      <span className="option-tab-name">{optionLabel(o, oi)}</span>
                      <span className="option-tab-sum">{kwota ? formatMoney(kwota.total) : '—'}</span>
                    </button>
                  );
                })}
                <button
                  className="btn btn-small btn-light option-add"
                  data-testid={`offer-option-add-${gi}`}
                  onClick={() => addOption(gi)}
                >
                  <Plus className="icon" />
                  Dodaj opcję
                </button>
              </div>

              {biezaca && (
                <div className="option-head">
                  <label className="field option-title-field">
                    <span>Nazwa opcji</span>
                    <input
                      type="text"
                      className="input"
                      data-testid={`offer-option-title-${gi}`}
                      placeholder={optionLabel({ ...biezaca, title: '' }, opcje.indexOf(biezaca))}
                      value={biezaca.title || ''}
                      onChange={(e) => setOption(gi, biezaca.id, { title: e.target.value })}
                    />
                    <span className="muted field-hint">
                      Trafia do nagłówka kolumny na ofercie, np. „materiał zaciemniający”.
                    </span>
                  </label>
                  <div className="option-head-actions">
                    <button
                      className={`btn btn-small${g.selectedOptionId === biezaca.id ? '' : ' btn-light'}`}
                      data-testid={`offer-option-choose-${gi}`}
                      title={
                        g.selectedOptionId === biezaca.id
                          ? 'Cofnij wybór — wróci do porównania bez wskazanej opcji'
                          : 'Ta opcja wejdzie do ceny całkowitej i pójdzie do produkcji oraz na WZ'
                      }
                      onClick={() => wybierzOpcje(gi, biezaca.id)}
                    >
                      <CheckCircle2 className="icon" />
                      {g.selectedOptionId === biezaca.id ? 'Wybrana przez klienta' : 'Zaznacz jako wybraną'}
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      data-testid={`offer-option-remove-${gi}`}
                      onClick={() => removeOption(gi, biezaca.id)}
                    >
                      <X className="icon" />
                      Usuń opcję
                    </button>
                  </div>
                </div>
              )}
              <p className="muted card-note options-note">
                <strong>Wspólne dla wszystkich opcji:</strong> ilość, numer pozycji i wymiar —
                wpisujesz je raz, w dowolnej zakładce.{' '}
                <strong>Własne dla tej opcji:</strong> nazwa produktu, materiał i cena. Dzięki temu
                opcje mogą być różnymi produktami, np. moskitiera przesuwna obok plisowanej.
              </p>
            </div>
          )}

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
              {pozycje.map((it, ii) => (
                <tr key={ii}>
                  <td>
                    <input
                      type="text"
                      className={`input item-lp-input num${opcyjna ? ' pole-wspolne' : ''}`}
                      data-testid={`offer-lp-${gi}-${ii}`} inputMode="numeric"
                      title={opcyjna ? 'Wspólny dla wszystkich opcji' : undefined}
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
                      aria-label={opcyjna ? 'Nazwa produktu w tej opcji' : 'Nazwa produktu'}
                      list="podpowiedzi-produktow"
                      placeholder={
                        opcyjna ? 'produkt w tej opcji, np. Moskitiera przesuwna' : 'np. Rolety wolnowiszące FI32'
                      }
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
                    {(() => {
                      const spec = it.spec || [];
                      const zmien = (lista: { label: string; value: string }[]) =>
                        setItem(gi, ii, { spec: lista });
                      return (
                        <details className="item-spec" open={spec.length > 0}>
                          <summary data-testid={`offer-spec-${gi}-${ii}`}>
                            <span className="spec-title">
                              Specyfikacja{spec.length ? ` (${spec.length})` : ''}
                            </span>
                            {/* Kopiuj i wklej siedzą w nagłówku, a nie w środku: przy zwiniętej
                                sekcji i tak widać, co można przenieść, i nie trzeba jej rozwijać. */}
                            {filledSpec(spec).length > 0 && (
                              <button
                                className="btn btn-small btn-light spec-btn"
                                data-testid={`offer-spec-copy-${gi}-${ii}`}
                                title="Skopiuj tę specyfikację, żeby wstawić ją w innej pozycji"
                                onClick={(e) => {
                                  e.preventDefault();
                                  kopiujSpec(spec);
                                }}
                              >
                                <Copy className="icon" />
                                Kopiuj
                              </button>
                            )}
                            {(() => {
                              const szablon = matchSpecTemplate(it, state.settings.specTemplates);
                              if (!szablon) return null;
                              return (
                                <button
                                  className="btn btn-small btn-light spec-btn"
                                  data-testid={`offer-spec-template-${gi}-${ii}`}
                                  title={`Wstawi specyfikację zapisaną dla „${szablon.name}", zastępując obecne wiersze`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const wiersze = uzyteczneWiersze(szablon);
                                    zmien(wiersze);
                                    toast(`Wstawiono szablon „${szablon.name}": ${wierszyOdmiana(wiersze.length)}.`);
                                  }}
                                >
                                  <FileText className="icon" />
                                  Szablon
                                </button>
                              );
                            })()}
                            {!!schowekSpec?.length && (
                              <button
                                className="btn btn-small btn-light spec-btn"
                                data-testid={`offer-spec-paste-${gi}-${ii}`}
                                title={
                                  filledSpec(spec).length
                                    ? 'Zastąpi specyfikację tej pozycji tym, co w schowku'
                                    : 'Wstawi skopiowaną specyfikację do tej pozycji'
                                }
                                onClick={(e) => {
                                  e.preventDefault();
                                  zmien(schowekSpec.map((w) => ({ ...w })));
                                  toast(`Wstawiono specyfikację: ${wierszyOdmiana(schowekSpec.length)}.`);
                                }}
                              >
                                <ClipboardPaste className="icon" />
                                {filledSpec(spec).length ? 'Zastąp' : 'Wklej'}
                              </button>
                            )}
                          </summary>
                          {spec.map((w, si) => (
                            <div className="spec-row" key={si}>
                              <input
                                type="text"
                                className="input"
                                data-testid={`offer-spec-label-${gi}-${ii}-${si}`}
                                aria-label="Co"
                                list="podpowiedzi-specyfikacji"
                                placeholder="np. Kolor kasety"
                                value={w.label}
                                onChange={(e) =>
                                  zmien(spec.map((x, k) => (k === si ? { ...x, label: e.target.value } : x)))
                                }
                              />
                              <input
                                type="text"
                                className="input"
                                data-testid={`offer-spec-value-${gi}-${ii}-${si}`}
                                aria-label="Jakie"
                                placeholder="np. RAL 9005"
                                value={w.value}
                                onChange={(e) =>
                                  zmien(spec.map((x, k) => (k === si ? { ...x, value: e.target.value } : x)))
                                }
                              />
                              <div className="spec-row-actions">
                                {/* Kolejność wierszy to kolejność na dokumencie — wymiar
                                    u góry, drobiazgi niżej — więc da się ją ułożyć. */}
                                <button
                                  className="btn btn-small btn-light item-remove"
                                  data-testid={`offer-spec-up-${gi}-${ii}-${si}`}
                                  aria-label="Przesuń wiersz wyżej"
                                  title="Przesuń wyżej"
                                  disabled={si === 0}
                                  onClick={() => zmien(movedBy(spec, si, -1))}
                                >
                                  <ChevronUp className="icon" />
                                </button>
                                <button
                                  className="btn btn-small btn-light item-remove"
                                  data-testid={`offer-spec-down-${gi}-${ii}-${si}`}
                                  aria-label="Przesuń wiersz niżej"
                                  title="Przesuń niżej"
                                  disabled={si === spec.length - 1}
                                  onClick={() => zmien(movedBy(spec, si, 1))}
                                >
                                  <ChevronDown className="icon" />
                                </button>
                                <button
                                  className="btn btn-small btn-danger item-remove"
                                  data-testid={`offer-spec-remove-${gi}-${ii}-${si}`}
                                  aria-label="Usuń wiersz specyfikacji"
                                  onClick={() => zmien(spec.filter((_, k) => k !== si))}
                                >
                                  <X className="icon" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            className="btn btn-small btn-light"
                            data-testid={`offer-spec-add-${gi}-${ii}`}
                            onClick={() => zmien([...spec, { label: '', value: '' }])}
                          >
                            <Plus className="icon" />
                            Dodaj wiersz
                          </button>
                        </details>
                      );
                    })()}
                    {!isItemEmpty(it) && (() => {
                      const wycena = priceItem(it, tabeleCennika);
                      const doplaty = wycena.table?.surcharges || [];
                      const wymiar = itemDimensions(it);
                      const wybrane = it.surcharges || [];
                      return (
                        <div className="item-cennik" data-testid={`offer-cennik-${gi}-${ii}`}>
                          <span className={wycena.status === 'ok' ? 'cennik-ok' : 'cennik-brak'}>
                            {opiszWycene(wycena)}
                          </span>
                          {/* Wycena idzie z pól specyfikacji, a na dokumencie zostaje opis
                              pozycji — niezgodność trzeba pokazać, zanim klient dostanie
                              cenę niepasującą do wymiaru, który u siebie przeczyta. */}
                          {(() => {
                            const spor = dimensionConflict(it);
                            if (!spor) return null;
                            return (
                              <div className="cennik-brak" data-testid={`offer-wymiar-spor-${gi}-${ii}`}>
                                Wymiar w opisie ({spor.zOpisu.width} × {spor.zOpisu.height} cm) nie zgadza się
                                ze specyfikacją ({spor.zPol.width} × {spor.zPol.height} cm). Liczymy ze
                                specyfikacji.
                              </div>
                            );
                          })()}
                          {doplaty.length > 0 && (
                            <details className="cennik-doplaty">
                              <summary data-testid={`offer-doplaty-${gi}-${ii}`}>
                                Dopłaty{wybrane.length ? ` (${wybrane.length})` : ''}
                              </summary>
                              {doplaty.map((d, di) => {
                                const kwota = surchargeAmount(d, wymiar, parseNumber(it.unitPrice));
                                const zaznaczona = wybrane.some((x) => x.name === d.name);
                                return (
                                  <label className="checkbox-field cennik-doplata" key={d.name}>
                                    <input
                                      type="checkbox"
                                      data-testid={`offer-doplata-${gi}-${ii}-${di}`}
                                      checked={zaznaczona}
                                      disabled={kwota === null}
                                      onChange={(e) =>
                                        setItem(gi, ii, {
                                          surcharges: e.target.checked
                                            ? [...wybrane, { ...d, amount: kwota ?? 0 }]
                                            : wybrane.filter((x) => x.name !== d.name)
                                        })
                                      }
                                    />
                                    <span>
                                      {d.name}
                                      {' — '}
                                      {kwota === null ? 'poza tabelą' : `${formatMoney(kwota)}`}
                                    </span>
                                  </label>
                                );
                              })}
                            </details>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    {/* Ilość jest wspólna dla opcji — kreska u góry pola mówi
                        o tym bez czytania podpowiedzi nad tabelą. */}
                    <input
                      type="text"
                      className={`input num${opcyjna ? ' pole-wspolne' : ''}`}
                      data-testid={`offer-qty-${gi}-${ii}`}
                      inputMode="decimal"
                      aria-label={opcyjna ? 'Ilość — wspólna dla wszystkich opcji' : 'Ilość'}
                      title={opcyjna ? 'Wspólna dla wszystkich opcji' : undefined}
                      value={it.qty}
                      onChange={(e) => setItem(gi, ii, { qty: e.target.value })}
                    />
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
                      <div className="cost-cell">
                        <SuffixField
                          suffix="zł"
                          normalizuj
                          className="internal"
                          testId={`offer-cost-${gi}-${ii}`}
                          ariaLabel="Koszt własny za sztukę"
                          value={it.cost || ''}
                          onChange={(v) => setItem(gi, ii, { cost: v })}
                        />
                        <button
                          className="btn btn-small btn-light cost-pick"
                          data-testid={`offer-cost-pick-${gi}-${ii}`}
                          title="Weź cenę z cennika producenta"
                          aria-label="Weź cenę z cennika producenta"
                          onClick={() => setWybieraczka({ gi, ii })}
                        >
                          <Table2 className="icon" />
                        </button>
                      </div>
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
        );
      })}

      <div className="actions-bar" style={{ marginBottom: 4 }}>
        <button className="btn" data-testid="offer-add-group" onClick={addGroup}>
          <Layers className="icon" />
          Dodaj tabelę
        </button>
        <button
          className="btn"
          data-testid="offer-add-options"
          onClick={addOptionGroup}
          title="Kilka wersji tej samej pozycji obok siebie — klient porównuje ceny całkowite"
        >
          <Columns3 className="icon" />
          Dodaj opcje do wyboru
        </button>
        {/* Stare warianty da się przenieść na nowy mechanizm, ale tylko ręcznie:
            oferta już wysłana ma drukować się dokładnie tak, jak ją wysłano. */}
        {maWarianty && (
          <button
            className="btn btn-light"
            data-testid="offer-convert-variants"
            onClick={() => void konwertujWarianty()}
            title="Każdy wariant stanie się opcją z pełną ceną oferty"
          >
            <GitCompareArrows className="icon" />
            Zamień warianty na opcje
          </button>
        )}
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
          {sumy.discounts.map((l) => (
            <div key={l.percent} data-testid={`offer-discount-line-${l.percent}`}>
              Rabat {l.percent.toLocaleString('pl-PL')}%{' '}
              {sumy.discounts.length > 1 && <span className="muted">od {formatMoney(l.base)}</span>}:{' '}
              <strong>−{formatMoney(l.amount)}</strong>
            </div>
          ))}
          <div className="offer-summary-total">
            {sumy.variants.length
              ? 'Cena całkowita oferty podstawowej'
              : sumy.optionGroups.length
                ? 'Cena całkowita z zaznaczonymi opcjami'
                : 'Cena całkowita'}
            : <strong>{formatMoney(sumy.total)}</strong>
          </div>
          {sumy.variants.map((w) => (
            <div key={w.id} data-testid={`offer-variant-total-${w.id}`}>
              {w.label}: <strong>{formatMoney(w.total)}</strong>
            </div>
          ))}
          {/* Przy każdej opcji stoi cena całej oferty, bo to ona jest decyzją —
              kwota samej opcji nic klientowi nie mówi o tym, ile zapłaci. */}
          {sumy.optionGroups.map((grupa) => (
            <div className="offer-option-totals" key={grupa.groupId} data-testid={`offer-option-totals-${grupa.groupId}`}>
              <div className="muted">{grupa.label || 'Opcje do wyboru'}:</div>
              {grupa.options.map((w) => (
                <div
                  key={w.id}
                  className={w.selected && grupa.chosen ? 'offer-option-row is-chosen' : 'offer-option-row'}
                  data-testid={`offer-option-total-${w.id}`}
                >
                  <span>{w.label}</span>
                  <strong>{formatMoney(w.total)}</strong>
                  {w.diff > 0 && <span className="muted offer-option-diff">+{formatMoney(w.diff)}</span>}
                  {w.selected && grupa.chosen && (
                    <span className="internal-badge">
                      <CheckCircle2 className="icon" />
                      wybrana
                    </span>
                  )}
                </div>
              ))}
              {!grupa.chosen && (
                <div className="muted offer-option-hint">
                  Nikt jeszcze nie wskazał opcji — liczymy pierwszą i nie zaznaczamy jej na dokumencie.
                </div>
              )}
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
                data-testid="offer-vat-breakdown"
                checked={!!offer.vatBreakdown}
                onChange={(e) => set({ vatBreakdown: e.target.checked })}
              />
              <span>Pokaż rozbicie na netto i VAT</span>
            </label>
            <label className="field">
              <span>Stawka VAT</span>
              <select
                className="input"
                data-testid="offer-vat-rate"
                value={offerVatRate(offer)}
                onChange={(e) => set({ vatRate: Number(e.target.value) })}
              >
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}%{r === 8 ? ' — montaż w budownictwie mieszkaniowym' : ''}
                  </option>
                ))}
              </select>
              <span className="muted field-hint">
                Ceny są brutto, netto liczone wstecz. 8% przy dostawie z montażem w mieszkaniu lub domu,
                23% poza budownictwem mieszkaniowym i bez montażu.
              </span>
            </label>
          </div>
        </div>

        <div className="switch-row">
          <div className="switch-col">
            <label className="checkbox-field">
              <input
                type="checkbox"
                data-testid="offer-show-photos"
                checked={!!offer.showPhotos}
                onChange={(e) => set({ showPhotos: e.target.checked })}
              />
              <span>Drukuj zdjęcia produktów</span>
            </label>
            <span className="muted field-hint" data-testid="offer-photos-hint">
              {!bibliotekaZdjec.length
                ? 'Biblioteka zdjęć jest pusta — dodaj je w Ustawieniach.'
                : zZdjeciem === 0
                  ? 'Żadna pozycja nie ma dopasowanego zdjęcia. Sprawdź nazwy wpisów w Ustawieniach.'
                  : `Zdjęcie znajdzie ${zZdjeciem} z ${wszystkieP} pozycji.`}
            </span>
          </div>
          <div className="switch-col">
            <label className="checkbox-field">
              <input
                type="checkbox"
                data-testid="offer-show-specs"
                checked={!!offer.showSpecs}
                onChange={(e) => set({ showSpecs: e.target.checked })}
              />
              <span>Drukuj specyfikację pozycji</span>
            </label>
            <span className="muted field-hint" data-testid="offer-specs-hint">
              {zeSpecyfikacja === 0
                ? 'Żadna pozycja nie ma jeszcze wypełnionej specyfikacji — rozwiń ją pod pozycją.'
                : `Specyfikację ma ${zeSpecyfikacja} z ${wszystkieP} pozycji.`}
            </span>
          </div>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Uwagi na ofercie</span>
          <textarea className="input" data-testid="offer-notes" rows={3} value={offer.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>

      {/* ---------- Rabaty ---------- */}
      <div className="card" data-testid="offer-discounts">
        <h3 className="card-title">Rabaty</h3>
        <p className="muted card-note">
          Stawkę ustawiasz przy produkcie, który stoi w tej wycenie — rolety mogą zejść o 10%,
          żaluzje drewniane o 5%, a moskitiery wcale. Produkt bez własnej stawki dostaje rabat
          podstawowy. Na dokumencie rabaty nie stoją przy pozycjach: w podsumowaniu jest osobna
          linia dla każdej stawki, więc klient widzi, co po ile dostał.
        </p>

        <label className="checkbox-field">
          <input
            type="checkbox"
            data-testid="offer-discount-enabled"
            checked={offer.discountEnabled}
            onChange={(e) => set({ discountEnabled: e.target.checked })}
          />
          <span>Udzielam rabatu na tej ofercie</span>
        </label>

        {offer.discountEnabled && (
          <>
            <label className="field discount-base">
              <span>Rabat podstawowy</span>
              <SuffixField
                suffix="%"
                testId="offer-discount-percent"
                ariaLabel="Rabat podstawowy w procentach"
                value={offer.discountPercent}
                onChange={(v) => set({ discountPercent: v })}
              />
              <span className="muted field-hint">
                Dla produktów, którym nie ustawisz własnej stawki niżej.
              </span>
            </label>

            {produktyWyceny.length === 0 ? (
              <p className="muted employees-empty" data-testid="discount-products-empty">
                Wpisz najpierw pozycje z cenami — wtedy pojawią się tu produkty do ustawienia stawek.
              </p>
            ) : (
              <table className="table items-table" data-testid="discount-products">
                <thead>
                  <tr>
                    <th>Produkt w tej wycenie</th>
                    <th style={{ width: 120 }} className="th-num">Wartość</th>
                    <th style={{ width: 150 }}>Podlega rabatowi</th>
                    <th style={{ width: 130 }} className="th-num">Stawka</th>
                  </tr>
                </thead>
                <tbody>
                  {produktyWyceny.map((prod, i) => {
                    const wlasna = stawkaProduktu(prod.name);
                    const wzorzec = { name: prod.name, material: '', qty: '1', unitPrice: '' } as OfferItem;
                    const stawka = itemDiscountPercent(wzorzec, offer);
                    const skad = discountSource(wzorzec, offer);
                    return (
                      <tr key={prod.name} data-testid={`discount-row-${i}`}>
                        <td>
                          <span className="discount-product">{prod.name}</span>
                          <span className="muted discount-where">
                            {prod.count > 1 ? `${prod.count} pozycje · ` : ''}
                            {prod.where.join(' · ')}
                          </span>
                        </td>
                        <td className="num">{formatMoney(prod.sum)}</td>
                        <td>
                          <label className="checkbox-field">
                            <input
                              type="checkbox"
                              data-testid={`discount-on-${i}`}
                              checked={stawka > 0}
                              onChange={(e) =>
                                ustawStawke(prod.name, e.target.checked ? null : '0')
                              }
                            />
                            <span>{stawka > 0 ? 'tak' : 'bez rabatu'}</span>
                          </label>
                        </td>
                        <td>
                          <SuffixField
                            suffix="%"
                            testId={`discount-percent-${i}`}
                            ariaLabel={`Rabat dla produktu ${prod.name}`}
                            placeholder={skad === 'produkt' ? '' : String(stawka)}
                            value={wlasna ? wlasna.percent : ''}
                            onChange={(v) => ustawStawke(prod.name, v.trim() === '' ? null : v)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="offer-summary-box" data-testid="discount-summary">
              {sumy.discounts.length === 0 ? (
                <div className="muted">Przy obecnych stawkach rabat nie zmniejsza ceny.</div>
              ) : (
                sumy.discounts.map((l) => (
                  <div key={l.percent}>
                    Rabat {l.percent.toLocaleString('pl-PL')}% od {formatMoney(l.base)}:{' '}
                    <strong>−{formatMoney(l.amount)}</strong>
                  </div>
                ))
              )}
              <div className="offer-summary-total">
                Rabat razem: <strong>−{formatMoney(sumy.discountAmount)}</strong>
              </div>
            </div>
          </>
        )}
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
        <button
          className="btn"
          data-testid="offer-produce-btn"
          onClick={handleProduce}
          title="Załóż zlecenie produkcyjne na podstawie tej oferty"
        >
          <Factory className="icon" />
          Zleć do produkcji
        </button>
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
      {wybieraczka && (() => {
        const grupa = offer.groups[wybieraczka.gi];
        const szkielet = grupa?.items[wybieraczka.ii];
        if (!szkielet) return null;
        // W grupie opcji tabelę cennika wybiera się po pełnym opisie: wymiar
        // siedzi w szkielecie, a materiał w otwartej opcji.
        const wOpcji = isOptionGroup(grupa) ? biezacaOpcja(grupa)?.items[wybieraczka.ii] : null;
        const poz = wOpcji ? fullOptionItem(szkielet, wOpcji) : szkielet;
        return (
          <PricePicker
            item={poz}
            onClose={() => setWybieraczka(null)}
            onPick={(kwota) => {
              setItem(wybieraczka.gi, wybieraczka.ii, { cost: String(kwota) });
              setWybieraczka(null);
            }}
          />
        );
      })()}
    </section>
  );
}
