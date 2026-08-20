import { useEffect, useRef, useState } from 'react';
import { Plus, X, Save, Printer, FileDown, Mail, Trash2, ArrowLeft } from 'lucide-react';
import { AppState, Item, WZDocument } from '../types';
import { computeNumberFor, contractorCode } from '../lib/numbering';
import { uid } from '../lib/storage';
import { printDocument, savePdfDocument, emailDocument } from '../lib/printing';

interface Props {
  state: AppState;
  editingDocId: string | null;
  onPersist: (next: AppState) => Promise<void>;
  onSaved: (id: string) => void;
  onBack: () => void;
  onDelete: (doc: WZDocument) => void;
  toast: (msg: string, isError?: boolean) => void;
  emailConfirm: (message: string) => Promise<boolean>;
}

function todayStr(): string {
  const d = new Date();
  return (
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  );
}

const EMPTY_ITEM: Item = { name: '', unit: 'szt.', qty: '' };

export default function EditorView({ state, editingDocId, onPersist, onSaved, onBack, onDelete, toast, emailConfirm }: Props) {
  const doc = editingDocId ? state.documents.find((d) => d.id === editingDocId) || null : null;
  const initRef = useRef<string | null>('__none__');

  const [form, setForm] = useState(() => initForm(doc));
  const [items, setItems] = useState<Item[]>(() => (doc && doc.items.length ? doc.items.slice() : [{ ...EMPTY_ITEM }]));
  const focusLast = useRef(false);
  const itemsBodyRef = useRef<HTMLTableSectionElement>(null);

  function initForm(d: WZDocument | null) {
    return {
      dateIssued: d ? d.dateIssued : todayStr(),
      place: d ? d.place : state.settings.place,
      orderNo: d ? d.orderNo || '' : '',
      contractorSel: d?.contractorId || '',
      saveContractor: false,
      cName: d ? d.contractor?.name || '' : '',
      cNip: d ? d.contractor?.nip || '' : '',
      cAddress: d ? d.contractor?.address || '' : '',
      cEmail: d ? d.contractor?.email || '' : '',
      cCode: d ? d.contractor?.code || '' : '',
      notes: d ? d.notes || '' : ''
    };
  }

  useEffect(() => {
    if (initRef.current === '__none__') {
      initRef.current = editingDocId;
      return;
    }
    if (initRef.current !== editingDocId) {
      initRef.current = editingDocId;
      const d = editingDocId ? state.documents.find((x) => x.id === editingDocId) || null : null;
      setForm(initForm(d));
      setItems(d && d.items.length ? d.items.slice() : [{ ...EMPTY_ITEM }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDocId]);

  useEffect(() => {
    if (focusLast.current && itemsBodyRef.current) {
      focusLast.current = false;
      const rows = itemsBodyRef.current.querySelectorAll('tr');
      const last = rows[rows.length - 1];
      const input = last?.querySelector<HTMLInputElement>('.item-name');
      input?.focus();
    }
  }, [items.length]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const numberPreview = computeNumberFor(
    state.documents,
    editingDocId,
    form.dateIssued || todayStr(),
    form.cName.trim(),
    form.cCode
  ).number;

  const selectContractor = (id: string) => {
    set({ contractorSel: id });
    const c = state.contractors.find((x) => x.id === id);
    if (c) {
      set({
        contractorSel: id,
        cName: c.name,
        cAddress: c.address || '',
        cNip: c.nip || '',
        cEmail: c.email || '',
        cCode: c.code || ''
      });
    }
  };

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItemRow = () => {
    focusLast.current = true;
    setItems((arr) => [...arr, { ...EMPTY_ITEM }]);
  };

  const removeItemRow = (idx: number) =>
    setItems((arr) => {
      const next = arr.filter((_, i) => i !== idx);
      return next.length ? next : [{ ...EMPTY_ITEM }];
    });

  const onItemKeyDown = (ev: React.KeyboardEvent, idx: number) => {
    if (ev.key !== 'Enter') return;
    if (idx === items.length - 1) {
      ev.preventDefault();
      addItemRow();
    }
  };

  const collectItems = (): Item[] =>
    items
      .map((it) => ({
        name: it.name.trim(),
        unit: it.unit.trim(),
        qty: it.qty.trim(),
        order: (it.order || '').trim()
      }))
      .filter((it) => it.name || it.qty || it.order);

  async function saveDoc(): Promise<WZDocument | null> {
    const dateStr = form.dateIssued;
    const name = form.cName.trim();
    if (!dateStr) {
      toast('Podaj datę wystawienia.', true);
      return null;
    }
    if (!name) {
      toast('Podaj nazwę odbiorcy.', true);
      return null;
    }

    const { seq, number } = computeNumberFor(state.documents, editingDocId, dateStr, name, form.cCode);
    const contractor = {
      name,
      address: form.cAddress.trim(),
      nip: form.cNip.trim(),
      email: form.cEmail.trim(),
      code: form.cCode.trim().toUpperCase()
    };

    const next = structuredClone(state);
    let contractorId: string | null = form.contractorSel || null;
    if (form.saveContractor) {
      const existing = contractorId ? next.contractors.find((c) => c.id === contractorId) : null;
      if (existing) {
        Object.assign(existing, contractor);
        contractorId = existing.id;
      } else {
        const created = { id: uid(), ...contractor };
        next.contractors.push(created);
        contractorId = created.id;
      }
    }

    const nowIso = new Date().toISOString();
    const newDoc: WZDocument = {
      id: editingDocId || uid(),
      number,
      seq,
      dateIssued: dateStr,
      place: form.place.trim(),
      orderNo: form.orderNo.trim(),
      contractorId,
      contractor,
      items: collectItems(),
      notes: form.notes.trim(),
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (editingDocId) {
      const idx = next.documents.findIndex((d) => d.id === editingDocId);
      newDoc.createdAt = next.documents[idx]?.createdAt || nowIso;
      next.documents[idx] = newDoc;
    } else {
      next.documents.push(newDoc);
    }

    await onPersist(next);
    if (!editingDocId) onSaved(newDoc.id);
    return newDoc;
  }

  const handleSave = async () => {
    const saved = await saveDoc();
    if (saved) toast(`Zapisano dokument ${saved.number}.`);
  };
  const handleSavePrint = async () => {
    const saved = await saveDoc();
    if (saved) printDocument(saved, state.settings, toast);
  };
  const handleSavePdf = async () => {
    const saved = await saveDoc();
    if (saved) savePdfDocument(saved, state.settings, toast);
  };
  const handleSaveEmail = async () => {
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
              {state.contractors
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
                .map((c) => (
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
          <label className="field">
            <span>Kod do numeracji (puste = automatyczny)</span>
            <input
              type="text"
              className="input"
              data-testid="contractor-code-input"
              maxLength={6}
              placeholder={form.cName.trim() ? contractorCode(form.cName) : 'np. RS'}
              value={form.cCode}
              onChange={(e) => set({ cCode: e.target.value.toUpperCase() })}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Pozycje</h3>
        <table className="table items-table">
          <thead>
            <tr>
              <th style={{ width: 44 }} className="th-num">Lp.</th>
              <th>Nazwa towaru / opis</th>
              <th style={{ width: 140 }}>Zamówienie</th>
              <th style={{ width: 100 }}>Jedn.</th>
              <th style={{ width: 100 }} className="th-num">Ilość</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody ref={itemsBodyRef} data-testid="items-body">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="item-lp num">{i + 1}</td>
                <td>
                  <input
                    type="text"
                    className="input item-name"
                    data-testid={`item-name-${i}`}
                    aria-label="Nazwa towaru"
                    value={it.name}
                    onChange={(e) => setItem(i, { name: e.target.value })}
                    onKeyDown={(e) => onItemKeyDown(e, i)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input item-order"
                    data-testid={`item-order-${i}`}
                    aria-label="Zamówienie"
                    value={it.order || ''}
                    onChange={(e) => setItem(i, { order: e.target.value })}
                    onKeyDown={(e) => onItemKeyDown(e, i)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input item-unit"
                    data-testid={`item-unit-${i}`}
                    aria-label="Jednostka"
                    value={it.unit}
                    onChange={(e) => setItem(i, { unit: e.target.value })}
                    onKeyDown={(e) => onItemKeyDown(e, i)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input item-qty num"
                    data-testid={`item-qty-${i}`}
                    aria-label="Ilość"
                    value={it.qty}
                    onChange={(e) => setItem(i, { qty: e.target.value })}
                    onKeyDown={(e) => onItemKeyDown(e, i)}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-small btn-danger item-remove"
                    data-testid={`item-remove-${i}`}
                    aria-label="Usuń pozycję"
                    title="Usuń pozycję"
                    onClick={() => removeItemRow(i)}
                  >
                    <X className="icon" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-light" data-testid="add-item-btn" onClick={addItemRow}>
          <Plus className="icon" />
          Dodaj pozycję <span className="muted">(Enter w ostatnim wierszu)</span>
        </button>
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
