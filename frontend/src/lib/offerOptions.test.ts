import {
  applyOptionSpec,
  commonName,
  fullOptionItem,
  isOptionGroup,
  newOption,
  optionChosen,
  optionLabel,
  optionsFromVariants,
  optionSum,
  selectedItems,
  selectedOption,
  syncOptions,
  toOptionGroup,
  toPlainGroup
} from './offerOptions';
import { offerCosts, offerTotals } from './offers';
import { wzPrefillFromOffer } from './offerToWz';
import { orderFromOffer } from './production';
import { Offer, OfferGroup, OfferItem } from '../types';

const poz = (p: Partial<OfferItem> = {}): OfferItem => ({
  name: 'Roleta',
  material: '',
  qty: '1',
  unitPrice: '',
  ...p
});

const grupa = (p: Partial<OfferGroup> = {}): OfferGroup => ({
  id: 'g1',
  header: 'material',
  items: [poz()],
  ...p
});

const oferta = (groups: OfferGroup[], p: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    date: '2026-10-23',
    place: 'Łomianki',
    client: 'Klient',
    clientEmail: '',
    groups,
    continuousNumbering: true,
    discountEnabled: false,
    discountPercent: '',
    deliveryEnabled: false,
    deliveryPrice: '',
    installationIncluded: true,
    deadlineDays: '14',
    validityEnabled: false,
    validityDays: '30',
    notes: '',
    issuedBy: 'Sebastian',
    status: 'szkic',
    createdAt: '',
    updatedAt: '',
    ...p
  } as Offer);

/** Grupa opcji: dwie pozycje wspólne, dwie alternatywy z różnymi cenami. */
const zOpcjami = (p: Partial<OfferGroup> = {}): OfferGroup =>
  syncOptions(
    grupa({
      id: 'go',
      items: [poz({ name: 'Salon', material: '186 x 202 cm', qty: '2' }), poz({ name: 'Sypialnia', qty: '1' })],
      options: [
        {
          id: 'a',
          title: 'dzień-noc',
          items: [
            poz({ name: '', material: 'DN14', unitPrice: '400' }),
            poz({ name: '', material: 'DN14', unitPrice: '300' })
          ]
        },
        {
          id: 'b',
          title: 'zaciemniający',
          items: [
            poz({ name: '', material: 'BL22', unitPrice: '500' }),
            poz({ name: '', material: 'BL22', unitPrice: '350' })
          ]
        }
      ],
      ...p
    })
  );

describe('rozpoznanie grupy opcji', () => {
  it('zwykła tabela to nie grupa opcji', () => {
    expect(isOptionGroup(grupa())).toBe(false);
    expect(isOptionGroup(grupa({ options: [] }))).toBe(false);
  });

  it('bez wskazania liczymy pierwszą opcję, ale nie udajemy decyzji klienta', () => {
    const g = zOpcjami();
    expect(selectedOption(g)?.id).toBe('a');
    expect(optionChosen(g)).toBe(false);
    expect(optionChosen(zOpcjami({ selectedOptionId: 'b' }))).toBe(true);
  });

  it('wskazanie nieistniejącej opcji nie wywraca wyceny', () => {
    const g = zOpcjami({ selectedOptionId: 'nie-ma' });
    expect(selectedOption(g)?.id).toBe('a');
    expect(optionChosen(g)).toBe(false);
  });

  it('opcja bez nazwy dostaje kolejną literę', () => {
    expect(optionLabel({ id: 'x', items: [] }, 0)).toBe('Opcja A');
    expect(optionLabel({ id: 'x', title: '  ', items: [] }, 2)).toBe('Opcja C');
    expect(optionLabel({ id: 'x', title: 'plisa', items: [] }, 1)).toBe('plisa');
  });
});

