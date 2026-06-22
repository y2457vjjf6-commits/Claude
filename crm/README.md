# Prosty CRM

Lekki, samodzielny system CRM działający w całości w przeglądarce. Bez backendu,
bez zależności i bez procesu budowania — dane są zapisywane lokalnie w
`localStorage`.

## Funkcje

- ➕ Dodawanie, edycja i usuwanie kontaktów
- 🔍 Wyszukiwanie po nazwie, firmie, e-mailu i telefonie
- 🏷️ Etapy lejka sprzedaży: Lead → Kontakt → Oferta → Wygrany / Przegrany
- 📊 Pulpit ze statystykami (liczba kontaktów, otwarte szanse, przychód)
- ↕️ Sortowanie po każdej kolumnie
- 💾 Import i eksport danych do pliku JSON
- 📱 Responsywny układ

## Uruchomienie

Otwórz `index.html` w przeglądarce. Nic więcej nie jest potrzebne.

Opcjonalnie, lokalny serwer (np. dla spójnych ścieżek):

```bash
cd crm
python3 -m http.server 8000
# następnie otwórz http://localhost:8000
```

## Struktura

| Plik         | Opis                                  |
|--------------|---------------------------------------|
| `index.html` | Struktura strony i formularz          |
| `styles.css` | Wygląd interfejsu                     |
| `app.js`     | Logika: dane, widok, import/eksport   |

## Integracja z Facebook Lead Ads

CRM może automatycznie importować leady z formularzy Facebook/Instagram Lead Ads.
Wymaga to uruchomienia backendu z katalogu [`../server`](../server) (Node, bez
zależności). Gdy front-end jest serwowany przez ten backend, w pasku narzędzi
pojawia się przycisk **↻ Lead Ads** pobierający nowe leady. Szczegóły konfiguracji
(token, webhook, formularze) znajdziesz w `server/README.md`.

## Dane

Kontakty są przechowywane w `localStorage` pod kluczem `crm.contacts.v1`
(dane pozostają tylko w danej przeglądarce). Aby przenieść dane na inne
urządzenie, użyj przycisków **Eksport** / **Import**. Przy pierwszym uruchomieniu
ładowane są przykładowe kontakty demonstracyjne.
