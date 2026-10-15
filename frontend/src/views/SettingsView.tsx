import { useEffect, useState } from 'react';
import {
  Save, PlugZap, Loader2, FolderOpen, HardDriveDownload, HardDriveUpload, Plus, X, ChevronUp, ChevronDown
} from 'lucide-react';
import { movedBy } from '../lib/offers';
import { etapy } from '../lib/production';
import { zestawy } from '../lib/specTemplates';
import { ODDZIALY, OPISY_ODDZIALOW } from '../lib/departments';
import { wolno } from '../lib/auth';
import UsersCard from '../components/UsersCard';
import { uid } from '../lib/storage';
import { AppState, UserAccount } from '../types';
import { dataLocation, hasApi } from '../lib/storage';
import { backupNow, chooseBackupFolder, restoreBackup } from '../lib/backup';
import { MAX_BOK, resizePhoto } from '../lib/photos';
import { AskConfirm } from '../types';

interface Props {
  state: AppState;
  /** Kto jest zalogowany; null = program bez kont */
  currentUser: UserAccount | null;
  onPersist: (next: AppState) => Promise<void>;
  toast: (msg: string, isError?: boolean) => void;
  askConfirm: AskConfirm;
}

export default function SettingsView({ state, currentUser, onPersist, toast, askConfirm }: Props) {
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
    backupFolder: st.backupFolder || '',
    issuerRows: (st.issuers || []).map((n) => ({
      name: n,
      phone: (st.issuerPhones || {})[n] || ''
    })),
    photoRows: (st.productPhotos || []).map((z) => ({ ...z })),
    stageRows: etapy(st.stages).map((e) => ({ ...e })),
    specPresetRows: zestawy(st).map((z) => ({ ...z, departments: [...z.departments], rows: z.rows.map((w) => ({ ...w })) })),
    specRows: (st.specTemplates || []).map((t) => ({
      name: t.name,
      rows: (t.rows || []).map((w) => ({ ...w }))
    })),
    offerDeadlineDays: st.offerDefaults?.deadlineDays || '21',
    offerValidityDays: st.offerDefaults?.validityDays || '30',
    offerValidityEnabled: st.offerDefaults?.validityEnabled ?? false,
    offerInstallation: st.offerDefaults?.installationIncluded ?? true,
    offerClosingText: st.offerClosingText || '',
    offerCheckText: st.offerCheckText || '',
    offerDepositPercent: st.offerDepositPercent || '',
    offerFollowUpDays: st.offerFollowUpDays || '7',
    showCosts: st.showCosts !== false,
    mBody: st.emailBody
  });
  const [location, setLocation] = useState<string | null>(null);
  // Ustawienia urosły do ośmiu kart — jedna długa strona znaczyła przewijanie
  // w poszukiwaniu pola, o którym wiadomo, że gdzieś jest.
  const [zakladka, setZakladka] = useState<
    'firma' | 'oferty' | 'produkcja' | 'biblioteki' | 'konta' | 'poczta' | 'dane'
  >('firma');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (hasApi) dataLocation().then(setLocation);
  }, []);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  /** Ustawienia z formularza w jednym miejscu — używa tego i zapis, i kopia zapasowa. */
  const stateFromForm = (): AppState => {
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
    next.settings.backupFolder = form.backupFolder.trim();
    const osoby = form.issuerRows
      .map((o) => ({ name: o.name.trim(), phone: o.phone.trim() }))
      .filter((o) => o.name);
    next.settings.issuers = osoby.map((o) => o.name);
    next.settings.issuerPhones = Object.fromEntries(osoby.filter((o) => o.phone).map((o) => [o.name, o.phone]));
    next.settings.offerDefaults = {
      deadlineDays: form.offerDeadlineDays.trim(),
      validityDays: form.offerValidityDays.trim(),
      validityEnabled: form.offerValidityEnabled,
      installationIncluded: form.offerInstallation
    };
    next.settings.productPhotos = form.photoRows
      .map((z) => ({ name: z.name.trim(), dataUrl: z.dataUrl }))
      .filter((z) => z.name && z.dataUrl);
    next.settings.specPresets = form.specPresetRows
      .map((z) => ({
        ...z,
        name: z.name.trim(),
        rows: z.rows.map((w) => ({ label: w.label.trim(), value: w.value.trim() })).filter((w) => w.label)
      }))
      .filter((z) => z.rows.length);
    // Stara płaska lista przestaje cokolwiek znaczyć, gdy są zestawy
    delete next.settings.defaultSpec;
    next.settings.stages = form.stageRows
      .map((e) => ({ ...e, name: e.name.trim() }))
      .filter((e) => e.name);
    next.settings.specTemplates = form.specRows
      .map((t) => ({
        name: t.name.trim(),
        rows: t.rows.map((w) => ({ label: w.label.trim(), value: w.value.trim() })).filter((w) => w.label)
      }))
      .filter((t) => t.name && t.rows.length);
    next.settings.offerClosingText = form.offerClosingText;
    next.settings.offerCheckText = form.offerCheckText;
    next.settings.offerDepositPercent = form.offerDepositPercent.trim();
    next.settings.offerFollowUpDays = form.offerFollowUpDays.trim() || '0';
    next.settings.showCosts = form.showCosts;
    next.settings.emailBody = form.mBody;
    return next;
  };

  // Wgrywanie zdjęć produktów. Zdjęcie z telefonu waży kilka megabajtów,
  // więc każde zmniejszamy, zanim trafi do pliku z danymi.
  const wgrajZdjecia = async (pliki: FileList | null, podmienId: number | null) => {
    if (!pliki || !pliki.length) return;
    const obrazy = Array.from(pliki).filter((f) => f.type.startsWith('image/'));
    if (!obrazy.length) {
      toast('To nie są pliki graficzne.', true);
      return;
    }
    try {
      const male = await Promise.all(obrazy.map(resizePhoto));
      if (podmienId !== null) {
        set({ photoRows: form.photoRows.map((r, j) => (j === podmienId ? { ...r, dataUrl: male[0] } : r)) });
        return;
      }
      // Nazwa pliku to zwykle nazwa produktu — podpowiadamy ją, bo to po niej
      // zdjęcie trafia później na pozycję oferty.
      const nowe = male.map((dataUrl, i) => ({
        name: obrazy[i].name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim(),
        dataUrl
      }));
      set({ photoRows: [...form.photoRows, ...nowe] });
    } catch (e) {
      toast(`Nie udało się wczytać zdjęcia: ${(e as Error).message}`, true);
    }
  };

  const save = async () => {
    await onPersist(stateFromForm());
    toast('Zapisano ustawienia.');
  };

  const wybierzFolder = async () => {
    const folder = await chooseBackupFolder();
    if (!folder) return;
    set({ backupFolder: folder });
    const next = structuredClone(state);
    next.settings.backupFolder = folder;
    await onPersist(next);
    const res = await backupNow(next);
    toast(res.ok ? `Folder ustawiony, kopia zapisana: ${res.file}` : `Folder ustawiony, ale kopia się nie udała: ${res.error}`, !res.ok);
  };

  const zapiszKopie = async () => {
    if (!form.backupFolder.trim()) {
      toast('Najpierw wskaż folder na kopie zapasowe.', true);
      return;
    }
    const res = await backupNow(stateFromForm());
    toast(res.ok ? `Zapisano kopię: ${res.file}` : `Nie udało się zapisać kopii: ${res.error}`, !res.ok);
  };

  const przywroc = async () => {
    const res = await restoreBackup(form.backupFolder.trim());
    if (res.canceled) return;
    if (!res.ok || !res.state) {
      toast(res.error || 'Nie udało się wczytać kopii.', true);
      return;
    }
    const liczba = res.state.documents?.length ?? 0;
    const potwierdzone = await askConfirm(
      `Wczytać kopię z ${liczba} dokumentami? Obecne dane w programie zostaną zastąpione.`,
      { confirmLabel: 'Przywróć', danger: true }
    );
    if (!potwierdzone) return;
    await onPersist(res.state);
    toast(`Przywrócono dane z kopii (${liczba} dokumentów).`);
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
      <header className="view-head">
        <h1 className="page-title">Ustawienia</h1>
        <p className="view-meta">Firma, oferty, produkcja, konta i poczta — każde w swojej zakładce.</p>
      </header>

      <div className="chips tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={'chip' + (zakladka === 'firma' ? ' active' : '')}
          aria-selected={zakladka === 'firma'}
          data-testid="settings-tab-firma"
          onClick={() => setZakladka('firma')}
        >
          Firma
        </button>
        <button
          type="button"
          role="tab"
          className={'chip' + (zakladka === 'oferty' ? ' active' : '')}
          aria-selected={zakladka === 'oferty'}
          data-testid="settings-tab-oferty"
          onClick={() => setZakladka('oferty')}
        >
          Oferty
        </button>
        <button
          type="button"
          role="tab"
          className={'chip' + (zakladka === 'produkcja' ? ' active' : '')}
          aria-selected={zakladka === 'produkcja'}
          data-testid="settings-tab-produkcja"
          onClick={() => setZakladka('produkcja')}
        >
          Produkcja
        </button>
        <button
          type="button"
          role="tab"
          className={'chip' + (zakladka === 'biblioteki' ? ' active' : '')}
          aria-selected={zakladka === 'biblioteki'}
          data-testid="settings-tab-biblioteki"
          onClick={() => setZakladka('biblioteki')}
        >
          Biblioteki
        </button>
        <button
          type="button"
          role="tab"
          className={'chip' + (zakladka === 'konta' ? ' active' : '')}
          aria-selected={zakladka === 'konta'}
          data-testid="settings-tab-konta"
          onClick={() => setZakladka('konta')}
        >
          Konta
        </button>
        <button
          type="button"
          role="tab"
          className={'chip' + (zakladka === 'poczta' ? ' active' : '')}
          aria-selected={zakladka === 'poczta'}
          data-testid="settings-tab-poczta"
          onClick={() => setZakladka('poczta')}
        >
          Poczta
        </button>
        <button
          type="button"
          role="tab"
          className={'chip' + (zakladka === 'dane' ? ' active' : '')}
          aria-selected={zakladka === 'dane'}
          data-testid="settings-tab-dane"
          onClick={() => setZakladka('dane')}
        >
          Dane
        </button>
      </div>

      {zakladka === 'firma' && (
        <div className="tab-panel" key="firma" data-testid="settings-panel-firma">
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
        </div>
      )}

      {zakladka === 'oferty' && (
        <div className="tab-panel" key="oferty" data-testid="settings-panel-oferty">
      <div className="card">
        <h3 className="card-title">Oferty cenowe</h3>
        <p className="muted card-note">
          Osoby wystawiające oferty wraz z numerami telefonu — numer trafia na dokument pod
          nazwiskiem i do stopki wiadomości e-mail. Do listy dopisują się automatycznie także
          pracownicy kontrahenta „Lechrol”, a ich numery biorą się wtedy z kartoteki pracownika.
        </p>
        {form.issuerRows.length > 0 && (
          <table className="table items-table" data-testid="issuers-table">
            <thead>
              <tr>
                <th>Imię i nazwisko</th>
                <th style={{ width: 180 }}>Telefon</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody data-testid="issuers-body">
              {form.issuerRows.map((o, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      className="input"
                      data-testid={`issuer-name-${i}`}
                      aria-label="Imię i nazwisko osoby wystawiającej"
                      value={o.name}
                      onChange={(e) =>
                        set({ issuerRows: form.issuerRows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      data-testid={`issuer-phone-${i}`}
                      aria-label="Telefon osoby wystawiającej"
                      placeholder="np. 511 697 697"
                      value={o.phone}
                      onChange={(e) =>
                        set({ issuerRows: form.issuerRows.map((r, j) => (j === i ? { ...r, phone: e.target.value } : r)) })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-small btn-danger item-remove"
                      data-testid={`issuer-remove-${i}`}
                      aria-label="Usuń osobę"
                      title="Usuń osobę"
                      onClick={() => set({ issuerRows: form.issuerRows.filter((_, j) => j !== i) })}
                    >
                      <X className="icon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!form.issuerRows.length && <p className="muted employees-empty">Nie dodano jeszcze żadnej osoby.</p>}
        <button
          className="btn btn-light"
          data-testid="add-issuer-btn"
          onClick={() => set({ issuerRows: [...form.issuerRows, { name: '', phone: '' }] })}
        >
          <Plus className="icon" />
          Dodaj osobę
        </button>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Zaliczka (% wartości oferty)</span>
          <input
            type="text"
            className="input num"
            data-testid="offer-deposit-percent"
            inputMode="numeric"
            placeholder="np. 30"
            value={form.offerDepositPercent}
            onChange={(e) => set({ offerDepositPercent: e.target.value })}
          />
          <span className="muted field-hint">
            Drukuje w warunkach oferty wiersz „Płatność: zaliczka X% przy złożeniu zamówienia, reszta przy
            odbiorze”. Puste pole albo 0 wyłącza ten wiersz; 100 drukuje płatność z góry.
          </span>
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Ramka „do sprawdzenia” nad podpisem</span>
          <textarea
            className="input"
            data-testid="offer-check-text"
            rows={3}
            value={form.offerCheckText}
            onChange={(e) => set({ offerCheckText: e.target.value })}
          />
          <span className="muted field-hint">
            Drukowana w ramce tuż nad podpisem. Prosi klienta o sprawdzenie danych przed
            akceptacją. Puste pole wyłącza ramkę.
          </span>
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>Uwagi końcowe dopisywane do każdej oferty</span>
          <textarea
            className="input"
            data-testid="offer-closing-text"
            rows={8}
            value={form.offerClosingText}
            onChange={(e) => set({ offerClosingText: e.target.value })}
          />
          <span className="muted field-hint">
            Drukowane pod warunkami oferty, na każdym dokumencie. Każdy wiersz to osobna linia;
            znak • na początku wiersza robi punkt listy. Puste pole wyłącza ten tekst.
          </span>
        </label>
        <div className="grid2" style={{ marginTop: 14 }}>
          <label className="field">
            <span>Przypominaj o wysłanej ofercie po (dniach)</span>
            <input
              type="text"
              className="input num"
              data-testid="offer-followup-days"
              inputMode="numeric"
              value={form.offerFollowUpDays}
              onChange={(e) => set({ offerFollowUpDays: e.target.value })}
            />
            <span className="muted field-hint">
              Oferty ze statusem „Wysłana”, na które klient nie odpowiedział, zbierają się na górze listy ofert. 0 wyłącza przypomnienia.
            </span>
          </label>
          <label className="checkbox-field" style={{ alignSelf: 'start', paddingTop: 26 }}>
            <input
              type="checkbox"
              data-testid="offer-show-costs"
              checked={form.showCosts}
              onChange={(e) => set({ showCosts: e.target.checked })}
            />
            <span>Pokazuj koszt własny i marżę (tylko w programie, nigdy na dokumencie)</span>
          </label>
        </div>
        <div className="grid2" style={{ marginTop: 14 }}>
          <label className="field">
            <span>Domyślny termin realizacji (dni roboczych)</span>
            <input type="text" className="input num" data-testid="offer-default-deadline" value={form.offerDeadlineDays} onChange={(e) => set({ offerDeadlineDays: e.target.value })} />
          </label>
          <label className="field">
            <span>Domyślna ważność oferty (dni)</span>
            <input type="text" className="input num" data-testid="offer-default-validity" value={form.offerValidityDays} onChange={(e) => set({ offerValidityDays: e.target.value })} />
            <label className="checkbox-field">
              <input
                type="checkbox"
                data-testid="offer-default-validity-on"
                checked={form.offerValidityEnabled}
                onChange={(e) => set({ offerValidityEnabled: e.target.checked })}
              />
              <span>Nowe oferty od razu z ograniczoną ważnością</span>
            </label>
          </label>
          <label className="field">
            <span>Domyślnie: montaż</span>
            <select className="input" data-testid="offer-default-installation" value={form.offerInstallation ? 'tak' : 'nie'} onChange={(e) => set({ offerInstallation: e.target.value === 'tak' })}>
              <option value="tak">ceny uwzględniają montaż</option>
              <option value="nie">ceny nie uwzględniają montażu</option>
            </select>
          </label>
        </div>
      </div>
        </div>
      )}

      {zakladka === 'produkcja' && (
        <div className="tab-panel" key="produkcja" data-testid="settings-panel-produkcja">
      <div className="card">
        <h3 className="card-title">Etapy produkcji</h3>
        <p className="muted card-note">
          Kolejność etapów jest kolejnością pracy: przycisk „Dalej” przestawia pozycję o jeden
          w dół tej listy. Ostatni etap oznacza rzecz skończoną — pozycja znika z tablicy i liczy
          się do postępu zlecenia.
          <br />
          <strong>Podkategorie</strong> (przycisk „+” przy etapie) nie są osobnymi przystankami,
          tylko listą rzeczy do odhaczenia w ramach etapu — przy pozycji widać, co już zrobiono
          i kto. <strong>Działy</strong> decydują, komu etap się w ogóle pokaże: żaluzje mają inne
          kroki niż moskitiery. Etap bez zaznaczonego działu dotyczy wszystkich.
          <br />
          Zmiana nazwy nie rusza historii: wpisy w dzienniku wskazują na etap, a nie przechowują
          jego nazwę.
        </p>
        {form.stageRows.map((e, i) => (
          <div
            className={'stage-row' + (e.parentId ? ' stage-sub' : '')}
            key={e.id}
            data-testid={`stage-row-${i}`}
          >
            <input
              type="color"
              className="input"
              data-testid={`stage-color-${i}`}
              aria-label="Kolor etapu"
              value={e.color}
              onChange={(ev) =>
                set({ stageRows: form.stageRows.map((r, j) => (j === i ? { ...r, color: ev.target.value } : r)) })
              }
            />
            <input
              type="text"
              className="input"
              data-testid={`stage-name-${i}`}
              aria-label={e.parentId ? 'Nazwa podkategorii' : 'Nazwa etapu'}
              placeholder={e.parentId ? 'np. Do wycięcia' : 'np. W produkcji'}
              value={e.name}
              onChange={(ev) =>
                set({ stageRows: form.stageRows.map((r, j) => (j === i ? { ...r, name: ev.target.value } : r)) })
              }
            />
            {!e.parentId && (
              <label className="checkbox-field" title="Po tym etapie rzecz jest skończona">
                <input
                  type="checkbox"
                  data-testid={`stage-final-${i}`}
                  checked={!!e.final}
                  onChange={(ev) =>
                    set({
                      stageRows: form.stageRows.map((r, j) => (j === i ? { ...r, final: ev.target.checked } : r))
                    })
                  }
                />
                <span>koniec</span>
              </label>
            )}
            <div className="spec-row-actions">
              {!e.parentId && (
                <button
                  className="btn btn-small btn-light item-remove"
                  data-testid={`stage-add-sub-${i}`}
                  aria-label="Dodaj podkategorię"
                  title="Dodaj podkategorię tego etapu"
                  onClick={() => {
                    // Podkategoria ląduje tuż za ostatnią swoją — lista czyta
                    // się wtedy z góry na dół jak w warsztacie
                    const ostatnia = form.stageRows.reduce(
                      (acc, r, j) => (r.parentId === e.id ? j : acc),
                      i
                    );
                    const nowa = {
                      id: uid(),
                      name: '',
                      color: e.color,
                      parentId: e.id,
                      departments: [...(e.departments || [])]
                    };
                    set({
                      stageRows: [
                        ...form.stageRows.slice(0, ostatnia + 1),
                        nowa,
                        ...form.stageRows.slice(ostatnia + 1)
                      ]
                    });
                  }}
                >
                  <Plus className="icon" />
                </button>
              )}
              <button
                className="btn btn-small btn-light item-remove"
                data-testid={`stage-up-${i}`}
                aria-label="Wyżej"
                disabled={i === 0}
                onClick={() => set({ stageRows: movedBy(form.stageRows, i, -1) })}
              >
                <ChevronUp className="icon" />
              </button>
              <button
                className="btn btn-small btn-light item-remove"
                data-testid={`stage-down-${i}`}
                aria-label="Niżej"
                disabled={i === form.stageRows.length - 1}
                onClick={() => set({ stageRows: movedBy(form.stageRows, i, 1) })}
              >
                <ChevronDown className="icon" />
              </button>
              <button
                className="btn btn-small btn-danger item-remove"
                data-testid={`stage-remove-${i}`}
                aria-label={e.parentId ? 'Usuń podkategorię' : 'Usuń etap'}
                onClick={() =>
                  // Z etapem znikają jego podkategorie — zostałyby sierotami
                  set({ stageRows: form.stageRows.filter((r, j) => j !== i && r.parentId !== e.id) })
                }
              >
                <X className="icon" />
              </button>
            </div>

            <div className="user-depts" data-testid={`stage-depts-${i}`}>
              {ODDZIALY.map((d) => {
                const ma = (e.departments || []).includes(d);
                return (
                  <label className="checkbox-field" key={d}>
                    <input
                      type="checkbox"
                      data-testid={`stage-dept-${i}-${d}`}
                      checked={ma}
                      onChange={() =>
                        set({
                          stageRows: form.stageRows.map((r, j) =>
                            j === i
                              ? {
                                  ...r,
                                  departments: ma
                                    ? (r.departments || []).filter((x) => x !== d)
                                    : [...(r.departments || []), d]
                                }
                              : r
                          )
                        })
                      }
                    />
                    <span>{OPISY_ODDZIALOW[d]}</span>
                  </label>
                );
              })}
              {!(e.departments || []).length && <span className="muted">dotyczy wszystkich</span>}
            </div>
          </div>
        ))}
        <button
          className="btn btn-light"
          data-testid="add-stage"
          onClick={() =>
            set({
              stageRows: [...form.stageRows, { id: uid(), name: '', color: '#8b94a3' }]
            })
          }
        >
          <Plus className="icon" />
          Dodaj etap
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">Domyślna specyfikacja</h3>
        <p className="muted card-note">
          Zestaw wierszy, które dostaje nowa pozycja — w zleceniu i w ofercie. Zaznacz kategorie,
          których zestaw dotyczy: rolety mają inne parametry niż moskitiery. Zestaw bez zaznaczonej
          kategorii jest zapasowy — wchodzi wtedy, gdy nic bardziej szczegółowego nie pasuje.
          Kilka zestawów może należeć do tej samej kategorii; pierwszy z listy wchodzi sam,
          pozostałe wstawia się przyciskiem przy pozycji. Wartości zostawia się puste — chodzi o to,
          żeby było widać, co uzupełnić. Na ofercie dla klienta nieuzupełnione wiersze się nie drukują.
        </p>

        {form.specPresetRows.map((z, i) => (
          <div className="spec-template" key={z.id} data-testid={`preset-${i}`}>
            <div className="spec-template-head">
              <input
                type="text"
                className="input"
                data-testid={`preset-name-${i}`}
                aria-label="Nazwa zestawu"
                placeholder="np. Rolety kasetowe"
                value={z.name}
                onChange={(e) =>
                  set({ specPresetRows: form.specPresetRows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)) })
                }
              />
              <div className="spec-row-actions">
                <button
                  className="btn btn-small btn-light item-remove"
                  data-testid={`preset-up-${i}`}
                  aria-label="Wyżej"
                  disabled={i === 0}
                  onClick={() => set({ specPresetRows: movedBy(form.specPresetRows, i, -1) })}
                >
                  <ChevronUp className="icon" />
                </button>
                <button
                  className="btn btn-small btn-light item-remove"
                  data-testid={`preset-down-${i}`}
                  aria-label="Niżej"
                  disabled={i === form.specPresetRows.length - 1}
                  onClick={() => set({ specPresetRows: movedBy(form.specPresetRows, i, 1) })}
                >
                  <ChevronDown className="icon" />
                </button>
                <button
                  className="btn btn-small btn-danger item-remove"
                  data-testid={`preset-remove-${i}`}
                  aria-label="Usuń zestaw"
                  onClick={() => set({ specPresetRows: form.specPresetRows.filter((_, j) => j !== i) })}
                >
                  <X className="icon" />
                </button>
              </div>
            </div>

            <div className="user-depts" data-testid={`preset-depts-${i}`}>
              {ODDZIALY.map((d) => {
                const ma = z.departments.includes(d);
                return (
                  <label className="checkbox-field" key={d}>
                    <input
                      type="checkbox"
                      data-testid={`preset-dept-${i}-${d}`}
                      checked={ma}
                      onChange={() =>
                        set({
                          specPresetRows: form.specPresetRows.map((r, j) =>
                            j === i
                              ? {
                                  ...r,
                                  departments: ma
                                    ? r.departments.filter((x) => x !== d)
                                    : [...r.departments, d]
                                }
                              : r
                          )
                        })
                      }
                    />
                    <span>{OPISY_ODDZIALOW[d]}</span>
                  </label>
                );
              })}
              {!z.departments.length && <span className="muted">zapasowy — na wszystko</span>}
            </div>

            {z.rows.map((w, wi) => (
              <div className="spec-row" key={wi}>
                <input
                  type="text"
                  className="input"
                  data-testid={`preset-label-${i}-${wi}`}
                  aria-label="Co"
                  placeholder="np. Strona sterowania"
                  value={w.label}
                  onChange={(e) =>
                    set({
                      specPresetRows: form.specPresetRows.map((r, j) =>
                        j === i ? { ...r, rows: r.rows.map((x, k) => (k === wi ? { ...x, label: e.target.value } : x)) } : r
                      )
                    })
                  }
                />
                <input
                  type="text"
                  className="input"
                  data-testid={`preset-value-${i}-${wi}`}
                  aria-label="Jakie"
                  placeholder="zostaw puste, jeśli zależy od okna"
                  value={w.value}
                  onChange={(e) =>
                    set({
                      specPresetRows: form.specPresetRows.map((r, j) =>
                        j === i ? { ...r, rows: r.rows.map((x, k) => (k === wi ? { ...x, value: e.target.value } : x)) } : r
                      )
                    })
                  }
                />
                <div className="spec-row-actions">
                  <button
                    className="btn btn-small btn-light item-remove"
                    data-testid={`preset-row-up-${i}-${wi}`}
                    aria-label="Przesuń wyżej"
                    disabled={wi === 0}
                    onClick={() =>
                      set({
                        specPresetRows: form.specPresetRows.map((r, j) =>
                          j === i ? { ...r, rows: movedBy(r.rows, wi, -1) } : r
                        )
                      })
                    }
                  >
                    <ChevronUp className="icon" />
                  </button>
                  <button
                    className="btn btn-small btn-light item-remove"
                    data-testid={`preset-row-down-${i}-${wi}`}
                    aria-label="Przesuń niżej"
                    disabled={wi === z.rows.length - 1}
                    onClick={() =>
                      set({
                        specPresetRows: form.specPresetRows.map((r, j) =>
                          j === i ? { ...r, rows: movedBy(r.rows, wi, 1) } : r
                        )
                      })
                    }
                  >
                    <ChevronDown className="icon" />
                  </button>
                  <button
                    className="btn btn-small btn-danger item-remove"
                    data-testid={`preset-row-remove-${i}-${wi}`}
                    aria-label="Usuń wiersz"
                    onClick={() =>
                      set({
                        specPresetRows: form.specPresetRows.map((r, j) =>
                          j === i ? { ...r, rows: r.rows.filter((_, k) => k !== wi) } : r
                        )
                      })
                    }
                  >
                    <X className="icon" />
                  </button>
                </div>
              </div>
            ))}
            <button
              className="btn btn-small btn-light"
              data-testid={`preset-add-row-${i}`}
              onClick={() =>
                set({
                  specPresetRows: form.specPresetRows.map((r, j) =>
                    j === i ? { ...r, rows: [...r.rows, { label: '', value: '' }] } : r
                  )
                })
              }
            >
              <Plus className="icon" />
              Dodaj wiersz
            </button>
          </div>
        ))}

        {!form.specPresetRows.length && (
          <p className="muted employees-empty" data-testid="presets-empty">
            Nie ma żadnego zestawu — nowa pozycja zaczyna z pustą specyfikacją.
          </p>
        )}
        <button
          className="btn btn-light"
          data-testid="add-preset"
          onClick={() =>
            set({
              specPresetRows: [
                ...form.specPresetRows,
                { id: uid(), name: '', departments: [], rows: [{ label: '', value: '' }] }
              ]
            })
          }
        >
          <Plus className="icon" />
          Dodaj zestaw
        </button>
      </div>
        </div>
      )}

      {zakladka === 'biblioteki' && (
        <div className="tab-panel" key="biblioteki" data-testid="settings-panel-biblioteki">
      <div className="card">
        <h3 className="card-title">Specyfikacje produktów</h3>
        <p className="muted card-note">
          Szablon to zestaw parametrów przypisany do produktu — kaseta, prowadnice, strona
          sterowania, wymiary. Pozycja dobiera go po nazwie tą samą drogą co zdjęcia: wszystkie
          słowa wpisu muszą stać w nazwie produktu albo w wierszu materiału. Pozycja bez własnej
          specyfikacji dostaje szablon od razu po wpisaniu nazwy; pozycji już wypełnionej program
          nie rusza — wtedy szablon wstawia się przyciskiem przy pozycji. Wartość można zostawić
          pustą: to miejsce do uzupełnienia przy konkretnym oknie.
        </p>
        {form.specRows.map((t, i) => (
          <div className="spec-template" key={i} data-testid={`spec-template-${i}`}>
            <div className="spec-template-head">
              <input
                type="text"
                className="input"
                data-testid={`spec-template-name-${i}`}
                aria-label="Nazwa produktu lub kod materiału"
                placeholder="np. roleta kasetowa uni"
                value={t.name}
                onChange={(e) =>
                  set({ specRows: form.specRows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)) })
                }
              />
              <button
                className="btn btn-small btn-danger item-remove"
                data-testid={`spec-template-remove-${i}`}
                aria-label="Usuń szablon"
                title="Usuń szablon"
                onClick={() => set({ specRows: form.specRows.filter((_, j) => j !== i) })}
              >
                <X className="icon" />
              </button>
            </div>
            {t.rows.map((w, wi) => (
              <div className="spec-row" key={wi}>
                <input
                  type="text"
                  className="input"
                  data-testid={`spec-template-label-${i}-${wi}`}
                  aria-label="Co"
                  placeholder="np. Kolor kasety"
                  value={w.label}
                  onChange={(e) =>
                    set({
                      specRows: form.specRows.map((r, j) =>
                        j === i
                          ? { ...r, rows: r.rows.map((x, k) => (k === wi ? { ...x, label: e.target.value } : x)) }
                          : r
                      )
                    })
                  }
                />
                <input
                  type="text"
                  className="input"
                  data-testid={`spec-template-value-${i}-${wi}`}
                  aria-label="Jakie"
                  placeholder="zostaw puste, jeśli zależy od okna"
                  value={w.value}
                  onChange={(e) =>
                    set({
                      specRows: form.specRows.map((r, j) =>
                        j === i
                          ? { ...r, rows: r.rows.map((x, k) => (k === wi ? { ...x, value: e.target.value } : x)) }
                          : r
                      )
                    })
                  }
                />
                <div className="spec-row-actions">
                  {/* Szablon wstawia wiersze w swojej kolejności, a ta jest
                      kolejnością na dokumencie — więc układa się ją tutaj. */}
                  <button
                    className="btn btn-small btn-light item-remove"
                    data-testid={`spec-template-row-up-${i}-${wi}`}
                    aria-label="Przesuń wiersz wyżej"
                    title="Przesuń wyżej"
                    disabled={wi === 0}
                    onClick={() =>
                      set({
                        specRows: form.specRows.map((r, j) =>
                          j === i ? { ...r, rows: movedBy(r.rows, wi, -1) } : r
                        )
                      })
                    }
                  >
                    <ChevronUp className="icon" />
                  </button>
                  <button
                    className="btn btn-small btn-light item-remove"
                    data-testid={`spec-template-row-down-${i}-${wi}`}
                    aria-label="Przesuń wiersz niżej"
                    title="Przesuń niżej"
                    disabled={wi === t.rows.length - 1}
                    onClick={() =>
                      set({
                        specRows: form.specRows.map((r, j) =>
                          j === i ? { ...r, rows: movedBy(r.rows, wi, 1) } : r
                        )
                      })
                    }
                  >
                    <ChevronDown className="icon" />
                  </button>
                  <button
                    className="btn btn-small btn-danger item-remove"
                    data-testid={`spec-template-row-remove-${i}-${wi}`}
                    aria-label="Usuń wiersz"
                    onClick={() =>
                      set({
                        specRows: form.specRows.map((r, j) =>
                          j === i ? { ...r, rows: r.rows.filter((_, k) => k !== wi) } : r
                        )
                      })
                    }
                  >
                    <X className="icon" />
                  </button>
                </div>
              </div>
            ))}
            <button
              className="btn btn-small btn-light"
              data-testid={`spec-template-add-row-${i}`}
              onClick={() =>
                set({
                  specRows: form.specRows.map((r, j) =>
                    j === i ? { ...r, rows: [...r.rows, { label: '', value: '' }] } : r
                  )
                })
              }
            >
              <Plus className="icon" />
              Dodaj wiersz
            </button>
          </div>
        ))}
        {!form.specRows.length && (
          <p className="muted employees-empty">Nie ma jeszcze żadnego szablonu specyfikacji.</p>
        )}
        <button
          className="btn btn-light"
          data-testid="add-spec-template"
          onClick={() =>
            set({ specRows: [...form.specRows, { name: '', rows: [{ label: '', value: '' }] }] })
          }
        >
          <Plus className="icon" />
          Dodaj szablon
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">Zdjęcia produktów</h3>
        <p className="muted card-note">
          Zdjęcie trafia na ofertę obok pozycji, żeby klient widział, co kupuje. Program dobiera je
          po nazwie: wystarczy, że wszystkie słowa wpisu stoją w nazwie produktu albo w wierszu
          materiału — kolejność i odmiana nie mają znaczenia. Wpis „roleta kasetowa uni” złapie
          pozycję „Rolety kasetowe System UNI, kaseta antracyt”, a wpis „C102” — pozycję z tą
          tkaniną (ale już nie z tkaniną C1020). Gdy pasuje kilka wpisów, wygrywa ten o większej
          liczbie słów. Zdjęcia są zmniejszane do {MAX_BOK} px, więc nie obciążają programu.
        </p>
        {form.photoRows.length > 0 && (
          <table className="table items-table" data-testid="photos-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Zdjęcie</th>
                <th>Nazwa produktu lub kod materiału</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody data-testid="photos-body">
              {form.photoRows.map((z, i) => (
                <tr key={i}>
                  <td>
                    <label className="photo-slot" title="Kliknij, żeby podmienić zdjęcie">
                      <img src={z.dataUrl} alt="" className="photo-thumb" data-testid={`photo-thumb-${i}`} />
                      <input
                        type="file"
                        accept="image/*"
                        className="photo-file"
                        data-testid={`photo-replace-${i}`}
                        aria-label="Podmień zdjęcie"
                        onChange={(e) => {
                          wgrajZdjecia(e.target.files, i);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      data-testid={`photo-name-${i}`}
                      aria-label="Nazwa produktu lub kod materiału"
                      placeholder="np. roleta kasetowa uni"
                      value={z.name}
                      onChange={(e) =>
                        set({ photoRows: form.photoRows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)) })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-small btn-danger item-remove"
                      data-testid={`photo-remove-${i}`}
                      aria-label="Usuń zdjęcie"
                      title="Usuń zdjęcie"
                      onClick={() => set({ photoRows: form.photoRows.filter((_, j) => j !== i) })}
                    >
                      <X className="icon" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!form.photoRows.length && <p className="muted employees-empty">Nie dodano jeszcze żadnego zdjęcia.</p>}
        <label className="btn btn-light photo-add" data-testid="add-photo-label">
          <Plus className="icon" />
          Dodaj zdjęcia
          <input
            type="file"
            accept="image/*"
            multiple
            className="photo-file"
            data-testid="add-photo-input"
            aria-label="Dodaj zdjęcia produktów"
            onChange={(e) => {
              wgrajZdjecia(e.target.files, null);
              e.target.value = '';
            }}
          />
        </label>
        <p className="muted field-hint" data-testid="photos-weight" style={{ marginTop: 10 }}>
          {form.photoRows.length
            ? `W bibliotece ${form.photoRows.length} zdjęć, razem około ${Math.round(
                form.photoRows.reduce((s, z) => s + z.dataUrl.length, 0) / 1024
              )} kB.`
            : 'Bez zdjęć oferta wygląda tak jak dotąd — to dodatek, nie wymóg.'}
        </p>
      </div>
        </div>
      )}

      {zakladka === 'konta' && (
        <div className="tab-panel" key="konta" data-testid="settings-panel-konta">
      {wolno(currentUser, 'konta') && (
        <UsersCard
          state={state}
          currentUser={currentUser}
          onPersist={onPersist}
          toast={toast}
          askConfirm={askConfirm}
        />
      )}
        </div>
      )}

      {zakladka === 'poczta' && (
        <div className="tab-panel" key="poczta" data-testid="settings-panel-poczta">
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
            <span>Kopia dla nas (ukryta)</span>
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
          <span className="muted">Sprawdza dane skrzynki bez wysyłania wiadomości.</span>
        </div>
      </div>
        </div>
      )}

      {zakladka === 'dane' && (
        <div className="tab-panel" key="dane" data-testid="settings-panel-dane">
      <div className="card">
        <h3 className="card-title">Kopia zapasowa danych</h3>
        <p className="muted card-note">
          Wskaż folder poza komputerem — pendrive, dysk sieciowy albo katalog OneDrive / Dysku Google.
          Program zapisuje tam kopię wszystkich dokumentów i kontrahentów przy każdej zmianie
          (jeden plik na dzień, więc zostaje historia z ostatnich dni).
        </p>
        <label className="field">
          <span>Folder kopii zapasowych</span>
          <input
            type="text"
            className="input"
            data-testid="backup-folder-input"
            placeholder="np. D:\\Kopie\\LechrolWZ — kliknij „Wybierz folder”"
            value={form.backupFolder}
            onChange={(e) => set({ backupFolder: e.target.value })}
          />
        </label>
        <div className="actions-bar" style={{ marginTop: 16 }}>
          <button className="btn" data-testid="backup-choose-btn" onClick={wybierzFolder}>
            <FolderOpen className="icon" />
            Wybierz folder
          </button>
          <button className="btn" data-testid="backup-now-btn" onClick={zapiszKopie}>
            <HardDriveDownload className="icon" />
            Zapisz kopię teraz
          </button>
          <button className="btn" data-testid="backup-restore-btn" onClick={przywroc}>
            <HardDriveUpload className="icon" />
            Przywróć z kopii
          </button>
        </div>
      </div>
        </div>
      )}

      <div className="actions-bar actions-sticky">
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