describe('zgodność opcji ze szkieletem', () => {
  it('opcja przejmuje ze szkieletu ilość i Lp.', () => {
    const g = syncOptions(
      grupa({
        items: [poz({ name: 'Salon', qty: '3', lpOverride: '7' })],
        options: [{ id: 'a', items: [poz({ name: '', qty: '9', unitPrice: '100' })] }]
      })
    );
    const it = g.options![0].items[0];
    expect(it.qty).toBe('3');
    expect(it.lpOverride).toBe('7');
    // materiał i cena są tym, czym opcja się różni — zostają jej
    expect(it.unitPrice).toBe('100');
  });

  it('opcja bez własnej nazwy bierze nazwę wspólną', () => {
    // wpisanie nazwy produktu raz ma wystarczyć, dopóki ktoś jej nie zmieni
    const g = syncOptions(
      grupa({
        items: [poz({ name: 'Roleta rzymska' })],
        options: [
          { id: 'a', items: [poz({ name: '', unitPrice: '100' })] },
          { id: 'b', items: [poz({ name: '', unitPrice: '200' })] }
        ]
      })
    );
    expect(g.options!.map((o) => o.items[0].name)).toEqual(['Roleta rzymska', 'Roleta rzymska']);
  });

  it('własna nazwa opcji nie jest nadpisywana nazwą innej opcji', () => {
    // opcje bywają różnymi produktami, a nie tym samym w innym materiale
    const g = syncOptions(
      grupa({
        items: [poz({ name: 'Moskitiera przesuwna' })],
        options: [
          { id: 'a', items: [poz({ name: 'Moskitiera przesuwna', unitPrice: '100' })] },
          { id: 'b', items: [poz({ name: 'Moskitiera plisowana', unitPrice: '200' })] }
        ]
      })
    );
    expect(g.options!.map((o) => o.items[0].name)).toEqual([
      'Moskitiera przesuwna',
      'Moskitiera plisowana'
    ]);
    // skoro produkty się różnią, nazwa przestaje opisywać wiersz
    expect(commonName(g, 0)).toBe('');
    expect(g.items[0].name).toBe('');
  });

  it('zgodne nazwy opcji wracają do opisu wiersza', () => {
    const g = syncOptions(
      grupa({
        items: [poz({ name: '' })],
        options: [
          { id: 'a', items: [poz({ name: 'Plisa Duette', unitPrice: '100' })] },
          { id: 'b', items: [poz({ name: 'Plisa Duette', unitPrice: '200' })] }
        ]
      })
    );
    expect(commonName(g, 0)).toBe('Plisa Duette');
    expect(g.items[0].name).toBe('Plisa Duette');
  });

  it('dodany wiersz szkieletu dopisuje się do każdej opcji', () => {
    const g = zOpcjami();
    const szerszy = syncOptions({ ...g, items: [...g.items, poz({ name: 'Kuchnia' })] });
    for (const o of szerszy.options!) {
      expect(o.items).toHaveLength(3);
      expect(o.items[2].name).toBe('Kuchnia');
    }
  });

  it('usunięty wiersz szkieletu znika ze wszystkich opcji', () => {
    const g = zOpcjami();
    const krotszy = syncOptions({ ...g, items: [g.items[0]] });
    for (const o of krotszy.options!) expect(o.items).toHaveLength(1);
  });

  it('wypełniony parametr szkieletu jest wspólny, pusty zostaje opcji', () => {
    // wymiar liczy cenę, więc musi być w każdej opcji taki sam;
    // kolor materiału jest właśnie tym, czym opcje się różnią
    const g = syncOptions(
      grupa({
        items: [poz({ spec: [{ label: 'Szerokość całkowita', value: '186' }, { label: 'Kolor', value: '' }] })],
        options: [
          { id: 'a', items: [poz({ spec: [{ label: 'Szerokość całkowita', value: '999' }, { label: 'Kolor', value: 'beż' }] })] },
          { id: 'b', items: [poz({ spec: [{ label: 'Kolor', value: 'grafit' }] })] }
        ]
      })
    );
    expect(g.options![0].items[0].spec).toEqual([
      { label: 'Szerokość całkowita', value: '186' },
      { label: 'Kolor', value: 'beż' }
    ]);
    expect(g.options![1].items[0].spec).toEqual([
      { label: 'Szerokość całkowita', value: '186' },
      { label: 'Kolor', value: 'grafit' }
    ]);
  });

  it('własny parametr opcji zostaje przy niej', () => {
    const g = syncOptions(
      grupa({
        items: [poz({ spec: [{ label: 'Szerokość', value: '186' }] })],
        options: [{ id: 'a', items: [poz({ spec: [{ label: 'Napęd', value: 'silnik' }] })] }]
      })
    );
    expect(g.options![0].items[0].spec).toEqual([
      { label: 'Szerokość', value: '186' },
      { label: 'Napęd', value: 'silnik' }
    ]);
  });

  it('pełny opis pozycji składa wymiar ze szkieletu z materiałem opcji', () => {
    const pelna = fullOptionItem(poz({ material: '186 x 202 cm' }), poz({ material: 'blackout BL22' }));
    expect(pelna.material).toBe('186 x 202 cm · blackout BL22');
    expect(fullOptionItem(poz({ material: '' }), poz({ material: 'BL22' })).material).toBe('BL22');
    expect(fullOptionItem(poz({ material: '186 cm' }), poz({ material: '' })).material).toBe('186 cm');
  });
});

