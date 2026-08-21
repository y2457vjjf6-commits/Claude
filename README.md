# Lechrol WZ

Aplikacja desktopowa do wystawiania dokumentów **WZ (wydanie zewnętrzne)** dla
ZPHU Lechrol Jacek Wajcht. Działa w pełni **offline, na jednym stanowisku, bez logowania** —
wszystkie dane zapisywane są lokalnie na komputerze.

## Funkcje

- **Wystawianie WZ** według firmowego wzoru — wydruk czarno-biały 1:1 z szablonem
  (nagłówek Lechrol, data/miejsce/nr zamówienia, sprzedawca i odbiorca, tabela pozycji
  z minimum 12 wierszami, uwagi, podpisy, stopka).
- **Automatyczna numeracja**: `<miesiąc×10><nr kolejny>/<pierwsza i ostatnia litera odbiorcy>/<rok>`,
  np. pierwsza WZ dla „Rolety Siejka” z 1 stycznia 2026 → **1001/RA/2026**.
  Licznik biegnie osobno w każdym miesiącu (styczeń `10xx`, luty `20xx`, … październik `100xx`, grudzień `120xx`).
- **Baza kontrahentów** — odbiorcę wybiera się z listy albo wpisuje ręcznie
  (z opcją zapisania go do bazy jednym kliknięciem).
- **Swobodna edycja** — każdy dokument można w dowolnym momencie otworzyć,
  poprawić, wydrukować ponownie lub usunąć. Numer w obrębie tego samego miesiąca
  pozostaje bez zmian; zmiana odbiorcy lub miesiąca aktualizuje numer automatycznie.
- **Pozycje wpisywane ręcznie** (nazwa / jednostka / ilość) — bez katalogu produktów
  i bez stanów magazynowych; klawisz **Enter** w ostatnim wierszu dodaje kolejną pozycję.
- **Drukowanie i PDF** — przycisk „Drukuj” otwiera systemowe okno drukowania,
  „Zapisz PDF” zapisuje dokument do wybranego pliku.
- **Wysyłka e-mail (opcjonalna)** — po skonfigurowaniu skrzynki SMTP w Ustawieniach
  dokument wysyłany jest jako PDF na adres e-mail odbiorcy (wymaga internetu tylko
  w chwili wysyłki). Każda wysyłka trafia też w ukrytej kopii na firmowy adres
  (domyślnie `lechrol@lechrol.pl`), więc w skrzynce zostaje komplet wystawionych WZ.
- **Archiwum z wyszukiwarką** — lista wszystkich WZ z filtrowaniem po numerze,
  odbiorcy, numerze zamówienia, dacie, a także **po nazwie towaru**, osobie
  odbierającej i uwagach.
- **Znaczniki wydruku i wysyłki** — przy dokumencie widać, czy był drukowany
  i czy poszedł mailem; po najechaniu myszą pokazuje się data, godzina i adres.
- **Podpowiedzi towarów** — nazwy i jednostki podpowiadają się z wcześniejszych
  dokumentów (od najczęściej używanych), bez utrzymywania katalogu produktów.
- **Zestawienia** — osobna zakładka: co wydano danemu odbiorcy w wybranym
  miesiącu, z zsumowanymi ilościami każdego towaru i listą dokumentów.
- **Kopia zapasowa** — wskazany folder (pendrive, dysk sieciowy, OneDrive)
  dostaje kopię wszystkich danych przy każdej zmianie, jeden plik na dzień;
  z tego samego miejsca można dane przywrócić.
- **Ciemny motyw** (domyślny) z przełącznikiem jasny/ciemny w pasku górnym;
  wybór jest zapamiętywany. Wydruk zawsze pozostaje czarno-biały na białym tle.

## Uruchomienie (dla programisty)

