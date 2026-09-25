import { useMemo, useRef, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Save, Handshake, X } from 'lucide-react';
import { AppState, Contractor, Employee } from '../types';
import SortableTh from '../components/SortableTh';
import { nextSort, sortRows, SortState } from '../lib/listing';
import { isRowBackgroundClick, useRowKeyboard } from '../hooks/useRowKeyboard';
import { contractorCode } from '../lib/numbering';
import { uid } from '../lib/storage';

interface Props {
  state: AppState;
  onPersist: (next: AppState) => Promise<void>;
  toast: (msg: string, isError?: boolean, action?: { label: string; run: () => void }) => void;
}

/** Wartość kolumny do sortowania. */
function wartosc(c: Contractor, key: string): unknown {
  switch (key) {
    case 'nip':
      return c.nip || '';
    case 'adres':
      return c.address || '';
    case 'email':
      return c.email || '';
    case 'kod':
      return c.code || contractorCode(c.name);
    default:
      return c.name;
  }
}

export default function ContractorsView({ state, onPersist, toast }: Props) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'firma', dir: 'asc' });
  // zawsze świeży stan — potrzebny przy cofaniu usunięcia
  const stateRef = useRef(state);
  stateRef.current = state;
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', nip: '', address: '', email: '', code: '' });
  const [employees, setEmployees] = useState<Employee[]>([]);

  const query = q.trim().toLowerCase();
  const list = useMemo(() => {
    const znalezieni = state.contractors.filter(
      (c) => !query || [c.name, c.nip, c.address, c.email].some((v) => String(v || '').toLowerCase().includes(query))
    );
    return sortRows(znalezieni, sort, wartosc);
  }, [state.contractors, query, sort]);
  const sortuj = (key: string) => setSort((s) => nextSort(s, key, false));

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

  // Usuwamy od razu, z możliwością cofnięcia — bez okienka z pytaniem
  const deleteContractor = async (id: string) => {
    const kopia = state.contractors.find((x) => x.id === id);
    if (!kopia) return;
    const zapasowa = structuredClone(kopia);
    await onPersist({ ...state, contractors: state.contractors.filter((x) => x.id !== id) });
    toast(`Usunięto kontrahenta „${zapasowa.name}”. Wystawione dokumenty zostały bez zmian.`, false, {
      label: 'Cofnij',
      run: () => {
        const teraz = stateRef.current;
        if (teraz.contractors.some((c) => c.id === zapasowa.id)) return;
        onPersist({ ...teraz, contractors: [...teraz.contractors, zapasowa] });
      }
    });
  };

  return (
    <section className="view" data-testid="view-contractors">
      <header className="view-head">
        <h1 className="page-title">Kontrahenci</h1>
        {anyContractors && (
          <p className="view-meta" data-testid="contractors-count">
            {state.contractors.length} {state.contractors.length === 1 ? 'firma' : 'firm'} ·{' '}
            {state.contractors.filter((c) => c.email).length} z adresem e-mail ·{' '}
            {state.contractors.filter((c) => c.employees?.length).length} z pracownikami
          </p>
        )}
      </header>
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
          <table className="table table-rows" data-testid="contractors-table">
            <thead>
              <tr>
                <SortableTh label="Firma / Imię" sortKey="firma" sort={sort} onSort={sortuj} />
                <SortableTh label="NIP" sortKey="nip" sort={sort} onSort={sortuj} style={{ width: 150 }} />
                <SortableTh label="Adres" sortKey="adres" sort={sort} onSort={sortuj} />
                <SortableTh label="E-mail" sortKey="email" sort={sort} onSort={sortuj} style={{ width: 210 }} />
                <SortableTh label="Kod" sortKey="kod" sort={sort} onSort={sortuj} style={{ width: 84 }} />
                <th className="th-actions" style={{ width: 170 }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <ContractorRow key={c.id} kolejnosc={i} contractor={c} onOpen={openForm} onDelete={deleteContractor} />
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
          <h2 className="empty-title">Baza kontrahentów jest pusta</h2>
          <p>Odbiorcy zapisani przy wystawianiu WZ trafią tutaj sami. Możesz też dodać firmę ręcznie.</p>
          <button className="btn btn-primary" data-testid="empty-new-contractor-btn" onClick={() => openForm(null)}>
            <Plus className="icon" />
            Dodaj kontrahenta
          </button>
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
              <span>Kod w numerze dokumentu</span>
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

interface RowProps {
  contractor: Contractor;
  kolejnosc: number;
  onOpen: (c: Contractor) => void;
  onDelete: (id: string) => void;
}

function ContractorRow({ contractor: c, kolejnosc, onOpen, onDelete }: RowProps) {
  const naKlawisz = useRowKeyboard({ onEnter: () => onOpen(c) });
  return (
    <tr
      data-row
      tabIndex={0}
      style={{ ['--i' as string]: Math.min(kolejnosc, 12) }}
      data-testid={`contractor-row-${c.id}`}
      aria-label={`Kontrahent ${c.name}`}
      onClick={(e) => isRowBackgroundClick(e) && e.currentTarget.focus()}
      onDoubleClick={(e) => isRowBackgroundClick(e) && onOpen(c)}
      onKeyDown={naKlawisz}
    >
      <td>{c.name}</td>
      <td className="num">{c.nip}</td>
      <td>{c.address}</td>
      <td>{c.email}</td>
      <td className="num">{c.code || contractorCode(c.name)}</td>
      <td>
        <div className="row-actions">
          <button className="btn btn-small btn-light" data-testid={`contractor-edit-${c.id}`} onClick={() => onOpen(c)}>
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
  );
}
