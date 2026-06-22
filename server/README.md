# Backend CRM – integracja z Facebook Lead Ads

Mały serwer Node (bez zależności zewnętrznych) odbierający leady z formularzy
**Facebook / Instagram Lead Ads** i udostępniający je front-endowi CRM.

## Jak to działa

```
 Formularz Lead Ads ──► Meta wysyła webhook "leadgen" ──► POST /webhook
                                                              │
                              backend pobiera szczegóły z Graph API
                                                              │
                                          zapis do server/data/leads.json
                                                              │
 Front-end CRM ──► przycisk "↻ Lead Ads" ──► GET /api/leads ─┘
```

Dodatkowo `POST /api/sync` pobiera ostatnie leady z formularzy podanych w
`META_FORM_IDS` (przydatne na start lub gdy webhook nie był aktywny).

## Uruchomienie

```bash
cd server
cp .env.example .env      # uzupełnij token i sekrety
node --env-file=.env server.js   # Node 20+
# lub:  set -a && . ./.env && set +a && npm start
```

Otwórz `http://localhost:3000` – serwer serwuje front-end z `../crm`, a przycisk
**↻ Lead Ads** pojawi się automatycznie po wykryciu backendu.

## Konfiguracja (zmienne środowiskowe)

| Zmienna              | Opis |
|----------------------|------|
| `PORT`               | Port serwera (domyślnie 3000) |
| `META_ACCESS_TOKEN`  | Page Access Token z uprawnieniem `leads_retrieval` |
| `META_VERIFY_TOKEN`  | Dowolny sekret – ten sam wpisz w panelu webhooka Meta |
| `META_APP_SECRET`    | App Secret – włącza weryfikację podpisu `X-Hub-Signature-256` |
| `META_FORM_IDS`      | ID formularzy do `/api/sync` (po przecinku) |
| `META_FIELD_MAP`     | Mapowanie pól niestandardowych na pola kontaktu (JSON) |
| `META_GRAPH_VERSION` | Wersja Graph API (domyślnie `v21.0`) |

### Pola formularza

Standardowe pola Lead Ads są mapowane automatycznie:

| Pole Meta      | Pole kontaktu |
|----------------|---------------|
| `full_name` (lub `first_name` + `last_name`) | `name` |
| `email`        | `email`   |
| `phone_number` | `phone`   |
| `company_name` | `company` |

**Pola niestandardowe** (własne pytania w formularzu) trafiają automatycznie do
notatek kontaktu — nic nie przepada. Jeśli chcesz wybrane pole umieścić w
konkretnym miejscu, użyj `META_FIELD_MAP`, np.:

```bash
META_FIELD_MAP='{"budzet":"value","nazwa_firmy":"company","miasto":"notes"}'
```

## Konfiguracja po stronie Meta

1. Aplikacja Meta → produkt **Webhooks** → obiekt **Page**, pole **leadgen**.
2. Callback URL: `https://twoj-host/webhook`, Verify Token: wartość `META_VERIFY_TOKEN`.
   (Lokalnie wystaw serwer publicznie, np. przez `ngrok http 3000`.)
3. Subskrybuj stronę do aplikacji (uprawnienia `pages_manage_metadata`,
   `leads_retrieval`).
4. Wygeneruj długożyjący **Page Access Token** i wpisz go w `META_ACCESS_TOKEN`.

## Endpointy

| Metoda | Ścieżka        | Opis |
|--------|----------------|------|
| GET    | `/webhook`     | Weryfikacja subskrypcji (Meta) |
| POST   | `/webhook`     | Odbiór powiadomień o leadach (weryfikuje podpis) |
| GET    | `/api/leads`   | Lista zebranych leadów |
| POST   | `/api/sync`    | Ręczne pobranie leadów z `META_FORM_IDS` |
| GET    | `/api/health`  | Status konfiguracji (bez sekretów) |

## Bezpieczeństwo

- Podpis webhooka jest weryfikowany (`X-Hub-Signature-256`), gdy ustawiono
  `META_APP_SECRET`. Bez sekretu weryfikacja jest wyłączona – używaj tylko lokalnie.
- Plik `.env` oraz `data/leads.json` są w `.gitignore` (nie trafiają do repo).
- Token Meta nigdy nie jest wysyłany do przeglądarki – wszystkie wywołania Graph
  API wykonuje backend.
