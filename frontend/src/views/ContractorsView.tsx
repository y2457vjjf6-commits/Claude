import { useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Handshake } from 'lucide-react';
import { AppState, AskConfirm, Contractor } from '../types';
import { contractorCode } from '../lib/numbering';
import { uid } from '../lib/storage';
import { ToastFn } from '../hooks/useToastMessage';
import ContractorForm, { ContractorFormData } from '../components/ContractorForm';

interface Props {
  state: AppState;
  onPersist: (next: AppState) => Promise<void>;
  toast: ToastFn;
  askConfirm: AskConfirm;
}

interface RowActions {
  onEdit: (c: Contractor) => void;
  onDelete: (id: string) => void;
}

function ContractorTable({ list, q, onEdit, onDelete }: { list: Contractor[]; q: string } & RowActions) {
  return (
    <div className="table-card">
      <table className="table" data-testid="contractors-table">
        <thead>
          <tr>
            <th>Firma / Imię</th>
            <th style={{ width: 140 }}>NIP</th>
            <th>Adres</th>
            <th style={{ width: 210 }}>E-mail</th>
            <th style={{ width: 70 }}>Kod</th>
            <th style={{ width: 170 }}>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} data-testid={`contractor-row-${c.id}`}>
              <td>{c.name}</td>
              <td className="num">{c.nip}</td>
              <td>{c.address}</td>
              <td>{c.email}</td>
              <td>{contractorCode(c.name)}</td>
              <td>
                <div className="row-actions">
                  <button className="btn btn-small btn-light" data-testid={`contractor-edit-${c.id}`} onClick={() => onEdit(c)}>
                    <Pencil className="icon" />
                    Edytuj
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    data-testid={`contractor-delete-${c.id}`}
                    aria-label="Usuń"
                    title="Usuń"
                    onClick={() => onDelete(c.id)}
                  >
                    <Trash2 className="icon" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!list.length && (
            <tr>
              <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                Brak wyników dla „{q.trim()}”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ContractorsView({ state, onPersist, toast, askConfirm }: Props) {
  const [q, setQ] = useState<string>('');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const list = useMemo(
    () =>
      state.contractors
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
        .filter(
          (c) =>
            !query || [c.name, c.nip, c.address, c.email].some((v) => String(v || '').toLowerCase().includes(query))
        ),
    [state.contractors, query]
  );

  const anyContractors = state.contractors.length > 0;
  const editingContractor = editingId ? state.contractors.find((c) => c.id === editingId) : null;

  const openForm = (c: Contractor | null): void => {
    setEditingId(c?.id || null);
    setFormOpen(true);
  };

  const saveForm = async (data: ContractorFormData): Promise<void> => {
    const name = data.name.trim();
    if (!name) {
      toast('Podaj nazwę kontrahenta.', true);
      return;
    }
    const trimmed = { name, nip: data.nip.trim(), address: data.address.trim(), email: data.email.trim() };
    const next = structuredClone(state);
    const existing = editingId ? next.contractors.find((c) => c.id === editingId) : null;
    if (existing) Object.assign(existing, trimmed);
    else next.contractors.push({ id: uid(), ...trimmed });
    await onPersist(next);
    setFormOpen(false);
    toast('Zapisano kontrahenta.');
  };

  const deleteContractor = async (id: string): Promise<void> => {
    const c = state.contractors.find((x) => x.id === id);
    if (!(await askConfirm(`Usunąć kontrahenta „${c?.name}” z bazy? Wystawione dokumenty pozostaną bez zmian.`))) return;
    const next: AppState = { ...state, contractors: state.contractors.filter((x) => x.id !== id) };
    await onPersist(next);
  };

  return (
    <section className="view" data-testid="view-contractors">
      <h1 className="page-title">Kontrahenci</h1>
      <div className="toolbar">
        <div className="search-wrap">
          <Search className="icon" />
          <input
            type="search"
            className="input"
            data-testid="search-contractors-input"
            placeholder="Szukaj kontrahenta…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn btn-primary" data-testid="new-contractor-btn" onClick={() => openForm(null)}>
          <Plus className="icon" />
          Dodaj kontrahenta
        </button>
      </div>

      {anyContractors && <ContractorTable list={list} q={q} onEdit={openForm} onDelete={deleteContractor} />}

      {!anyContractors && (
        <div className="empty" data-testid="contractors-empty">
          <Handshake className="icon" />
          <p>Brak kontrahentów w bazie. Odbiorcy zapisani przy wystawianiu WZ pojawią się tutaj.</p>
        </div>
      )}

      {formOpen && (
        <ContractorForm
          key={editingId || 'new'}
          title={editingContractor ? `Edycja: ${editingContractor.name}` : 'Nowy kontrahent'}
          initial={{
            name: editingContractor?.name || '',
            nip: editingContractor?.nip || '',
            address: editingContractor?.address || '',
            email: editingContractor?.email || ''
          }}
          onSave={saveForm}
          onCancel={() => setFormOpen(false)}
        />
      )}
    </section>
  );
}
