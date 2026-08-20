import { AppState, Item, WZDocument } from '../types';
import { computeNumberFor } from './numbering';
import { uid } from './storage';

export interface DocumentForm {
  dateIssued: string;
  place: string;
  orderNo: string;
  contractorSel: string;
  saveContractor: boolean;
  cName: string;
  cNip: string;
  cAddress: string;
  cEmail: string;
  notes: string;
}

export function todayStr(): string {
  const d = new Date();
  return (
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  );
}

export function initDocumentForm(doc: WZDocument | null, defaultPlace: string): DocumentForm {
  return {
    dateIssued: doc?.dateIssued || todayStr(),
    place: doc ? doc.place : defaultPlace,
    orderNo: doc?.orderNo || '',
    contractorSel: doc?.contractorId || '',
    saveContractor: false,
    cName: doc?.contractor?.name || '',
    cNip: doc?.contractor?.nip || '',
    cAddress: doc?.contractor?.address || '',
    cEmail: doc?.contractor?.email || '',
    notes: doc?.notes || ''
  };
}

export function collectItems(rows: Item[]): Item[] {
  return rows
    .map((r) => ({ name: r.name.trim(), unit: r.unit.trim(), qty: r.qty.trim() }))
    .filter((it) => it.name || it.qty);
}

function formContractor(form: DocumentForm): WZDocument['contractor'] {
  return {
    name: form.cName.trim(),
    address: form.cAddress.trim(),
    nip: form.cNip.trim(),
    email: form.cEmail.trim()
  };
}

function upsertContractor(next: AppState, form: DocumentForm, contractor: WZDocument['contractor']): string | null {
  let contractorId: string | null = form.contractorSel || null;
  if (!form.saveContractor) return contractorId;
  const existing = contractorId ? next.contractors.find((c) => c.id === contractorId) : null;
  if (existing) {
    Object.assign(existing, contractor);
    return existing.id;
  }
  const created = { id: uid(), ...contractor };
  next.contractors.push(created);
  return created.id;
}

// Buduje nową wersję stanu z zapisanym dokumentem (nowym lub edytowanym).
export function upsertDocument(
  state: AppState,
  editingDocId: string | null,
  form: DocumentForm,
  items: Item[]
): { next: AppState; doc: WZDocument } {
  const contractor = formContractor(form);
  const { seq, number } = computeNumberFor(state.documents, editingDocId, form.dateIssued, contractor.name);
  const next = structuredClone(state);
  const contractorId = upsertContractor(next, form, contractor);

  const nowIso = new Date().toISOString();
  const doc: WZDocument = {
    id: editingDocId || uid(),
    number,
    seq,
    dateIssued: form.dateIssued,
    place: form.place.trim(),
    orderNo: form.orderNo.trim(),
    contractorId,
    contractor,
    items,
    notes: form.notes.trim(),
    createdAt: nowIso,
    updatedAt: nowIso
  };

  if (editingDocId) {
    const idx = next.documents.findIndex((d) => d.id === editingDocId);
    doc.createdAt = next.documents[idx]?.createdAt || nowIso;
    next.documents[idx] = doc;
  } else {
    next.documents.push(doc);
  }
  return { next, doc };
}
