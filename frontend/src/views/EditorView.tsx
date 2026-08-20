import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Printer, FileDown, Mail, Trash2, ArrowLeft } from 'lucide-react';
import { AppState, Item, ItemRow, WZDocument } from '../types';
import { computeNumberFor } from '../lib/numbering';
import { uid } from '../lib/storage';
import { DocumentForm, collectItems, initDocumentForm, todayStr, upsertDocument } from '../lib/documents';
import { printDocument, savePdfDocument, emailDocument } from '../lib/printing';
import { ToastFn } from '../hooks/useToastMessage';
import ItemsEditor from '../components/ItemsEditor';

interface Props {
  state: AppState;
  editingDocId: string | null;
  onPersist: (next: AppState) => Promise<void>;
  onSaved: (id: string) => void;
  onBack: () => void;
  onDelete: (doc: WZDocument) => void;
  toast: ToastFn;
  emailConfirm: (message: string) => Promise<boolean>;
}

function newRow(item?: Item): ItemRow {
  return { rowId: uid(), name: item?.name || '', unit: item?.unit ?? 'szt.', qty: item?.qty || '' };
}

function toRows(doc: WZDocument | null): ItemRow[] {
  return doc && doc.items.length ? doc.items.map((it) => newRow(it)) : [newRow()];
}

