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
  /** Domyślne ustawienia nowej oferty */
  offerDefaults: {
    deadlineDays: string;
    validityDays: string;
    installationIncluded: boolean;
    /** Czy nowe oferty mają klauzulę informacyjną */
    legalClause: boolean;
  };
  /** Treść klauzuli drukowanej na ofercie */
  offerLegalText: string;
  /** Uwagi końcowe dopisywane do każdej oferty (puste = nie drukujemy) */
  offerClosingText: string;
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
}

export type ViewName = 'list' | 'edit' | 'offers' | 'offerEdit' | 'contractors' | 'reports' | 'settings';

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
    };
  }
}

/* ============================ Oferty cenowe ============================ */

/** Nagłówek drugiej kolumny w tabeli oferty. */
export type OfferColumnHeader = 'material' | 'size' | 'materialSize' | 'plain';

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
}

export interface OfferGroup {
  id: string;
  header: OfferColumnHeader;
  /** Podpis nad tabelą, np. „Wariant A — materiał zaciemniający” */
  title?: string;
  /** Wariant alternatywny: wyceniany osobno, poza ceną całkowitą oferty */
  variant?: boolean;
  items: OfferItem[];
}

export type OfferStatus = 'szkic' | 'wyslana' | 'zaakceptowana' | 'odrzucona';

export interface Offer {
  id: string;
  /** Data wystawienia (RRRR-MM-DD) */
  date: string;
  place: string;
  /** Dla kogo oferta — trafia na dokument i do nazwy pliku */
  client: string;
  clientEmail: string;
  groups: OfferGroup[];
  /** true = Lp. biegnie przez wszystkie tabele; false = każda tabela od 1 */
  continuousNumbering: boolean;
  discountEnabled: boolean;
  /** Rabat w procentach */
  discountPercent: string;
  deliveryEnabled: boolean;
  /** Kwota dostawy; puste przy „nie dotyczy” */
  deliveryPrice: string;
  deliveryNotApplicable: boolean;
  installationIncluded: boolean;
  deadlineDays: string;
  deadlineBasis: 'akceptacji' | 'potwierdzenia';
  validityEnabled: boolean;
  validityDays: string;
  notes: string;
  /** Kto wystawił ofertę */
  issuedBy: string;
  /** Klauzula: dokument ma charakter informacyjny (art. 71 k.c.) */
  legalClause: boolean;
  status: OfferStatus;
  /** Dokumenty WZ wystawione na podstawie tej oferty */
  wzDocumentIds?: string[];
  printedAt?: string;
  emailedAt?: string;
  emailedTo?: string;
  createdAt: string;
  updatedAt: string;
}