describe('wycena opcji', () => {
  it('opcje nie sumują się ze sobą — w cenie całkowitej jest tylko wybrana', () => {
    const sumy = offerTotals(oferta([grupa({ items: [poz({ unitPrice: '1000' })] }), zOpcjami()]));
    // 1000 + opcja A (2×400 + 300 = 1100)
    expect(sumy.itemsSum).toBe(2100);
    expect(sumy.total).toBe(2100);
  });

  it('każda opcja dostaje pełną cenę całkowitą oferty, nie samą swoją kwotę', () => {
    const sumy = offerTotals(oferta([grupa({ items: [poz({ unitPrice: '1000' })] }), zOpcjami()]));
    const grupaOpcji = sumy.optionGroups[0];
    expect(grupaOpcji.options.map((o) => [o.label, o.sum, o.total])).toEqual([
      ['dzień-noc', 1100, 2100],
      ['zaciemniający', 1350, 2350]
    ]);
  });

  it('różnica liczy się od najtańszej opcji', () => {
    const sumy = offerTotals(oferta([zOpcjami()]));
    expect(sumy.optionGroups[0].options.map((o) => o.diff)).toEqual([0, 250]);
  });

  it('rabat obejmuje cenę każdej opcji tak samo jak cenę całkowitą', () => {
    const sumy = offerTotals(oferta([zOpcjami()], { discountEnabled: true, discountPercent: '10' }));
    expect(sumy.optionGroups[0].options.map((o) => o.total)).toEqual([990, 1215]);
    expect(sumy.total).toBe(990);
  });

  it('wskazana opcja wchodzi do ceny całkowitej', () => {
    const sumy = offerTotals(oferta([zOpcjami({ selectedOptionId: 'b' })]));
    expect(sumy.total).toBe(1350);
    expect(sumy.optionGroups[0].options.find((o) => o.selected)?.label).toBe('zaciemniający');
    expect(sumy.optionGroups[0].chosen).toBe(true);
  });

  it('dwie grupy opcji liczą się niezależnie', () => {
    const druga = { ...zOpcjami(), id: 'go2', selectedOptionId: 'b' };
    druga.options = druga.options!.map((o) => ({ ...o, id: o.id === 'a' ? 'c' : 'b' }));
    const sumy = offerTotals(oferta([zOpcjami(), druga]));
    // pierwsza grupa: opcja A (1100), druga: opcja B (1350)
    expect(sumy.total).toBe(2450);
    // przy wyborze opcji B w pierwszej grupie druga zostaje bez zmian
    expect(sumy.optionGroups[0].options.map((o) => o.total)).toEqual([2450, 2700]);
    expect(sumy.optionGroups).toHaveLength(2);
  });

  it('oferta bez opcji ma pustą listę i liczy się jak dotąd', () => {
    const sumy = offerTotals(oferta([grupa({ items: [poz({ unitPrice: '500' })] })]));
    expect(sumy.optionGroups).toEqual([]);
    expect(sumy.total).toBe(500);
  });

  it('kwota jednej opcji to suma jej pozycji', () => {
    expect(optionSum(zOpcjami().options![1])).toBe(1350);
  });

  it('marża liczy koszt wybranej opcji, a nie wszystkich naraz', () => {
    const g = zOpcjami({ selectedOptionId: 'b' });
    g.options = g.options!.map((o) => ({
      ...o,
      items: o.items.map((it) => ({ ...it, cost: o.id === 'a' ? '100' : '200' }))
    }));
    const koszty = offerCosts(oferta([g]));
    // opcja B: 2 szt. × 200 + 1 szt. × 200
    expect(koszty.costSum).toBe(600);
    expect(koszty.hasCosts).toBe(true);
  });
});

