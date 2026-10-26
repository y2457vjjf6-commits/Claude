export interface Item {
  name: string;
  unit: string;
  qty: string;
  order?: string;
}

export interface Employee {
  id: string;
  name: string;
  role?: string;
  phone?: string;
}

export interface Contractor {
  id: string;
  name: string;
  nip?: string;
  address?: string;
  email?: string;
  /** Własny kod do numeracji (np. „RS”); pusty = automatyczny z nazwy */
  code?: string;
  /** Pracownicy firmy — podpowiadani w polu „Kto odebrał” */
  employees?: Employee[];
}

export interface DocContractor {
  name: string;
  address: string;
  nip: string;
  email: string;
  code?: string;
}

export interface WZDocument {
  id: string;
  number: string;
  seq: number;
  dateIssued: string;
  place: string;
  orderNo: string;
  contractorId: string | null;
  contractor: DocContractor;
  items: Item[];
  notes: string;
  /** Imię i nazwisko osoby odbierającej towar */
  receivedBy?: string;
  /** Oferta, z której wystawiono ten dokument (jeśli powstał z oferty) */
  sourceOfferId?: string;
  /** Kiedy dokument był ostatnio drukowany (ISO) */
  printedAt?: string;
  /** Kiedy i na jaki adres wysłano dokument mailem */
  emailedAt?: string;
  emailedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Smtp {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface Seller {
  name: string;
  address: string;
  nip: string;
  phone: string;
  www: string;
}

/** Zdjęcie produktu pokazywane klientowi przy pozycji oferty. */
/** Specyfikacja przypisana do produktu. Ten sam produkt wraca na dziesiątkach
 *  ofert z tym samym zestawem parametrów, więc trzymamy go raz w ustawieniach
 *  i dobieramy do pozycji po nazwie — tak samo jak zdjęcia. */
/** Zestaw domyślnej specyfikacji przypisany do kategorii produktów.
 *
 *  Rolety mają inne parametry niż moskitiery, więc jeden wspólny zestaw
 *  wierszy nie wystarcza. Zestaw może obejmować kilka kategorii naraz, a jedna
 *  kategoria może mieć kilka zestawów — wtedy pierwszy wchodzi sam, a resztę
 *  wstawia się przyciskiem przy pozycji.
 */
export interface SpecPreset {
  id: string;
  /** Nazwa dla człowieka, np. „Rolety kasetowe" */
  name: string;
  /** Kategorie, których dotyczy. Pusta lista = zestaw na wszystko, używany
   *  wtedy, gdy nic bardziej szczegółowego nie pasuje. */
  departments: Department[];
  rows: OfferSpecRow[];
}

export interface SpecTemplate {
  /** Nazwa produktu albo jej fragment, np. „roleta kasetowa uni” */
  name: string;
  /** Wiersze wstawiane do pozycji; wartości bywają puste — do uzupełnienia */
  rows: OfferSpecRow[];
}

export interface ProductPhoto {
  /** Nazwa lub jej fragment, np. „roleta kasetowa uni” albo kod tkaniny „C102” */
  name: string;
  /** Miniatura jako dataurl — trzymana w danych, żeby program działał bez sieci */
  dataUrl: string;
}

export interface Settings {
  theme: 'light' | 'dark';
  seller: Seller;
  place: string;
  smtp: Smtp;
  emailSubject: string;
  emailBody: string;
  /** Adres, na który trafia ukryta kopia (UDW) każdej wysłanej WZ */
  emailCopyTo: string;
  /** Folder, do którego trafiają kopie zapasowe danych (pusty = wyłączone) */
  backupFolder: string;
  /** Osoby wystawiające oferty (imiona i nazwiska) */
  issuers: string[];
  /** Telefon przypisany do osoby wystawiającej: imię i nazwisko → numer */
  issuerPhones?: Record<string, string>;
  /** Biblioteka zdjęć produktów — dobierane do pozycji po nazwie */
  productPhotos?: ProductPhoto[];
  /** Szablony specyfikacji przypisane do produktów — wstawiane do pozycji po nazwie */
  specTemplates?: SpecTemplate[];
  /** Domyślna specyfikacja — zastąpiona przez specPresets. Zostaje, żeby dane
   *  zapisane starszą wersją programu dało się przenieść. */
  defaultSpec?: OfferSpecRow[];
  /** Zestawy domyślnej specyfikacji, każdy przypisany do oddziałów. Pozycja
   *  dostaje zestaw pasujący do swojego produktu. */
  specPresets?: SpecPreset[];
  /** Etapy produkcji; puste = program użyje domyślnych */
  stages?: Stage[];
  /** Domyślne ustawienia nowej oferty */
  offerDefaults: {
    deadlineDays: string;
    validityDays: string;
    /** Czy nowe oferty mają od razu ograniczoną ważność */
    validityEnabled: boolean;
    installationIncluded: boolean;
  };
  /** Uwagi końcowe dopisywane do każdej oferty (puste = nie drukujemy) */
  offerClosingText: string;
  /** Treść ramki „do sprawdzenia” nad podpisem (puste = bez ramki) */
  offerCheckText?: string;
  /** Zaliczka w procentach drukowana w warunkach oferty (0 albo brak = bez wiersza) */
  offerDepositPercent?: string;
  /** Po ilu dniach bez decyzji przypominać o wysłanej ofercie */
  offerFollowUpDays: string;
  /** Czy pokazywać koszt własny i marżę (tylko w programie, nigdy na dokumencie) */
  showCosts: boolean;
}

export interface AppState {
  settings: Settings;
  contractors: Contractor[];
  documents: WZDocument[];
  offers: Offer[];
  /** Cennik zakupowy — tabele producenta, z których liczymy koszt własny */
  priceTables: PriceTable[];
  /** Zlecenia produkcyjne */
  orders?: ProductionOrder[];
  /** Dziennik zmian etapów — tylko dopisywany */
  stageEvents?: StageEvent[];
  /** Konta pracowników. Pusta lista = program działa bez logowania, jak dotąd. */
  users?: UserAccount[];
}

/** Dopłata do pozycji: albo stała kwota, albo kwota odczytana z progów
 *  wymiaru — tak jak dopłata do profilu montażowego, która rośnie z szerokością. */
export interface PriceSurcharge {
  /** Nazwa pokazywana przy pozycji */
  name: string;
  /** Stała kwota — gdy dopłata nie zależy od wymiaru */
  amount?: number;
  /** Od którego wymiaru zależy kwota */
  by?: 'width' | 'height';
  /** Progi wymiaru rosnąco; kwota to `amounts` o tym samym numerze */
  steps?: number[];
  amounts?: number[];
  /** Dopłata liczona od ceny pozycji, np. 20% za drabinkę taśmową */
  percent?: number;
}

/** Tabela cennika producenta: koszt zależny od szerokości i wysokości.
 *  Ceny czytamy z zaokrągleniem w górę do najbliższej kratki siatki. */
export interface PriceTable {
  id: string;
  /** Nazwa grupy cenowej, np. „Rolety wolnowiszące FI32 — grupa 1” */
  name: string;
  /** Producent albo dostawca */
  supplier?: string;
  /** Człony, które muszą stać w nazwie pozycji, np. ['UNI', 'antracyt'].
   *  Wszystkie muszą pasować; pusta lista = dowolny produkt. Im więcej członów,
   *  tym tabela bardziej szczegółowa i tym pewniej wygrywa z ogólniejszą. */
  product?: string[];
  /** Kody materiałów należące do tej grupy, np. C101, C102 */
  materials?: string[];
  /** Człony, których obecność wyklucza tę tabelę. Cennik „żaluzje aluminiowe"
   *  nie obejmuje systemu VENUS, choć ten też jest aluminiowy i też ma lamelę
   *  25 mm — bez tego pozycja VENUS trafiłaby na tańszy cennik. */
  excludes?: string[];
  /** Szerokości w cm, rosnąco — nagłówki kolumn */
  widths: number[];
  /** Wysokości w cm, rosnąco — nagłówki wierszy */
  heights: number[];
  /** prices[wiersz][kolumna] w złotych; null = producent nie podaje ceny */
  prices: (number | null)[][];
  /** Kratki, w których cena producenta łamie regułę siatki i została poprawiona.
   *  Klucz to „wiersz:kolumna", wartość to kwota wydrukowana w cenniku —
   *  dzięki temu widać, co zmieniliśmy, i da się to cofnąć. */
  corrected?: Record<string, number>;
  /** Dopłaty, które wolno doliczyć do pozycji wycenionej z tej tabeli */
  surcharges?: PriceSurcharge[];
  /** Skąd pochodzi, np. „Cennik 01.2026, s. 4” — do porównania z oryginałem */
  source?: string;
  updatedAt: string;
}

export type ViewName =
  | 'list' | 'edit' | 'offers' | 'offerEdit' | 'orders' | 'orderEdit' | 'board'
  | 'prices' | 'contractors' | 'reports' | 'settings';

export type AskConfirm = (message: string, opts?: { confirmLabel?: string; danger?: boolean }) => Promise<boolean>;

declare global {
  interface Window {
    wzApi?: {
      loadData: () => Promise<unknown>;
      saveData: (state: AppState) => Promise<{ ok: boolean }>;
      dataLocation: () => Promise<string>;
      printDoc: () => Promise<{ ok: boolean; error?: string }>;
      savePdf: (suggestedName: string) => Promise<{ ok: boolean; canceled?: boolean; filePath?: string; error?: string }>;
      sendEmail: (payload: {
        smtp: Smtp;
        to: string;
        bcc?: string;
        subject: string;
        text: string;
        filename: string;
      }) => Promise<{ ok: boolean; error?: string }>;
      testEmail: (smtp: Smtp) => Promise<{ ok: boolean; error?: string }>;
      chooseBackupFolder: () => Promise<{ ok: boolean; folder?: string; canceled?: boolean }>;
      backupNow: (payload: { state: AppState; folder: string }) => Promise<{ ok: boolean; file?: string; error?: string }>;
      restoreBackup: (folder: string) => Promise<{ ok: boolean; state?: AppState; canceled?: boolean; error?: string }>;
      /** Otwiera okno na zdjęcia z telefonu i zwraca adres do kodu QR */
      qcStart: (dane: { orderId: string; numer: string }) => Promise<{ url?: string; token?: string; error?: string }>;
      qcStop: (token: string) => Promise<boolean>;
      /** Nasłuch na zdjęcia przysyłane z telefonu; zwraca funkcję odpinającą */
      onQcPhoto: (cb: (foto: { orderId: string; dataUrl: string }) => void) => () => void;
    };
  }
}

/* ============================ Oferty cenowe ============================ */

/** Nagłówek drugiej kolumny w tabeli oferty. */
export type OfferColumnHeader = 'material' | 'size' | 'materialSize' | 'plain';

/** Jedna para specyfikacji: „co" i „jakie". Osobny typ, bo te pary wędrują
 *  między pozycjami (kopiowanie specyfikacji) i na wydruk. */
export interface OfferSpecRow {
  label: string;
  value: string;
}

export interface OfferItem {
  /** Nazwa produktu, np. „Rolety wolnowiszące FI32” */
  name: string;
  /** Wiersz w nawiasie pod nazwą, np. „Materiał C102” albo „186 x 202 cm” */
  material: string;
  qty: string;
  /** Cena za sztukę */
  unitPrice: string;
  /** Kwota za pozycję — normalnie ilość × cena, można nadpisać ręcznie */
  totalOverride?: string;
  /** Własna numeracja Lp. zamiast automatycznej */
  lpOverride?: string;
  /** Koszt własny za sztukę — tylko do wyceny w programie, nie trafia na dokument */
  cost?: string;
  /** 'cennik' = kwota podstawiona z tabeli producenta i wolno ją nadpisać
   *  automatycznie; brak wartości = wpisana ręcznie i nietykalna */
  costSource?: 'cennik';
  /** To samo dla ceny sprzedaży: 'cennik' = podstawiona z tabeli producenta
   *  i wolno ją przeliczyć po zmianie wymiaru; brak = wpisana ręcznie */
  priceSource?: 'cennik';
  /** Dopłaty doliczone do tej pozycji. Zapisujemy je z kwotą, nie samą nazwą —
   *  dzięki temu wystawiona oferta nie zmieni się, gdy producent podniesie cennik. */
  surcharges?: PriceSurcharge[];
  /** Specyfikacja pozycji: pary „co — jakie", np. „Kolor kasety — RAL 9005".
   *  Drukowana pod nazwą, gdy oferta ma włączoną specyfikację. */
  spec?: OfferSpecRow[];
}

/** Stawka rabatu przypisana produktowi w tej jednej ofercie.
 *
 *  Nazwa dopasowuje się tak samo jak w bibliotece zdjęć: wszystkie jej słowa
 *  muszą stać w nazwie pozycji, w dowolnej odmianie. Dzięki temu „rolety
 *  materiałowe” łapią też „Roleta materiałowa Mini 19”, a reguła zostaje
 *  czytelna, gdy ktoś otworzy ofertę za rok. */
export interface OfferDiscountRule {
  id: string;
  /** Nazwa produktu albo jej fragment, np. „żaluzje drewniane” */
  name: string;
  /** Rabat w procentach; „0" znaczy „ten produkt bez rabatu" */
  percent: string;
}

/** Jedna alternatywa w grupie opcji — „Opcja A", „Opcja B"…
 *
 *  Pozycje opcji biegną równolegle do szkieletu grupy: tyle samo wierszy
 *  i w tej samej kolejności, bo kolumny tabeli porównawczej muszą się zgadzać.
 *  Wspólne pola (nazwa, ilość, Lp.) trzyma szkielet i rozsyła do opcji;
 *  opcja wnosi to, czym się różni — materiał i cenę. */
export interface OfferOption {
  id: string;
  /** Nazwa opcji, np. „materiał dzień-noc". Puste = automatyczne „Opcja A". */
  title?: string;
  items: OfferItem[];
}

export interface OfferGroup {
  id: string;
  header: OfferColumnHeader;
  /** Podpis nad tabelą, np. „Wariant A — materiał zaciemniający” */
  title?: string;
  /** Wariant alternatywny: wyceniany osobno, poza ceną całkowitą oferty.
   *  Mechanizm zastąpiony przez `options`; zostaje, żeby oferty wystawione
   *  starszą wersją programu drukowały się dokładnie tak, jak je wysłano. */
  variant?: boolean;
  /** Grupa opcji: `items` są wtedy szkieletem (nazwa, wymiar, ilość), a każda
   *  opcja podstawia własny materiał i cenę. Klient dostaje tabelę
   *  porównawczą i cenę całkowitą oferty policzoną dla każdej opcji. */
  options?: OfferOption[];
  /** Opcja wliczona w cenę całkowitą i przenoszona do produkcji i na WZ.
   *  Brak wartości = liczymy pierwszą, ale nikt jeszcze nie wybrał. */
  selectedOptionId?: string;
  items: OfferItem[];
}

export type OfferStatus = 'szkic' | 'wyslana' | 'zaakceptowana' | 'odrzucona';

export interface Offer {
  id: string;
  /** Numer oferty, np. OF-0014/2026 — nadawany przy pierwszym zapisie */
  number?: string;
  /** Kolejny numer w roku; trzymany osobno, żeby numer dało się przeliczyć */
  seq?: number;
  /** Data wystawienia (RRRR-MM-DD) */
  date: string;
  place: string;
  /** Dla kogo oferta — trafia na dokument i do nazwy pliku */
  client: string;
  clientEmail: string;
  /** Adres odbiorcy — drukowany pod nazwą, gdy wypełniony */
  clientAddress?: string;
  /** NIP odbiorcy — drukowany tylko dla firm */
  clientNip?: string;
  groups: OfferGroup[];
  /** true = Lp. biegnie przez wszystkie tabele; false = każda tabela od 1 */
  continuousNumbering: boolean;
  discountEnabled: boolean;
  /** Rabat podstawowy w procentach — dla produktów bez własnej stawki */
  discountPercent: string;
  /** Własne stawki dla produktów z tej wyceny. Puste = cała oferta po rabacie
   *  podstawowym, czyli tak, jak działały oferty przed tą zmianą. */
  discountRules?: OfferDiscountRule[];
  deliveryEnabled: boolean;
  /** Kwota dostawy; puste pole drukuje się jako „nie dotyczy” */
  deliveryPrice: string;
  installationIncluded: boolean;
  deadlineDays: string;
  validityEnabled: boolean;
  validityDays: string;
  notes: string;
  /** Kto wystawił ofertę */
  issuedBy: string;
  /** Telefon tej osoby, zapisany przy ofercie — żeby wysłany dokument się nie zmieniał */
  issuedByPhone?: string;
  status: OfferStatus;
  /** Rozbicie ceny na netto i VAT — dla ofert dla firm */
  vatBreakdown?: boolean;
  /** Stawka VAT w procentach. 8% przy montażu w budownictwie mieszkaniowym,
   *  23% poza nim. Brak wartości = stawka podstawowa. */
  vatRate?: number;
  /** Czy drukować zdjęcia produktów przy pozycjach */
  showPhotos?: boolean;
  /** Czy drukować specyfikację pod pozycjami */
  showSpecs?: boolean;
  /** Dokumenty WZ wystawione na podstawie tej oferty */
  wzDocumentIds?: string[];
  printedAt?: string;
  emailedAt?: string;
  emailedTo?: string;
  createdAt: string;
  updatedAt: string;
}

/* ===================== Produkcja ===================== */

/** Etap produkcji. Lista jest w ustawieniach, bo każdy warsztat ma swoją. */
export interface Stage {
  id: string;
  name: string;
  /** Kolor kropki na liście i paska na tablicy */
  color: string;
  /** Etap końcowy: po nim pozycja jest zrobiona i znika z tablicy */
  final?: boolean;
  /** Podetap: należy do etapu o tym id. Podetapy nie są osobnymi przystankami
   *  — to lista rzeczy do odhaczenia w ramach etapu nadrzędnego. */
  parentId?: string;
  /** Oddziały, których ten etap dotyczy. Pusta lista = każdy; żaluzje mają
   *  inne kroki niż moskitiery i nie ma powodu pokazywać ich sobie nawzajem. */
  departments?: Department[];
}

/** Pozycja zlecenia — to, co faktycznie trzeba wyprodukować.
 *
 *  Pozycja z oferty bywa zbiorcza („roleta UNI, 12 szt."). Dopóki całe 12 sztuk
 *  idzie razem, zostaje jedną pozycją; gdy zacznie się rozjeżdżać, rozbija się
 *  ją na sztuki (`splitFrom` wskazuje wtedy pozycję, z której powstała).
 */
export interface OrderItem {
  id: string;
  name: string;
  material: string;
  spec?: OfferSpecRow[];
  qty: string;
  /** Etap, w którym pozycja jest teraz — wyliczany z dziennika */
  stageId: string;
  /** Kto robi — login osoby z oddziału pasującego do produktu.
   *  Puste = nieprzypisana. */
  assignee?: string;
  /** Notatka warsztatowa, np. „czekamy na poprawiony wymiar" */
  note?: string;
  /** Zdjęcie wklejone ze schowka albo wgrane z pliku — zwykle okno z pomiaru
   *  albo szkic. Trzymane przy pozycji jako dataurl, żeby działało bez sieci. */
  photo?: string;
  /** Pozycja, z której ta została wydzielona przy rozbijaniu na sztuki */
  splitFrom?: string;
}

/** Wpis dziennika: kto, kiedy i z jakiego etapu na jaki przestawił pozycję.
 *
 *  Dziennik tylko się dopisuje. To nie jest wygoda, tylko warunek wspólnej
 *  pracy: dwie osoby klikające w tej samej chwili dokładają po wpisie, zamiast
 *  nadpisywać sobie wspólne pole.
 */
export interface StageEvent {
  id: string;
  orderId: string;
  itemId: string;
  /** Pusty przy założeniu zlecenia */
  fromStageId: string;
  toStageId: string;
  /** Czas zdarzenia (ISO) — po nim ustala się, który wpis jest najnowszy */
  at: string;
  by: string;
  note?: string;
  /** Dla podetapów: czy odhaczono (true), czy cofnięto odhaczenie (false).
   *  Dla zwykłych etapów bez znaczenia. */
  done?: boolean;
}

export type OrderStatus = 'nowe' | 'w-toku' | 'wydane' | 'wstrzymane';

/** Zdjęcie kontroli jakości: dowód, że to, co wyjechało, wyglądało tak,
 *  jak wyglądało. Robione telefonem po zeskanowaniu kodu ze zlecenia. */
export interface QcPhoto {
  id: string;
  /** Miniatura jako dataurl — program działa bez sieci, więc nie trzymamy ścieżek */
  dataUrl: string;
  at: string;
  /** Kto wysłał; z telefonu bywa puste */
  by?: string;
  note?: string;
}

/** Zlecenie produkcyjne — trzeci dokument obok WZ i oferty. */
export interface ProductionOrder {
  id: string;
  /** Numer ZL-10-0001-2026, nadawany przy pierwszym zapisie */
  number?: string;
  seq?: number;
  /** Numer własny — oznaczenie używane w firmie albo numer zamówienia
   *  od klienta. Wpisywany ręcznie, szuka się po nim na liście. */
  ownNumber?: string;
  /** Data założenia (RRRR-MM-DD) */
  date: string;
  /** Termin realizacji całego zlecenia */
  dueDate?: string;
  /** Oferta, z której powstało — żeby dało się wrócić do wyceny */
  sourceOfferId?: string;
  /** Dane klienta kopiowane, nie przez odnośnik: zmiana w kartotece za pół roku
   *  nie ma prawa zmienić dokumentu, który poszedł już do produkcji. */
  client: string;
  clientAddress?: string;
  clientPhone?: string;
  items: OrderItem[];
  /** Uwagi dla warsztatu — osobne od uwag na ofercie */
  notes?: string;
  /** Wstrzymane ustawia człowiek; reszta wylicza się z etapów pozycji */
  onHold?: boolean;
  /** Zdjęcia kontroli jakości — dorzucane telefonem po zeskanowaniu kodu */
  qcPhotos?: QcPhoto[];
  /** Kiedy i przez kogo zlecenie zostało odebrane po kontroli */
  qcDoneAt?: string;
  qcBy?: string;
  createdAt: string;
  updatedAt: string;
}

/* ===================== Konta i stanowiska ===================== */

/** Stanowisko decyduje, co widać i co wolno zmienić. */
export type UserRole = 'wlasciciel' | 'biuro' | 'warsztat';

/** Oddział warsztatu. Jedna osoba bywa w kilku — stąd lista, a nie pole. */
export type Department = 'rolety' | 'zaluzje' | 'plisy' | 'moskitiery';

/** Hasło zapisane tak, żeby nie dało się go odczytać z pliku danych.
 *  PBKDF2-SHA256: z hasła i soli liczy się skrót, a sprawdzenie polega
 *  na policzeniu go jeszcze raz. Liczbę obrotów trzymamy przy haśle, żeby
 *  dało się ją w przyszłości podnieść bez unieważniania starych kont. */
export interface PasswordHash {
  algo: 'pbkdf2-sha256';
  iterations: number;
  /** Sól w base64 — osobna dla każdego konta */
  salt: string;
  /** Skrót w base64 */
  hash: string;
}

export interface UserAccount {
  id: string;
  /** Login — bez spacji, porównywany bez względu na wielkość liter */
  login: string;
  /** Imię i nazwisko; podpisuje wpisy w dzienniku etapów */
  name: string;
  role: UserRole;
  password: PasswordHash;
  /** Oddziały, w których ta osoba pracuje. Po nich dobieramy, kto może wziąć
   *  pozycję zlecenia: rolety robi kto inny niż moskitiery. */
  departments?: Department[];
  /** Wyłączone konto zostaje w danych (podpisy w historii mają sens),
   *  ale nie da się na nie zalogować */
  disabled?: boolean;
  createdAt: string;
  /** Ostatnie udane logowanie — widać, czy konto jest w ogóle używane */
  lastLoginAt?: string;
}
