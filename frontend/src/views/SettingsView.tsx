import { useEffect, useState } from 'react';
import { Save, PlugZap, Loader2 } from 'lucide-react';
import { AppState } from '../types';
import { dataLocation, hasApi } from '../lib/storage';

interface Props {
  state: AppState;
  onPersist: (next: AppState) => Promise<void>;
  toast: (msg: string, isError?: boolean) => void;
}

export default function SettingsView({ state, onPersist, toast }: Props) {
  const st = state.settings;
  const [form, setForm] = useState({
    sName: st.seller.name,
    sNip: st.seller.nip,
    sAddress: st.seller.address,
    sPhone: st.seller.phone,
    sWww: st.seller.www,
    sPlace: st.place,
    mHost: st.smtp.host,
    mPort: st.smtp.port ? String(st.smtp.port) : '',
    mUser: st.smtp.user,
    mPass: st.smtp.pass,
    mFrom: st.smtp.from,
    mSubject: st.emailSubject,
    mCopyTo: st.emailCopyTo || '',
    mBody: st.emailBody
  });
  const [location, setLocation] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (hasApi) dataLocation().then(setLocation);
  }, []);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const next = structuredClone(state);
    next.settings.seller.name = form.sName.trim();
    next.settings.seller.nip = form.sNip.trim();
    next.settings.seller.address = form.sAddress.trim();
    next.settings.seller.phone = form.sPhone.trim();
    next.settings.seller.www = form.sWww.trim();
    next.settings.place = form.sPlace.trim();
    next.settings.smtp = {
      host: form.mHost.trim(),
      port: Number(form.mPort) || 587,
      user: form.mUser.trim(),
      pass: form.mPass,
      from: form.mFrom.trim()
    };
    next.settings.emailSubject = form.mSubject;
    next.settings.emailCopyTo = form.mCopyTo.trim();
    next.settings.emailBody = form.mBody;
    await onPersist(next);
    toast('Zapisano ustawienia.');
  };

  const testEmail = async () => {
    if (!hasApi || !window.wzApi) {
      toast('Test poczty działa tylko w aplikacji na komputerze.', true);
      return;
    }
    if (!form.mHost.trim() || !form.mUser.trim()) {
      toast('Podaj serwer SMTP i login, zanim sprawdzisz połączenie.', true);
      return;
    }
    setTesting(true);
    try {
      const res = await window.wzApi.testEmail({
        host: form.mHost.trim(),
        port: Number(form.mPort) || 587,
        user: form.mUser.trim(),
        pass: form.mPass,
        from: form.mFrom.trim()
      });
      if (res.ok) toast('Połączenie z serwerem poczty działa — dane są poprawne.');
      else toast(res.error || 'Nie udało się połączyć z serwerem poczty.', true);
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="view" data-testid="view-settings">
      <h1 className="page-title">Ustawienia</h1>
      <div className="card">
        <h3 className="card-title">Dane sprzedawcy / wydającego (nagłówek dokumentu)</h3>
        <div className="grid2">
          <label className="field">
            <span>Nazwa firmy</span>
            <input type="text" className="input" data-testid="seller-name-input" value={form.sName} onChange={(e) => set({ sName: e.target.value })} />
          </label>
          <label className="field">
            <span>NIP</span>
            <input type="text" className="input" data-testid="seller-nip-input" value={form.sNip} onChange={(e) => set({ sNip: e.target.value })} />
          </label>
          <label className="field">
            <span>Adres</span>
            <input type="text" className="input" data-testid="seller-address-input" value={form.sAddress} onChange={(e) => set({ sAddress: e.target.value })} />
          </label>
          <label className="field">
            <span>Telefon</span>
            <input type="text" className="input" data-testid="seller-phone-input" value={form.sPhone} onChange={(e) => set({ sPhone: e.target.value })} />
          </label>
          <label className="field">
            <span>Strona www</span>
            <input type="text" className="input" data-testid="seller-www-input" value={form.sWww} onChange={(e) => set({ sWww: e.target.value })} />
          </label>
          <label className="field">
            <span>Domyślne miejsce wystawienia</span>
            <input type="text" className="input" data-testid="seller-place-input" value={form.sPlace} onChange={(e) => set({ sPlace: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Poczta e-mail (wysyłka WZ jako PDF)</h3>
        <p className="muted card-note">
          Opcjonalne. Wymaga dostępu do internetu w chwili wysyłki. Dane logowania do skrzynki nadawczej (SMTP)
          znajdziesz u swojego dostawcy poczty.
        </p>
        <div className="grid2">
          <label className="field">
            <span>Serwer SMTP (np. smtp.gmail.com)</span>
            <input type="text" className="input" data-testid="smtp-host-input" value={form.mHost} onChange={(e) => set({ mHost: e.target.value })} />
          </label>
          <label className="field">
            <span>Port (587 lub 465)</span>
            <input type="number" className="input" data-testid="smtp-port-input" placeholder="587" value={form.mPort} onChange={(e) => set({ mPort: e.target.value })} />
          </label>
          <label className="field">
            <span>Login (adres e-mail)</span>
            <input type="text" className="input" data-testid="smtp-user-input" value={form.mUser} onChange={(e) => set({ mUser: e.target.value })} />
          </label>
          <label className="field">
            <span>Hasło</span>
            <input type="password" className="input" data-testid="smtp-pass-input" value={form.mPass} onChange={(e) => set({ mPass: e.target.value })} />
          </label>
          <label className="field">
            <span>Nadawca (pole „Od”)</span>
            <input type="text" className="input" data-testid="smtp-from-input" placeholder="np. biuro@lechrol.pl" value={form.mFrom} onChange={(e) => set({ mFrom: e.target.value })} />
          </label>
          <label className="field">
            <span>Kopia dla nas (ukryta, UDW)</span>
            <input
              type="email"
              className="input"
              data-testid="email-copy-input"
              placeholder="np. lechrol@lechrol.pl"
              value={form.mCopyTo}
              onChange={(e) => set({ mCopyTo: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Temat wiadomości ({'{numer}'} = numer WZ)</span>
            <input type="text" className="input" data-testid="email-subject-input" value={form.mSubject} onChange={(e) => set({ mSubject: e.target.value })} />
          </label>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Treść wiadomości ({'{numer}'} = numer WZ, {'{odebral}'} = kto odebrał)</span>
          <textarea className="input" data-testid="email-body-input" rows={4} value={form.mBody} onChange={(e) => set({ mBody: e.target.value })} />
        </label>
        <div className="actions-bar" style={{ marginTop: 16 }}>
          <button className="btn" data-testid="test-email-btn" onClick={testEmail} disabled={testing}>
            {testing ? <Loader2 className="icon icon-spin" /> : <PlugZap className="icon" />}
            {testing ? 'Sprawdzam połączenie…' : 'Testuj połączenie'}
          </button>
          <span className="muted">Sprawdza serwer, port, login i hasło — bez wysyłania wiadomości.</span>
        </div>
      </div>

      <div className="actions-bar">
        <button className="btn btn-primary" data-testid="save-settings-btn" onClick={save}>
          <Save className="icon" />
          Zapisz ustawienia
        </button>
        {location && (
          <span className="muted" data-testid="data-location">
            Dane zapisywane w pliku: {location}
          </span>
        )}
      </div>
    </section>
  );
}