export default function EditorView({
  state,
  editingDocId,
  onPersist,
  onSaved,
  onBack,
  onDelete,
  toast,
  emailConfirm
}: Props) {
  const doc = editingDocId ? state.documents.find((d) => d.id === editingDocId) || null : null;
  const initRef = useRef<string | null>(editingDocId);

  const [form, setForm] = useState<DocumentForm>(() => initDocumentForm(doc, state.settings.place));
  const [rows, setRows] = useState<ItemRow[]>(() => toRows(doc));

  useEffect(() => {
    if (initRef.current === editingDocId) return;
    initRef.current = editingDocId;
    const d = editingDocId ? state.documents.find((x) => x.id === editingDocId) || null : null;
    setForm(initDocumentForm(d, state.settings.place));
    setRows(toRows(d));
  }, [editingDocId, state.documents, state.settings.place]);

  const set = (patch: Partial<DocumentForm>): void => setForm((f) => ({ ...f, ...patch }));

  const numberPreview = useMemo(
    () => computeNumberFor(state.documents, editingDocId, form.dateIssued || todayStr(), form.cName.trim()).number,
    [state.documents, editingDocId, form.dateIssued, form.cName]
  );

  const sortedContractors = useMemo(
    () => state.contractors.slice().sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    [state.contractors]
  );

  const selectContractor = (id: string): void => {
    const c = state.contractors.find((x) => x.id === id);
    if (c) {
      set({ contractorSel: id, cName: c.name, cAddress: c.address || '', cNip: c.nip || '', cEmail: c.email || '' });
    } else {
      set({ contractorSel: id });
    }
  };

  const setRow = (rowId: string, patch: Partial<ItemRow>): void =>
    setRows((arr) => arr.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const addRow = (): void => setRows((arr) => [...arr, newRow()]);

  const removeRow = (rowId: string): void =>
    setRows((arr) => {
      const next = arr.filter((r) => r.rowId !== rowId);
      return next.length ? next : [newRow()];
    });

  async function saveDoc(): Promise<WZDocument | null> {
    if (!form.dateIssued) {
      toast('Podaj datę wystawienia.', true);
      return null;
    }
    if (!form.cName.trim()) {
      toast('Podaj nazwę odbiorcy.', true);
      return null;
    }
    const { next, doc: savedDoc } = upsertDocument(state, editingDocId, form, collectItems(rows));
    await onPersist(next);
    if (!editingDocId) onSaved(savedDoc.id);
    return savedDoc;
  }

  const handleSave = async (): Promise<void> => {
    const saved = await saveDoc();
    if (saved) toast(`Zapisano dokument ${saved.number}.`);
  };
  const handleSavePrint = async (): Promise<void> => {
    const saved = await saveDoc();
    if (saved) printDocument(saved, state.settings, toast);
  };
  const handleSavePdf = async (): Promise<void> => {
    const saved = await saveDoc();
    if (saved) savePdfDocument(saved, state.settings, toast);
  };
  const handleSaveEmail = async (): Promise<void> => {
    const saved = await saveDoc();
    if (saved) emailDocument(saved, state.settings, toast, emailConfirm);
  };

  return (
    <section className="view view-edit" data-testid="view-edit">
      <div className="edit-head">
        <h1 className="page-title" data-testid="edit-title">
          {doc ? `Edycja WZ ${doc.number}` : 'Nowa WZ'}
        </h1>
        <div className="doc-number" data-testid="number-preview-pill">
          <span className="doc-number-label">Numer</span>
          <strong data-testid="number-preview">{numberPreview || '—'}</strong>
        </div>
      </div>

      <div className="card">
        <div className="grid3">
          <label className="field">
            <span>Data wystawienia</span>
            <input
              type="date"
              className="input"
              data-testid="date-input"
              value={form.dateIssued}
              onChange={(e) => set({ dateIssued: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Miejsce wystawienia</span>
            <input type="text" className="input" data-testid="place-input" value={form.place} onChange={(e) => set({ place: e.target.value })} />
          </label>
          <label className="field">
            <span>Nr zamówienia / umowy</span>
            <input type="text" className="input" data-testid="order-no-input" value={form.orderNo} onChange={(e) => set({ orderNo: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Odbiorca / Nabywca</h3>
        <div className="grid2">
          <label className="field">
            <span>Wybierz z bazy kontrahentów</span>
            <select className="input" data-testid="contractor-select" value={form.contractorSel} onChange={(e) => selectContractor(e.target.value)}>
              <option value="">— wpisz ręcznie lub wybierz —</option>
              {sortedContractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              data-testid="save-contractor-checkbox"
              checked={form.saveContractor}
              onChange={(e) => set({ saveContractor: e.target.checked })}
            />
            <span>Zapisz / zaktualizuj tego odbiorcę w bazie kontrahentów</span>
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Firma / Imię i nazwisko *</span>
            <input type="text" className="input" data-testid="contractor-name-input" value={form.cName} onChange={(e) => set({ cName: e.target.value })} />
          </label>
          <label className="field">
            <span>NIP</span>
            <input type="text" className="input" data-testid="contractor-nip-input" value={form.cNip} onChange={(e) => set({ cNip: e.target.value })} />
          </label>
          <label className="field">
            <span>Adres</span>
            <input type="text" className="input" data-testid="contractor-address-input" value={form.cAddress} onChange={(e) => set({ cAddress: e.target.value })} />
          </label>
          <label className="field">
            <span>E-mail (do wysyłki WZ)</span>
            <input type="email" className="input" data-testid="contractor-email-input" value={form.cEmail} onChange={(e) => set({ cEmail: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Pozycje</h3>
        <ItemsEditor rows={rows} onSetRow={setRow} onAddRow={addRow} onRemoveRow={removeRow} />
      </div>

      <div className="card">
        <label className="field">
          <span>Uwagi</span>
          <textarea className="input" data-testid="notes-input" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>

      <div className="actions-bar sticky-actions">
        <button className="btn btn-primary" data-testid="save-doc-btn" onClick={handleSave}>
          <Save className="icon" />
          Zapisz
        </button>
        <button className="btn" data-testid="save-print-btn" onClick={handleSavePrint}>
          <Printer className="icon" />
          Zapisz i drukuj
        </button>
        <button className="btn" data-testid="save-pdf-btn" onClick={handleSavePdf}>
          <FileDown className="icon" />
          Zapisz PDF
        </button>
        <button className="btn" data-testid="save-email-btn" onClick={handleSaveEmail}>
          <Mail className="icon" />
          Wyślij e-mailem
        </button>
        <span className="spacer" />
        {doc && (
          <button className="btn btn-danger" data-testid="delete-doc-btn" onClick={() => onDelete(doc)}>
            <Trash2 className="icon" />
            Usuń
          </button>
        )}
        <button className="btn btn-light" data-testid="back-btn" onClick={onBack}>
          <ArrowLeft className="icon" />
          Wróć do listy
        </button>
      </div>
    </section>
  );
}
