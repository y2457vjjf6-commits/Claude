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
}

export interface AppState {
  settings: Settings;
  contractors: Contractor[];
  documents: WZDocument[];
}

export type ViewName = 'list' | 'edit' | 'contractors' | 'settings';

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
    };
  }
}
