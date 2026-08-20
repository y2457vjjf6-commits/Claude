# Lechrol WZ — PRD / pamięć projektu

## Problem statement (oryginał)
Rebuild istniejącej aplikacji desktopowej **Lechrol WZ** (wcześniej Electron + vanilla JS, kod z GitHub `y2457vjjf6-commits/Claude`, gałąź `claude/wztek-app-requirements-an0qwl`) jako **Electron + React + TypeScript**, nadal pakowanej do `.exe` przez electron-builder. **Wyłącznie restyling wizualny** — wszystkie polskie teksty, pola, ekrany i logika biznesowa zachowane 1:1. Lewy sidebar zamiast górnych zakładek. Ciepły "architektoniczny" wygląd wg tokenów i 6 mockupów.

## Wybory użytkownika
- Font nagłówków: **Fraunces** (body: Geist, liczby: Geist Mono / tabular-nums)
- Dane lokalnie na dysku (Electron: `dane-wz.json` w userData + backup; przeglądarka: localStorage `lechrol-wz-data`)
- Podgląd w przeglądarce, `.exe` budowany komendą `yarn dist` na Windows

## Architektura
- **Frontend-only SPA**: `/app/frontend` (CRA + craco + TypeScript). Backend FastAPI/Mongo NIEUŻYWANY (boilerplate).
- `src/types.ts` — modele (schemat JSON identyczny ze starą aplikacją — stare pliki danych działają)
- `src/lib/numbering.ts` — numeracja `<miesiąc*10><seq 2-cyfr>/<pierwsza+ostatnia litera kontrahenta>/<rok>`
- `src/lib/storage.ts` — wzApi (Electron IPC) / localStorage fallback, deepMerge z DEFAULT_STATE
- `src/lib/printing.ts` — fillPrintArea (#print-area), drukowanie/PDF/e-mail (identyczne komunikaty PL)
- `src/views/` — DocumentsView, EditorView, ContractorsView, SettingsView; `src/components/` — Sidebar, Toast
- `src/index.css` — tokeny CSS (canvas #F5F0E8, card #FBF8F3, sidebar #EFE7DA, ink #2A2723, primary #C25A1C itd. + warm-dark odpowiedniki `[data-theme='dark']`); `src/print.css` — szablon wydruku A4 (kopiowany 1:1 z oryginału)
- **Electron**: `frontend/electron/main.js` (IPC: data:load/save/location, doc:print/savePdf/email przez nodemailer), `frontend/electron/preload.js`. `package.json`: `main`, `homepage: ./`, `build` (portable win, ikona `assets/icon.ico`, `extends: null`), skrypty `electron`, `dist`.
- Ikony: `frontend/assets/icon.png|ico` + `public/icon.png` wygenerowane z mockupu LR (PIL, zaokrąglone rogi).

## Build .exe (na Windows)
```
cd frontend && yarn install && yarn dist
# wynik: frontend/dist/Lechrol-WZ-<wersja>.exe (portable)
```
Dev desktop: `yarn build && yarn electron` lub `ELECTRON_START_URL=http://localhost:3000 yarn electron`.

## Zrealizowane (2026-06 / iteracja 1)
- Pełny port UI na React+TS z nowym designem (sidebar, pill active + orange accent bar, slat texture, Fraunces/Geist, tabele 56px, karty 16px radius, sticky action bar w edytorze, toast, empty states)
- Cała logika 1:1: numeracja, edytor WZ (Enter dodaje wiersz, podgląd numeru live), kontrahenci (CRUD + kod), ustawienia (sprzedawca + SMTP), motyw jasny/ciemny (warm-dark), drukowanie/PDF/e-mail, persystencja
- Testing agent iteracja 1: **100% pass (24 scenariusze)**; build produkcyjny OK (72.7 kB gz)

## Zrealizowane (2026-06 / iteracja 2)
- **GitHub Actions** `/.github/workflows/build-windows.yml`: po każdym pushu na `main` (i ręcznie przez workflow_dispatch) buduje portable .exe na windows-latest, publikuje jako artefakt + Release (tag `v<wersja>-build<N>`) + gałąź `windows-exe` — schemat zgodny z oryginalnym repo, dostosowany do katalogu `frontend/` i yarn
- **Ładne potwierdzenia**: `ConfirmDialog.tsx` + `askConfirm` (Promise) w App — zastępuje window.confirm dla usuwania dokumentu, kontrahenta i potwierdzenia wysyłki e-mail (przycisk Wyślij, nie-danger); Esc/Enter, klik w tło = anuluj; identyczne komunikaty PL
- **Podgląd dokumentu**: ikona oka w tabeli (doc-preview-<id>) otwiera `PreviewModal` z kartką A4 (buildPrintHtml wydzielone z fillPrintArea w printing.ts) + przyciski Drukuj / Zapisz PDF / Zamknij
- **Fix krytyczny**: print.css `#app` → `#root` (inaczej UI drukowało się razem z dokumentem w wersji React)
- Weryfikacja: lokalny Playwright — pełny flow (nowa WZ → zapis 8001/RA/2026 → podgląd z treścią → confirm anuluj/usuń) PASS; build produkcyjny OK

## Zrealizowane (2026-06 / iteracja 3 — code review fixes)
- XSS: `sanitizedPrintHtml` (DOMPurify) w printing.ts + PreviewModal (useMemo); esc() + DOMPurify = podwójna ochrona (zweryfikowane testem payloadu)
- Stabilne klucze: wiersze pozycji jako `ItemRow` z `rowId` (uid), wydzielony komponent `components/ItemsEditor.tsx`
- Hooki: `hooks/useToastMessage.ts`, `hooks/useConfirm.ts` — App.tsx odchudzony; EditorView: initForm/toRows/collectItems na poziomie modułu, poprawne zależności efektów (initRef guard), useMemo (numberPreview, sortedContractors), useMemo dla list w DocumentsView/ContractorsView
- Testing agent iteracja 2: **100% pass** (regresja + stable-keys + XSS + confirm/preview modale)

## Backlog / P1-P2
- P2: eksport kontrahentów do CSV

## Uwierzytelnianie
Brak auth — aplikacja lokalna, brak kont.