describe('zakładanie i zwijanie grupy opcji', () => {
  it('zamiana zwykłej tabeli zachowuje wpisaną robotę w pierwszej opcji', () => {
    const g = toOptionGroup(grupa({ items: [poz({ name: 'Salon', material: 'C102', unitPrice: '400', qty: '2' })] }));
    expect(isOptionGroup(g)).toBe(true);
    expect(g.options).toHaveLength(2);
    expect(g.options![0].items[0]).toMatchObject({ name: 'Salon', material: 'C102', unitPrice: '400', qty: '2' });
    // druga opcja jest pusta do uzupełnienia, ale ma już wspólne pola
    expect(g.options![1].items[0]).toMatchObject({ name: 'Salon', qty: '2', unitPrice: '' });
    // szkielet trzyma to, co wspólne — materiał i cena zeszły do opcji
    expect(g.items[0]).toMatchObject({ name: 'Salon', material: '', unitPrice: '' });
  });

  it('zwinięcie z powrotem zostawia wybraną opcję z pełnym opisem', () => {
    const plaska = toPlainGroup(zOpcjami({ selectedOptionId: 'b' }));
    expect(isOptionGroup(plaska)).toBe(false);
    expect(plaska.items).toHaveLength(2);
    expect(plaska.items[0]).toMatchObject({ name: 'Salon', material: '186 x 202 cm · BL22', unitPrice: '500' });
  });

  it('nowa opcja startuje ze wspólnych pól szkieletu, bez cen', () => {
    const g = zOpcjami();
    const nowa = newOption(g, 'plisa');
    expect(nowa.title).toBe('plisa');
    expect(nowa.items.map((i) => i.name)).toEqual(['Salon', 'Sypialnia']);
    expect(nowa.items.every((i) => !i.unitPrice)).toBe(true);
  });
});

describe('przepisanie starych wariantów na opcje', () => {
  const zWariantami = () =>
    oferta([
      grupa({ id: 'g1', items: [poz({ name: 'Salon', unitPrice: '1000' })] }),
      grupa({ id: 'w1', variant: true, title: 'Wariant tani', items: [poz({ name: 'Sypialnia', material: 'C102', unitPrice: '400' })] }),
      grupa({ id: 'w2', variant: true, title: 'Wariant drogi', items: [poz({ name: 'Sypialnia', material: 'C500', unitPrice: '600' })] })
    ]);

  it('każdy wariant staje się opcją z pełną ceną oferty', () => {
    const po = optionsFromVariants(zWariantami());
    expect(po.groups.some((g) => g.variant)).toBe(false);
    const opcyjna = po.groups.find(isOptionGroup)!;
    expect(opcyjna.options!.map((o) => o.title)).toEqual(['Wariant tani', 'Wariant drogi']);
    const sumy = offerTotals(po);
    expect(sumy.optionGroups[0].options.map((o) => o.total)).toEqual([1400, 1600]);
  });

  it('oferta bez wariantów zostaje nietknięta', () => {
    const bez = oferta([grupa()]);
    expect(optionsFromVariants(bez)).toBe(bez);
  });

  it('szkielet bierze się z najdłuższego wariantu, żeby nic nie wypadło', () => {
    const o = zWariantami();
    o.groups[2].items = [poz({ name: 'Sypialnia', unitPrice: '600' }), poz({ name: 'Gabinet', unitPrice: '200' })];
    const po = optionsFromVariants(o);
    const opcyjna = po.groups.find(isOptionGroup)!;
    expect(opcyjna.items).toHaveLength(2);
    expect(opcyjna.options!.every((x) => x.items.length === 2)).toBe(true);
  });
});

describe('opcja idzie dalej — do produkcji i na WZ', () => {
  it('na WZ trafia wybrana opcja z pełnym opisem, nie wszystkie naraz', () => {
    const wz = wzPrefillFromOffer(oferta([zOpcjami({ selectedOptionId: 'b' })]), []);
    expect(wz.items.map((i) => i.name)).toEqual([
      'Salon (186 x 202 cm · BL22)',
      'Sypialnia (BL22)'
    ]);
    expect(wz.uncheckedOptions).toBe(false);
  });

  it('brak wskazania opcji jest zgłaszany, a nie przemilczany', () => {
    const wz = wzPrefillFromOffer(oferta([zOpcjami()]), []);
    expect(wz.uncheckedOptions).toBe(true);
    // i tak przenosimy pierwszą, żeby było od czego zacząć
    expect(wz.items).toHaveLength(2);
  });

  it('do zlecenia produkcyjnego idzie tylko wybrana opcja', () => {
    const zlecenie = orderFromOffer(oferta([zOpcjami({ selectedOptionId: 'b' })]), undefined, '2026-10-23');
    expect(zlecenie.items).toHaveLength(2);
    expect(zlecenie.items.map((i) => i.material)).toEqual(['186 x 202 cm · BL22', 'BL22']);
  });
});

