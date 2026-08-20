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
  w chwili wysyłki).
- **Archiwum z wyszukiwarką** — lista wszystkich WZ z filtrowaniem po numerze,
  odbiorcy, numerze zamówienia i dacie.
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

W zakładce **Ustawienia → Poczta e-mail** podaj dane SMTP swojej skrzynki nadawczej,
np. dla Gmaila: serwer `smtp.gmail.com`, port `587`, login = adres e-mail oraz
[hasło aplikacji](https://support.google.com/accounts/answer/185833) (nie zwykłe hasło).
Temat i treść wiadomości można dostosować — `{numer}` zostanie zastąpiony numerem WZ.

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
