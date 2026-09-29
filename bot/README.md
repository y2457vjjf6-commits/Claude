# Bot do automatycznego wysyłania zgłoszeń

Otwiera stronę o wyznaczonej godzinie, wypełnia formularz i wysyła zgłoszenie.
Sterowany jednym plikiem YAML — bez pisania kodu pod konkretny serwis.

## Co potrafi

- **Precyzyjny timing** — strona jest otwierana i wypełniana z wyprzedzeniem
  (`open_page_seconds_before`), a kliknięcie „Wyślij" następuje co do sekundy
  o godzinie z `timing.at` / `timing.daily`.
- **Akcje formularza** — `fill`, `type` (ze zwłoką, jak człowiek), `select`,
  `check` / `uncheck`, `upload`, `press`, `click`, `wait_for`, `wait_ms`,
  `expect_text`, `screenshot`.
- **Tryb próbny** (`--dry-run`) — wypełnia wszystko i robi zrzut ekranu,
  ale **nie** klika przycisku wysyłki. Zawsze przetestuj tak przed premierą.
- **Dowód wykonania** — zrzuty ekranu przed/po wysyłce i `report.json`
  w katalogu `runs/<data-godzina>/`.
- **Ponowienia** — tylko dla błędów *przed* wysłaniem; po udanym wysłaniu bot
  nigdy nie ponawia, żeby nie złożyć zgłoszenia dwa razy.
- **Sesja logowania** — `browser.user_data_dir` zachowuje ciasteczka między
  uruchomieniami, więc bot może działać na zalogowanym koncie.
- **Dane wrażliwe poza repo** — `${ZMIENNA}` w configu pobiera wartość z
  `bot/.env` lub ze środowiska.

## Instalacja

```bash
pip install -r bot/requirements.txt
playwright install chromium        # pomiń, jeśli ustawisz browser.executable_path
cp bot/config.example.yaml bot/config.yaml
cp bot/.env.example bot/.env       # uzupełnij dane
```

## Użycie

```bash
# test na sucho, natychmiast, z widocznym oknem przeglądarki
python -m bot.form_bot bot/config.yaml --now --dry-run --headful

# uruchomienie właściwe: bot czeka do godziny z konfiguracji i wysyła
python -m bot.form_bot bot/config.yaml
```

Flagi: `--dry-run` (nie wysyłaj), `--now` (zignoruj harmonogram),
`--headful` (pokaż przeglądarkę).

## Jak znaleźć selektory

```bash
playwright codegen https://adres-formularza.pl
```
Klikasz po formularzu, a narzędzie pokazuje gotowe selektory — przeklejasz je
do `steps:` w konfiguracji.

## Uruchamianie w tle

Bot sam czeka do wyznaczonej godziny, więc wystarczy go wystartować wcześniej
(`nohup`, `screen`, `tmux`). Dla powtarzalności lepiej oddać harmonogram systemowi:

- Linux/macOS (cron, codziennie 9:55, bot dopina się do sekundy):
  `55 9 * * * cd /sciezka/do/projektu && python -m bot.form_bot bot/config.yaml >> bot.log 2>&1`
- Windows: Harmonogram zadań → akcja uruchamiająca to samo polecenie.

## Ograniczenia — przeczytaj przed użyciem

- **CAPTCHA / reCAPTCHA** — bot jej nie obejdzie i nie będzie tego robił.
  Jeśli formularz ma captchę, potrzebny jest tryb `--headful` i Twoje
  kliknięcie, albo rezygnacja z automatyzacji.
- **2FA / SMS** — kod trzeba podać ręcznie; da się to obejść trwałym profilem
  (`user_data_dir`), jeśli serwis pamięta urządzenie.
- **Regulamin serwisu** — część stron zakazuje automatycznego wypełniania
  formularzy, a część blokuje boty technicznie. Sprawdź regulamin serwisu,
  na którym chcesz tego użyć; to Ty odpowiadasz za zgodność.
- **Zegar** — przy „wyścigach o miejsca" licz się z opóźnieniem sieci;
  ustaw `at` odrobinę wcześniej i zsynchronizuj zegar systemowy (NTP).
- Formularze budowane dynamicznie (React/Angular) bywają gotowe dopiero po
  chwili — dodaj `wait_for` na kluczowy element zamiast `wait_ms`.

## Demo

W `bot/examples/demo_form.html` jest przykładowy formularz do testów:

```bash
cd bot/examples && python3 -m http.server 8765 &
python -m bot.form_bot bot/config.yaml --now
```
