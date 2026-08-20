import { useState } from 'react';
import { Save } from 'lucide-react';

export interface ContractorFormData {
  name: string;
  nip: string;
  address: string;
  email: string;
}

interface Props {
  title: string;
  initial: ContractorFormData;
  onSave: (data: ContractorFormData) => void;
  onCancel: () => void;
}

export default function ContractorForm({ title, initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ContractorFormData>(initial);

  return (
    <div className="card" data-testid="contractor-form">
      <h3 className="card-title" data-testid="contractor-form-title">
        {title}
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
      </div>
      <div className="actions-bar">
        <button className="btn btn-primary" data-testid="save-contractor-btn" onClick={() => onSave(form)}>
          <Save className="icon" />
          Zapisz kontrahenta
        </button>
        <button className="btn btn-light" data-testid="cancel-contractor-btn" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
