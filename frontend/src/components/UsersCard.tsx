import { useState } from 'react';
import { Plus, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { AppState, AskConfirm, UserAccount, UserRole } from '../types';
import { createUser, findUser, hashPassword, normalizujLogin, OPISY_STANOWISK, OPISY_UPRAWNIEN } from '../lib/auth';

interface Props {
  state: AppState;
  /** Kto to zmienia — nie wolno odebrać sobie własnego dostępu */
  currentUser: UserAccount | null;
  onPersist: (next: AppState) => Promise<void>;
  toast: (msg: string, isError?: boolean) => void;
  askConfirm: AskConfirm;
}

const STANOWISKA: UserRole[] = ['wlasciciel', 'biuro', 'warsztat'];

export default function UsersCard({ state, currentUser, onPersist, toast, askConfirm }: Props) {
  const users = state.users || [];
  const [nowy, setNowy] = useState({ login: '', name: '', role: 'warsztat' as UserRole, haslo: '' });
  const [zmianaHasla, setZmianaHasla] = useState<{ id: string; haslo: string } | null>(null);

  /** Konta zapisujemy od razu, osobno od reszty ustawień. Hasło to nie jest
   *  rzecz, przy której ktoś ma pamiętać o kliknięciu „Zapisz”. */
  const zapisz = (lista: UserAccount[]) => onPersist({ ...state, users: lista });

  const ilu = (role: UserRole) => users.filter((u) => u.role === role && !u.disabled).length;

  const dodaj = async () => {
    const login = normalizujLogin(nowy.login);
    if (!login) return toast('Podaj login.', true);
    if (findUser(users, login)) return toast('Taki login już istnieje.', true);
    if (nowy.haslo.length < 6) return toast('Hasło musi mieć co najmniej 6 znaków.', true);
    const konto = await createUser({ login, name: nowy.name || login, role: nowy.role, haslo: nowy.haslo });
    const pierwsze = users.length === 0;
    await zapisz([...users, konto]);
    setNowy({ login: '', name: '', role: 'warsztat', haslo: '' });
    toast(
      `Konto „${konto.login}” założone — stanowisko: ${OPISY_STANOWISK[konto.role]}.` +
        // Bieżącej pracy nie przerywamy: zamek zaczyna działać od następnego
        // uruchomienia, żeby nikt nie został wyrzucony z programu w pół zdania.
        (pierwsze ? ' Program zacznie prosić o logowanie od następnego uruchomienia.' : '')
    );
  };

  const ustawHaslo = async (u: UserAccount, haslo: string) => {
    if (haslo.length < 6) return toast('Hasło musi mieć co najmniej 6 znaków.', true);
    const skrot = await hashPassword(haslo);
    await zapisz(users.map((x) => (x.id === u.id ? { ...x, password: skrot } : x)));
    setZmianaHasla(null);
    toast(`Nowe hasło dla „${u.login}” zapisane.`);
  };

  const zmien = async (u: UserAccount, patch: Partial<UserAccount>) => {
    // Ostatni właściciel musi zostać właścicielem i musi być włączony —
    // inaczej da się jednym kliknięciem zamknąć sobie program na zawsze.
    const po = users.map((x) => (x.id === u.id ? { ...x, ...patch } : x));
    if (!po.some((x) => x.role === 'wlasciciel' && !x.disabled)) {
      toast('Musi zostać przynajmniej jedno włączone konto właściciela.', true);
      return;
    }
    await zapisz(po);
  };

  const usun = async (u: UserAccount) => {
    if (u.id === currentUser?.id) return toast('Nie usuwaj konta, na którym właśnie pracujesz.', true);
    if (u.role === 'wlasciciel' && ilu('wlasciciel') <= 1) {
      return toast('To jedyne konto właściciela — bez niego nikt nie wejdzie do ustawień.', true);
    }
    const ok = await askConfirm(
      `Usunąć konto „${u.login}”? Wpisy w historii zleceń zostaną, bo podpisane są imieniem.`,
      { confirmLabel: 'Usuń', danger: true }
    );
    if (!ok) return;
    await zapisz(users.filter((x) => x.id !== u.id));
    toast('Konto usunięte.');
  };

  return (
    <div className="card" data-testid="users-card">
      <h3 className="card-title">Konta i stanowiska</h3>
      <p className="muted card-note">
        Stanowisko decyduje, co widać po zalogowaniu.
        {STANOWISKA.map((r) => (
          <span key={r} style={{ display: 'block', marginTop: 4 }}>
            <strong>{OPISY_STANOWISK[r]}</strong> — {OPISY_UPRAWNIEN[r]}
          </span>
        ))}
      </p>

      {users.map((u) => (
        <div className={'user-row' + (u.disabled ? ' disabled' : '')} key={u.id} data-testid={`user-row-${u.login}`}>
          <input
            type="text"
            className="input"
            data-testid={`user-name-${u.login}`}
            aria-label="Imię i nazwisko"
            value={u.name}
            onChange={(e) => void zmien(u, { name: e.target.value })}
          />
          <span className="mono" data-testid={`user-login-${u.login}`}>
            {u.login}
          </span>
          <select
            className="input"
            data-testid={`user-role-${u.login}`}
            aria-label="Stanowisko"
            value={u.role}
            onChange={(e) => void zmien(u, { role: e.target.value as UserRole })}
          >
            {STANOWISKA.map((r) => (
              <option key={r} value={r}>
                {OPISY_STANOWISK[r]}
              </option>
            ))}
          </select>
          <label className="checkbox-field" title="Wyłączone konto nie wpuszcza, ale zostaje w historii">
            <input
              type="checkbox"
              data-testid={`user-active-${u.login}`}
              checked={!u.disabled}
              onChange={(e) => void zmien(u, { disabled: !e.target.checked })}
            />
            <span>czynne</span>
          </label>
          <div className="spec-row-actions">
            <button
              className="btn btn-small btn-light item-remove"
              data-testid={`user-password-${u.login}`}
              aria-label="Ustaw nowe hasło"
              title="Ustaw nowe hasło"
              onClick={() => setZmianaHasla({ id: u.id, haslo: '' })}
            >
              <KeyRound className="icon" />
            </button>
            <button
              className="btn btn-small btn-danger item-remove"
              data-testid={`user-remove-${u.login}`}
              aria-label="Usuń konto"
              onClick={() => void usun(u)}
            >
              <Trash2 className="icon" />
            </button>
          </div>
          {zmianaHasla?.id === u.id && (
            <div className="user-row" style={{ gridColumn: '1 / -1' }}>
              <input
                type="password"
                className="input"
                data-testid={`user-new-password-${u.login}`}
                placeholder="nowe hasło, co najmniej 6 znaków"
                autoFocus
                value={zmianaHasla.haslo}
                onChange={(e) => setZmianaHasla({ id: u.id, haslo: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && void ustawHaslo(u, zmianaHasla.haslo)}
              />
              <button
                className="btn btn-small btn-primary"
                data-testid={`user-save-password-${u.login}`}
                onClick={() => void ustawHaslo(u, zmianaHasla.haslo)}
              >
                Zapisz hasło
              </button>
              <button className="btn btn-small btn-light" onClick={() => setZmianaHasla(null)}>
                Anuluj
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="user-row" style={{ marginTop: 12 }}>
        <input
          type="text"
          className="input"
          data-testid="new-user-name"
          placeholder="imię i nazwisko"
          value={nowy.name}
          onChange={(e) => setNowy({ ...nowy, name: e.target.value })}
        />
        <input
          type="text"
          className="input"
          data-testid="new-user-login"
          placeholder="login"
          value={nowy.login}
          onChange={(e) => setNowy({ ...nowy, login: e.target.value })}
        />
        <select
          className="input"
          data-testid="new-user-role"
          aria-label="Stanowisko"
          value={nowy.role}
          onChange={(e) => setNowy({ ...nowy, role: e.target.value as UserRole })}
        >
          {STANOWISKA.map((r) => (
            <option key={r} value={r}>
              {OPISY_STANOWISK[r]}
            </option>
          ))}
        </select>
        <input
          type="password"
          className="input"
          data-testid="new-user-password"
          placeholder="hasło"
          value={nowy.haslo}
          onChange={(e) => setNowy({ ...nowy, haslo: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && void dodaj()}
        />
        <button className="btn btn-light" data-testid="add-user" onClick={() => void dodaj()}>
          <UserPlus className="icon" />
          Dodaj
        </button>
      </div>
      {!users.length && (
        <p className="muted employees-empty" data-testid="users-empty">
          Nie ma jeszcze żadnego konta — program nie prosi o logowanie. Pierwsze konto zamyka
          program na hasło.
        </p>
      )}
      <p className="muted field-hint" style={{ marginTop: 12 }}>
        <Plus className="icon" style={{ opacity: 0 }} />
        Logowanie pilnuje, kto używa programu — nie szyfruje pliku z danymi. Kto ma dostęp do tego
        komputera i wie, gdzie szukać, przeczyta zlecenia i oferty bez uruchamiania programu; przed
        tym chroni osobne konto Windows albo szyfrowanie dysku.
      </p>
    </div>
  );
}
