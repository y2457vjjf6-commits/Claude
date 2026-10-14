# System produkcji — projekt do akceptacji

Dokument opisuje, jak dołożyć do programu zlecenia produkcyjne: historię zamówień,
etap każdego przedmiotu, automatyczny zapis i synchronizację między biurem
a warsztatem. **Nic z tego nie jest jeszcze zrobione** — to projekt do przeczytania
i poprawienia, zanim powstanie pierwsza linijka kodu.

Założenie przyjęte przy projektowaniu: **2–3 komputery, biuro i warsztat, praca
w tym samym czasie.**

---

## 1. Z czego to się składa

### Zlecenie produkcyjne

Trzeci dokument obok WZ i oferty. Powstaje z zaakceptowanej oferty jednym
kliknięciem — tą samą drogą, którą dziś działa „Wystaw WZ".

| Pole | Skąd |
|---|---|
| Numer `ZL-10-0001-2026` | nadawany automatycznie, jak w WZ i ofertach |
| Klient (nazwa, adres, telefon) | **kopiowany** z oferty, nie wskazywany przez odnośnik |
| Oferta źródłowa | zapamiętana, żeby dało się wrócić do wyceny |
| Termin realizacji | z oferty (dni robocze) albo wpisany ręcznie |
| Pozycje | z oferty: nazwa, materiał, specyfikacja, ilość |
| Uwagi dla warsztatu | osobne od uwag na ofercie |

Klient jest kopiowany, a nie wskazywany odnośnikiem, z tego samego powodu co
w WZ: zmiana adresu w kartotece za pół roku nie ma prawa zmienić dokumentu,
który już poszedł do produkcji.

**Ceny nie przechodzą do zlecenia.** Warsztat ma wiedzieć, co zrobić, a nie za ile.
Mniej miejsc, w których cena może trafić na niewłaściwą kartkę.

### Pozycja zlecenia

To, co faktycznie się produkuje. Niesie z oferty nazwę, materiał i całą
specyfikację (kolor kasety, prowadnice, strona sterowania, wymiary), a dokłada:

- **etap** — gdzie ta rzecz jest teraz,
- **kto robi** — opcjonalnie, imię z listy pracowników,
- **notatka warsztatowa** — np. „czekamy na poprawiony wymiar od klienta".

### Etapy

Lista ustawiana w Ustawieniach, bo każdy warsztat ma swoją. Propozycja na start:

```
Przyjęte → Materiał zamówiony → Materiał na stanie → W produkcji → Gotowe → Montaż → Wydane
```

Etap ma nazwę, kolor i miejsce w kolejności. Ostatni etap jest oznaczony jako
końcowy — po nim pozycja znika z tablicy i liczy się jako zrobiona.

### Dziennik zmian

Każde przestawienie etapu dopisuje wiersz: **która pozycja, z jakiego etapu
na jaki, kiedy, kto**. Dziennika się nie nadpisuje — tylko dopisuje.

To nie jest ozdoba. Dziennik odpowiada na pytanie „dlaczego to stoi od dwóch
tygodni", którego sam bieżący etap nie zdradzi. I — co ważniejsze — jest
jedynym sposobem, żeby dwie osoby przestawiające etapy w tej samej chwili
nie skasowały sobie nawzajem pracy (patrz punkt 4).

---

## 2. Ekrany

