import { useState } from 'react';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { AppState, UserAccount } from '../types';
import { createUser, login as sprawdzLogowanie } from '../lib/auth';

interface Props {
  state: AppState;
  /** Zalogowano — dalej decyduje App */
  onLogin: (user: UserAccount) => void;
  /** Pierwsze konto właściciela, zakładane przy starcie bez kont */
  onCreateOwner: (user: UserAccount) => Promise<void>;
}

export default function LoginView({ state, onLogin, onCreateOwner }: Props) {
  const konta = (state.users || []).filter((u) => !u.disabled);
  const zakladanie = konta.length === 0;

  const [log, setLog] = useState('');
  const [haslo, setHaslo] = useState('');
  const [haslo2, setHaslo2] = useState('');
  const [imie, setImie] = useState('');
  const [blad, setBlad] = useState('');
  const [pracuje, setPracuje] = useState(false);

  const zaloguj = async () => {
    setBlad('');
    setPracuje(true);
    try {
      const wynik = await sprawdzLogowanie(state.users, { login: log, haslo });
      if (wynik.ok) {
        onLogin(wynik.user);
        return;
      }
      // Ten sam komunikat dla złego loginu i złego hasła: podpowiadanie,
      // który login istnieje, ułatwia tylko zgadywanie.
      setBlad(
        wynik.powod === 'konto-wylaczone'
          ? 'To konto jest wyłączone. Poproś właściciela o włączenie.'
          : 'Nieprawidłowy login lub hasło.'
      );
    } finally {
      setPracuje(false);
    }
  };

  const zaloz = async () => {
    setBlad('');
    if (!log.trim()) return setBlad('Podaj login.');
    if (haslo.length < 6) return setBlad('Hasło musi mieć co najmniej 6 znaków.');
    if (haslo !== haslo2) return setBlad('Hasła nie są takie same.');
    setPracuje(true);
    try {
      await onCreateOwner(
        await createUser({ login: log, name: imie.trim() || log.trim(), role: 'wlasciciel', haslo })
      );
    } finally {
      setPracuje(false);
    }
  };

  const naEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !pracuje) void (zakladanie ? zaloz() : zaloguj());
  };

  return (
    <div className="login-screen" data-testid="login-screen">
      <div className="login-box">
        <div className="login-brand">
          <div className="brand-logo">LECHROL</div>
          <div className="brand-sub">Wydania, oferty i produkcja</div>
        </div>

        {zakladanie ? (
          <>
            <h1 className="login-title">Załóż konto właściciela</h1>
            <p className="muted login-note">
              Pierwsze konto ma pełny dostęp i zakłada konta pozostałym. Konta pracowników
              dodasz później w Ustawieniach.
            </p>
            <label className="field">
              <span>Login</span>
              <input
                type="text"
                className="input"
                data-testid="setup-login"
                autoFocus
                value={log}
                onChange={(e) => setLog(e.target.value)}
                onKeyDown={naEnter}
              />
            </label>
            <label className="field">
              <span>Imię i nazwisko</span>
              <input
                type="text"
                className="input"
                data-testid="setup-name"
                placeholder="podpisuje wpisy w historii zleceń"
                value={imie}
                onChange={(e) => setImie(e.target.value)}
                onKeyDown={naEnter}
              />
            </label>
            <label className="field">
              <span>Hasło</span>
              <input
                type="password"
                className="input"
                data-testid="setup-password"
                value={haslo}
                onChange={(e) => setHaslo(e.target.value)}
                onKeyDown={naEnter}
              />
            </label>
            <label className="field">
              <span>Powtórz hasło</span>
              <input
                type="password"
                className="input"
                data-testid="setup-password2"
                value={haslo2}
                onChange={(e) => setHaslo2(e.target.value)}
                onKeyDown={naEnter}
              />
            </label>
            {blad && (
              <p className="login-error" data-testid="login-error">
                {blad}
              </p>
            )}
            <button className="btn btn-primary login-submit" data-testid="setup-submit" disabled={pracuje} onClick={() => void zaloz()}>
              {pracuje ? <Loader2 className="icon spin" /> : <ShieldCheck className="icon" />}
              Załóż konto i wejdź
            </button>
            <p className="muted login-foot">
              Logowanie pilnuje, kto używa programu — nie szyfruje danych na dysku. Komu nie wolno
              widzieć zleceń i ofert, ten nie powinien mieć dostępu do tego komputera.
            </p>
          </>
        ) : (
          <>
            <h1 className="login-title">Zaloguj się</h1>
            <label className="field">
              <span>Login</span>
              <input
                type="text"
                className="input"
                data-testid="login-login"
                autoFocus
                autoComplete="username"
                value={log}
                onChange={(e) => setLog(e.target.value)}
                onKeyDown={naEnter}
              />
            </label>
            <label className="field">
              <span>Hasło</span>
              <input
                type="password"
                className="input"
                data-testid="login-password"
                autoComplete="current-password"
                value={haslo}
                onChange={(e) => setHaslo(e.target.value)}
                onKeyDown={naEnter}
              />
            </label>
            {blad && (
              <p className="login-error" data-testid="login-error">
                {blad}
              </p>
            )}
            <button className="btn btn-primary login-submit" data-testid="login-submit" disabled={pracuje} onClick={() => void zaloguj()}>
              {pracuje ? <Loader2 className="icon spin" /> : <LogIn className="icon" />}
              Wejdź
            </button>
            <p className="muted login-foot">
              Nie pamiętasz hasła? Właściciel ustawia je od nowa w Ustawieniach → Konta i stanowiska.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
