import { useState } from 'react';
import { Search, Plus, Pencil, Trash2, Save, Handshake, X } from 'lucide-react';
import { AppState, AskConfirm, Contractor, Employee } from '../types';
import { contractorCode } from '../lib/numbering';
import { uid } from '../lib/storage';

interface Props {
  state: AppState;
  onPersist: (next: AppState) => Promise<void>;
  toast: (msg: string, isError?: boolean) => void;
  askConfirm: AskConfirm;
}

export default function ContractorsView({ state, onPersist, toast, askConfirm }: Props) {
  const [q, setQ] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', nip: '', address: '', email: '', code: '' });
  const [employees, setEmployees] = useState<Employee[]>([]);

  const query = q.trim().toLowerCase();
  const list = state.contractors
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    .filter(
      (c) => !query || [c.name, c.nip, c.address, c.email].some((v) => String(v || '').toLowerCase().includes(query))
    );

  const anyContractors = state.contractors.length > 0;
  const editingContractor = editingId ? state.contractors.find((c) => c.id === editingId) : null;

  const openForm = (c: Contractor | null) => {
    setEditingId(c?.id || null);
    setForm({ name: c?.name || '', nip: c?.nip || '', address: c?.address || '', email: c?.email || '', code: c?.code || '' });
    setEmployees(c?.employees ? c.employees.map((e) => ({ ...e })) : []);
    setFormOpen(true);
  };

  const saveForm = async () => {
    const name = form.name.trim();
    if (!name) {
      toast('Podaj nazwę kontrahenta.', true);
      return;
    }
    const data = {
      name,
      nip: form.nip.trim(),
      address: form.address.trim(),
      email: form.email.trim(),
      code: form.code.trim().toUpperCase(),
      employees: employees
        .map((e) => ({ ...e, name: e.name.trim(), role: (e.role || '').trim(), phone: (e.phone || '').trim() }))
        .filter((e) => e.name)
    };
    const next = structuredClone(state);
    const existing = editingId ? next.contractors.find((c) => c.id === editingId) : null;
    if (existing) Object.assign(existing, data);
    else next.contractors.push({ id: uid(), ...data });
    await onPersist(next);
    setFormOpen(false);
    toast('Zapisano kontrahenta.');
  };

  const addEmployee = () => setEmployees((arr) => [...arr, { id: uid(), name: '', role: '', phone: '' }]);

  const setEmployee = (id: string, patch: Partial<Employee>) =>
    setEmployees((arr) => arr.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removeEmployee = (id: string) => setEmployees((arr) => arr.filter((e) => e.id !== id));

  const deleteContractor = async (id: string) => {
    const c = state.contractors.find((x) => x.id === id);
    if (!(await askConfirm(`Usunąć kontrahenta „${c?.name}” z bazy? Wystawione dokumenty pozostaną bez zmian.`))) return;
    const next = { ...state, contractors: state.contractors.filter((x) => x.id !== id) };
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

      {anyContractors && (
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
                  <td>{c.code || contractorCode(c.name)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-small btn-light" data-testid={`contractor-edit-${c.id}`} onClick={() => openForm(c)}>
                        <Pencil className="icon" />
                        Edytuj
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        data-testid={`contractor-delete-${c.id}`}
                        aria-label="Usuń"
                        title="Usuń"
                        onClick={() => deleteContractor(c.id)}
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
      )}

      {!anyContractors && (
        <div className="empty" data-testid="contractors-empty">
          <Handshake className="icon" />
          <p>Brak kontrahentów w bazie. Odbiorcy zapisani przy wystawianiu WZ pojawią się tutaj.</p>
        </div>
      )}

      {formOpen && (
        <div className="card" data-testid="contractor-form">
          <h3 className="card-title" data-testid="contractor-form-title">
            {editingContractor ? `Edycja: ${editingContractor.name}` : 'Nowy kontrahent'}
          </h3>
          <div className="grid2">
            <label className="field">
              <span>Firma / Imię i nazwisko *</span>
              <input type="text" className="input" data-testid="cf-name-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span>NIP</span>
              <input type="text" className="input" data-testid="cf-nip-input" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
            </label>
            <label className="field">
              <span>Adres</span>
              <input type="text" className="input" data-testid="cf-address-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input type="email" className="input" data-testid="cf-email-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field">
              <span>Kod do numeracji (puste = automatyczny)</span>
              <input
                type="text"
                className="input"
                data-testid="cf-code-input"
                maxLength={6}
                placeholder={form.name.trim() ? contractorCode(form.name) : 'np. RS'}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </label>
          </div>
          <div className="employees-block">
            <div className="employees-head">
              <span className="field-label">Pracownicy firmy</span>
              <span className="muted">Podpowiadani w polu „Kto odebrał” przy wystawianiu WZ.</span>
            </div>
            {employees.length > 0 && (
              <table className="table items-table" data-testid="employees-table">
                <thead>
                  <tr>
                    <th>Imię i nazwisko</th>
                    <th style={{ width: 180 }}>Stanowisko</th>
                    <th style={{ width: 150 }}>Telefon</th>
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody data-testid="employees-body">
                  {employees.map((e, i) => (
                    <tr key={e.id}>
                      <td>
                        <input
                          type="text"
                          className="input"
                          data-testid={`employee-name-${i}`}
                          aria-label="Imię i nazwisko pracownika"
                          value={e.name}
                          onChange={(ev) => setEmployee(e.id, { name: ev.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input"
                          data-testid={`employee-role-${i}`}
                          aria-label="Stanowisko"
                          value={e.role || ''}
                          onChange={(ev) => setEmployee(e.id, { role: ev.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input"
                          data-testid={`employee-phone-${i}`}
                          aria-label="Telefon"
                          value={e.phone || ''}
                          onChange={(ev) => setEmployee(e.id, { phone: ev.target.value })}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-small btn-danger item-remove"
                          data-testid={`employee-remove-${i}`}
                          aria-label="Usuń pracownika"
                          title="Usuń pracownika"
                          onClick={() => removeEmployee(e.id)}
                        >
                          <X className="icon" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!employees.length && <p className="muted employees-empty">Nie dodano jeszcze żadnego pracownika.</p>}
            <button className="btn btn-light" data-testid="add-employee-btn" onClick={addEmployee}>
              <Plus className="icon" />
              Dodaj pracownika
            </button>
          </div>

          <div className="actions-bar">
            <button className="btn btn-primary" data-testid="save-contractor-btn" onClick={saveForm}>
              <Save className="icon" />
              Zapisz kontrahenta
            </button>
            <button className="btn btn-light" data-testid="cancel-contractor-btn" onClick={() => setFormOpen(false)}>
              Anuluj
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
