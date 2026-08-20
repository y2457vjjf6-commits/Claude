export interface Item {
  name: string;
  unit: string;
  qty: string;
}

export interface Contractor {
  id: string;
  name: string;
  nip?: string;
  address?: string;
  email?: string;
}

export interface DocContractor {
  name: string;
  address: string;
  nip: string;
  email: string;
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
}

export interface AppState {
  settings: Settings;
  contractors: Contractor[];
  documents: WZDocument[];
}

export type ViewName = 'list' | 'edit' | 'contractors' | 'settings';

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
        subject: string;
        text: string;
        filename: string;
      }) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}