Wymagany [Node.js](https://nodejs.org) LTS (18+).

```bash
cd frontend
yarn install       # instalacja zależności
yarn start         # wersja przeglądarkowa (http://localhost:3000)
yarn electron      # okno desktopowe (najpierw: yarn build)
yarn test          # testy numeracji dokumentów
```

## Gotowy program dla Windows (.exe)

Repozytorium ma skonfigurowaną automatyczną budowę w GitHub Actions
(plik `.github/workflows/build-windows.yml`). Po każdej zmianie na gałęzi głównej
(oraz na żądanie — przycisk „Run workflow”) powstaje przenośny plik
`Lechrol-WZ-<wersja>.exe`:

1. Wejdź na GitHubie w zakładkę **Actions → Budowa Windows EXE**.
2. Otwórz ostatnie zielone uruchomienie.
3. Na dole, w sekcji **Artifacts**, pobierz `Lechrol-WZ-windows`.
4. Rozpakuj i skopiuj `.exe` na dowolny komputer z Windows — działa bez instalacji.

Budowa lokalna (wymaga Windows albo Linuksa z wine):

```bash
cd frontend && yarn dist
```

W katalogu `dist/` powstanie przenośny plik `.exe` (portable).

## Gdzie są moje dane?

Wszystkie dokumenty, kontrahenci i ustawienia trzymane są w jednym pliku JSON
w profilu użytkownika (ścieżka wyświetlana na dole zakładki **Ustawienia**; w Windows
zwykle `%APPDATA%\lechrol-wz\dane-wz.json`). Przy każdym zapisie tworzona jest kopia
zapasowa `dane-wz.backup.json`. Aby przenieść dane na inny komputer lub zrobić
backup, wystarczy skopiować ten plik.

## Konfiguracja poczty (wysyłka WZ e-mailem)

W zakładce **Ustawienia → Poczta e-mail** podaj dane skrzynki nadawczej (SMTP),
a następnie kliknij **Testuj połączenie** — sprawdzi serwer, port, login i hasło
bez wysyłania wiadomości. Temat i treść można dostosować; `{numer}` zostanie
zastąpiony numerem WZ, a `{odebral}` — osobą odbierającą towar.

Pole **Kopia dla nas (ukryta, UDW)** decyduje, gdzie trafia kopia każdej wysłanej
WZ — domyślnie `lechrol@lechrol.pl`. Odbiorca dokumentu nie widzi tego adresu.
Puste pole wyłącza kopie.

### Poczta i-host (Wenet)

| Pole | Wartość |
|---|---|
| Serwer SMTP | `hX.i-host.pl` — X to numer serwera z panelu i-host (ten sam adres co poczta przychodząca) |
| Port | `465` (szyfrowanie SSL/TLS) lub `587` (STARTTLS) |
| Login | pełny adres e-mail, np. `biuro@lechrol.pl` |
| Hasło | hasło do skrzynki |
| Nadawca | ten sam adres co login |

Numer serwera (`hX`) znajdziesz w panelu klienta i-host albo w wiadomości
konfiguracyjnej otrzymanej przy zakładaniu hostingu; podaje go też program pocztowy
już skonfigurowany na tej skrzynce (Outlook / Thunderbird → ustawienia konta →
serwer poczty wychodzącej).

### Inni dostawcy

Gmail wymaga [hasła aplikacji](https://support.google.com/accounts/answer/185833)
zamiast zwykłego hasła (serwer `smtp.gmail.com`, port `587`).

## Podpis cyfrowy programu (certyfikat Code Signing)

Program działa bez podpisu, ale przy pierwszym uruchomieniu Windows pokazuje
ostrzeżenie SmartScreen („Windows ochronił Twój komputer” → *Więcej informacji*
→ *Uruchom mimo to*). Podpis cyfrowy usuwa to ostrzeżenie i pokazuje nazwę firmy
jako wydawcy.

### Co kupić

Potrzebny jest certyfikat **Code Signing OV** wystawiony na firmę. Od czerwca 2023
klucz musi być sprzętowo chroniony, więc dostajesz go na tokenie USB, karcie
kryptograficznej albo w chmurze (nie ma już plików `.pfx` do skopiowania).
Od marca 2026 certyfikaty wydawane są maksymalnie na ~15 miesięcy.

Wariant EV nie jest potrzebny — od 2024 Windows traktuje OV i EV tak samo przy
budowaniu reputacji SmartScreen.

### Podpisywanie na własnym komputerze (token / karta / chmura)

Najprostsza droga, gdy certyfikat jest na tokenie lub w chmurze dostawcy:

```powershell
# jednorazowo: sterowniki tokena / aplikacja chmurowa + Windows SDK (signtool)
frontend\scripts\podpisz-lokalnie.ps1 -Plik "C:\...\Lechrol-WZ-1.1.0.exe"
```

Skrypt sam znajdzie certyfikat, podpisze plik znacznikiem czasu i sprawdzi wynik.

### Podpisywanie automatyczne przy budowie (opcjonalne)

Budowa w GitHub Actions podpisze plik sama, jeśli certyfikat trzymasz w **Azure
Key Vault**. Wystarczy dodać sekrety w repozytorium
(*Settings → Secrets and variables → Actions*):

| Sekret | Zawartość |
|---|---|
| `AZURE_KEY_VAULT_URL` | adres skarbca, np. `https://lechrol-kv.vault.azure.net` |
| `AZURE_CERT_NAME` | nazwa certyfikatu w skarbcu |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | dane aplikacji z dostępem do skarbca |

Dopóki sekretów nie ma, krok podpisywania jest pomijany i budowa działa jak dotąd.
Znacznik czasu sprawia, że podpisane pliki pozostają ważne także po wygaśnięciu
certyfikatu.

## Struktura projektu

Interfejs to aplikacja React + TypeScript (Tailwind, shadcn/ui) opakowana w Electron —
przeniesiona z projektu „wz-electron-ui” zbudowanego w Emergent i scalona z tym repozytorium.

```
frontend/electron/main.js      proces główny Electron: okno, zapis danych, druk/PDF, e-mail
frontend/electron/preload.js   bezpieczny mostek IPC (contextBridge)
frontend/src/App.tsx           główny komponent (widoki, motyw, skróty klawiszowe)
frontend/src/views/            lista WZ, edytor, kontrahenci, ustawienia
frontend/src/lib/numbering.ts  numeracja dokumentów (z testami numbering.test.ts)
frontend/src/lib/printing.ts   szablon wydruku A4 wg wzoru Lechrol
frontend/src/lib/storage.ts    zapis stanu (plik JSON w Electronie / localStorage w przeglądarce)
frontend/src/index.css         tokeny motywu jasnego i ciemnego
```