**Zlecenia** — nowa pozycja w menu bocznym. Lista jak oferty: numer, klient,
termin, postęp („7 z 12 gotowych"). Na górze zlecenia po terminie, tak jak dziś
na górze listy ofert zbierają się te czekające na odpowiedź.

**Tablica** — kolumny to etapy, karty to pozycje. Przeciąganie karty albo
przycisk „dalej" na karcie. To jest ekran dla warsztatu: ma działać na dotyk
i być czytelny z metra.

**Zlecenie** — nagłówek z klientem i terminem, lista pozycji z etapem,
przypisaniem i notatką, pod spodem dziennik.

**Kartka na warsztat** — wydruk zlecenia bez cen, ze specyfikacją każdej
pozycji i miejscem na podpis.

---

## 3. Fundament: zapis danych

Tu jest rzecz, której nie widać, a bez której reszta stoi na piasku.

**Dziś:** wszystkie dane siedzą w jednym pliku `dane-wz.json`, wczytywanym
i zapisywanym **w całości** przy każdej zmianie. Przy kilkuset ofertach to
jeszcze działa. Po dołożeniu zleceń i dziennika — plik rośnie, każdy zapis
przepisuje całość, a przerwa w zasilaniu w trakcie zapisu ryzykuje wszystkim
naraz (jest kopia zapasowa, ale to ostatnia deska ratunku, nie rozwiązanie).

**Propozycja:** baza SQLite w procesie głównym programu. Tabele: `documents`,
`offers`, `orders`, `order_items`, `stage_events`, `settings`. Zapis
transakcyjny, po rekordzie — przestawienie jednego etapu zapisuje jeden wiersz,
a nie całą firmę.

- Jednorazowa migracja z pliku JSON, z zachowaniem kopii przed.
- Program dalej działa offline i bez logowania; zmienia się tylko sposób zapisu.
- To jest **jedyny sensowny punkt wyjścia do synchronizacji** — plik JSON
  w chmurze dla dwóch osób naraz oznacza nadpisane dane, nie synchronizację.

**Automatyczny zapis** przy okazji:

- przestawienie etapu zapisuje się natychmiast, bez klikania „Zapisz";
- edytory (oferta, WZ, zlecenie) zapisują wersję roboczą ~2 sekundy po ostatnim
  naciśnięciu klawisza i przy wyjściu z ekranu;
- przycisk „Zapisz" zostaje — dla spokoju i dla skrótu Ctrl+S.

---

## 4. Synchronizacja

### Co wybieram i dlaczego

**Supabase** — hostowany Postgres z kontami użytkowników i serwerem w regionie UE
(Frankfurt). Przy skali 2–3 stanowisk darmowy próg wystarcza; gdyby przestał,
to rząd wielkości 100 zł miesięcznie. Alternatywy (wspólny folder OneDrive,
własny serwer) opisałem w rozmowie: pierwsza nie nadaje się do pracy dwóch osób
naraz, druga wymaga, żeby ktoś ten serwer pilnował.

### Zasada: najpierw lokalnie, potem chmura

Program pracuje na **swojej lokalnej bazie**. Zmiany trafiają do kolejki
i w tle lecą na serwer. Brak internetu w warsztacie nie zatrzymuje pracy —
etapy przestawia się dalej, a synchronizacja nadrobi, gdy sieć wróci.

### Konflikty — co się dzieje, gdy dwie osoby ruszą to samo

| Co | Jak rozstrzygamy |
|---|---|
| **Etapy** | Konfliktów nie ma z definicji: dziennik tylko się dopisuje. Bieżący etap pozycji to po prostu najpóźniejsze zdarzenie. Dwie osoby mogą klikać równolegle i nic nie ginie. |
| **Dokumenty** (oferta, WZ, zlecenie) | Wygrywa późniejsza zmiana, ale **wersja przegrana zostaje zachowana jako kopia**, a program mówi o tym wprost. Cicha utrata czyjejś godziny pracy jest gorsza niż jedna niewygodna kopia do porównania. |
| **Ustawienia** | Jak dokumenty. |

### Numeracja — tu jest realne ryzyko

Numer dokumentu musi być niepowtarzalny w całej firmie, a dziś liczy go
stanowisko na podstawie tego, co ma u siebie. Dwa stanowiska offline wystawią
ten sam numer.

Propozycja: **numer nadaje serwer**. Dokument utworzony bez sieci dostaje numer
rezerwowy z puli przydzielonej stanowisku i zamienia go na właściwy przy
pierwszej synchronizacji — zanim trafi do klienta. Dla zleceń jest to bezbolesne.
Dla ofert i WZ, które drukuje się od razu, trzeba o tym pamiętać; w praktyce
oba powstają w biurze, gdzie sieć jest.

**To jest miejsce, w którym projekt może się nie sprawdzić w Waszej praktyce
— proszę o szczególną uwagę przy tym punkcie.**

### Konta i uprawnienia

Każda osoba ma własny login — bez tego nie da się zapisać, kto przestawił etap.

- **Biuro** — wszystko: oferty, ceny, zlecenia, ustawienia.
- **Warsztat** — zlecenia i etapy, podgląd specyfikacji, **bez cen i bez ofert**.

### RODO

Dane klientów (nazwa, adres, NIP, telefon) trafią na serwer zewnętrznej firmy.
Potrzebna jest umowa powierzenia przetwarzania z dostawcą i region UE. To nie
jest przeszkoda, ale formalność, o której trzeba wiedzieć **przed** uruchomieniem,
a nie po.

---

## 5. Kolejność prac

1. **Fundament** — SQLite, migracja z pliku, automatyczny zapis.
   Niewidoczne, ale wszystko inne na tym stoi.
2. **Zlecenia lokalnie** — model, lista, zlecenie z oferty, etapy, tablica,
   dziennik, wydruk dla warsztatu. Od tego momentu system jest używalny
   na jednym stanowisku.
3. **Synchronizacja** — konta, serwer, kolejka offline, rozstrzyganie
   konfliktów, numeracja serwerowa.
4. **Role** — ukrycie cen przed warsztatem, uprawnienia.

Po kroku 2 warto popracować tydzień czy dwa na jednym stanowisku. Jeżeli coś
w przepływie pracy wygląda inaczej, niż tu założyłem, lepiej się o tym przekonać
przed postawieniem serwera niż po.

---

## 6. Pytania, na które muszę znać odpowiedź

Te rzeczy zmieniają projekt, a nie da się ich zgadnąć z kodu.

1. **Etap dotyczy pozycji czy pojedynczej sztuki?**
   Oferta ma pozycję „roleta kasetowa UNI, 12 szt.". W warsztacie te 12 sztuk
   może iść różnym tempem — pięć gotowych, siedem czeka na materiał.
   Mogę zrobić etap na całą pozycję (prościej, mniej klikania) albo rozbijać
   pozycje na sztuki (dokładniej, ale tablica robi się gęsta).
   Proponuję: **domyślnie na pozycję, z możliwością rozbicia tej pozycji,
   która tego potrzebuje.**

2. **Jakie dokładnie etapy u Was?** Lista z punktu 1 to mój strzał.

3. **Czy warsztat ma widzieć ceny?** Zakładam, że nie.

4. **Termin: na zlecenie czy na pozycję?** Zakładam, że na zlecenie.

5. **Czy potrzebne są powiadomienia** — np. biuro ma wiedzieć, że materiał
   dotarł, bez zaglądania do programu?

6. **Kto wystawia zlecenie** — zawsze biuro, czy warsztat też może założyć
   zlecenie bez oferty (np. naprawa, reklamacja)?