describe('pozycje wybranej opcji', () => {
  it('zwykła tabela oddaje swoje pozycje bez zmian', () => {
    const g = grupa({ items: [poz({ name: 'Salon' })] });
    expect(selectedItems(g)).toBe(g.items);
  });
});

describe('wymiar jest wspólny dla wszystkich opcji', () => {
  const zWymiarem = (wSzkielecie: string, wOpcji: string) =>
    syncOptions(
      grupa({
        items: [poz({ spec: [{ label: 'Szerokość całkowita', value: wSzkielecie }] })],
        options: [
          { id: 'a', items: [poz({ spec: [{ label: 'Szerokość całkowita', value: wOpcji }] })] },
          { id: 'b', items: [poz({ spec: [] })] }
        ]
      })
    );

  it('wymiar wpisany w jednej opcji trafia do pozostałych', () => {
    // inaczej opcja B zostałaby bez wymiaru i bez ceny z cennika
    const g = zWymiarem('', '186');
    expect(g.items[0].spec).toEqual([{ label: 'Szerokość całkowita', value: '186' }]);
    expect(g.options![1].items[0].spec).toEqual([{ label: 'Szerokość całkowita', value: '186' }]);
  });

  it('wymiar ze szkieletu wygrywa z wpisanym przy opcji', () => {
    const g = zWymiarem('200', '186');
    expect(g.options![0].items[0].spec).toEqual([{ label: 'Szerokość całkowita', value: '200' }]);
  });

  it('wymiar dopisany tylko w opcji zakłada wiersz w szkielecie', () => {
    const g = syncOptions(
      grupa({
        items: [poz({ spec: [] })],
        options: [{ id: 'a', items: [poz({ spec: [{ label: 'Wysokość całkowita', value: '202' }] })] }]
      })
    );
    expect(g.items[0].spec).toEqual([{ label: 'Wysokość całkowita', value: '202' }]);
  });

  it('„Wysokość kasety" to nie wymiar osłony i zostaje przy opcji', () => {
    const g = syncOptions(
      grupa({
        items: [poz({ spec: [] })],
        options: [
          { id: 'a', items: [poz({ spec: [{ label: 'Wysokość kasety', value: '45' }] })] },
          { id: 'b', items: [poz({ spec: [] })] }
        ]
      })
    );
    expect(g.items[0].spec).toEqual([]);
    expect(g.options![1].items[0].spec).toEqual([]);
  });
});

describe('zmiana specyfikacji przy opcji', () => {
  const szkielet = poz({
    spec: [
      { label: 'Szerokość całkowita', value: '186' },
      { label: 'Typ montażu', value: 'na ścianę' },
      { label: 'Kolor materiału', value: '' }
    ]
  });

  it('poprawka wspólnego parametru idzie do szkieletu', () => {
    const nowa = applyOptionSpec(szkielet, [
      { label: 'Szerokość całkowita', value: '200' },
      { label: 'Typ montażu', value: 'w świetle' },
      { label: 'Kolor materiału', value: 'beż' }
    ]);
    expect(nowa).toEqual([
      { label: 'Szerokość całkowita', value: '200' },
      { label: 'Typ montażu', value: 'w świetle' },
      // pusta rubryka zostaje pusta: jej wartość należy do opcji
      { label: 'Kolor materiału', value: '' }
    ]);
  });

  it('własny parametr opcji nie zaśmieca szkieletu', () => {
    const nowa = applyOptionSpec(szkielet, [
      ...(szkielet.spec || []),
      { label: 'Napęd', value: 'silnik' }
    ]);
    expect(nowa.map((w) => w.label)).toEqual(['Szerokość całkowita', 'Typ montażu', 'Kolor materiału']);
  });

  it('usunięty wiersz znika także ze szkieletu', () => {
    const nowa = applyOptionSpec(szkielet, [{ label: 'Szerokość całkowita', value: '186' }]);
    expect(nowa).toHaveLength(1);
  });
});
