# Pomiar z poczty → wycena

Pomiarowiec wraca z budowy i pisze maila: produkt, pomieszczenia, wymiary.
Dotąd ktoś przepisywał te dwadzieścia kilka linijek do oferty ręcznie — pół
godziny roboty i jedno przestawione „8" i „3" dzielące od źle uszytej żaluzji.
Program czyta tę wiadomość sam.

**Oferta nigdy nie wystawia się sama.** Import kończy się **szkicem** otwartym
w edytorze: ceny są już podstawione z cennika, ale podpisuje się pod nimi
człowiek, który widzi, czego brakuje.

## Jak to uruchomić

**Oferty cenowe → Pomiar z poczty.** Dalej trzy drogi:

- **wprost ze skrzynki** — *Pokaż wiadomości* wypisuje trzydzieści ostatnich
  z Waszej poczty, od najnowszej. Klikasz tę z pomiarem i wczytuje się sama.
  Wymaga jednorazowego ustawienia skrzynki (niżej);
- **plik `.eml`** — w poczcie zapisz wiadomość na dysk i przeciągnij ją do
  okna (albo *Wybierz plik*). Temat i treść wczytają się same;
- **wklejenie** — zaznacz treść wiadomości w poczcie, wklej w pole
  *Treść wiadomości*, a w *Klient albo obiekt* wpisz, czyj to pomiar.

Podgląd pokazuje od razu, co z tego wyjdzie: ile sztuk, w ilu tabelach, za ile
razem, i co wymaga uzupełnienia. Dopiero **Utwórz szkic oferty** zakłada ofertę.

## Jak czytana jest wiadomość

```
Żaluzja drewniana 25 kolor do ustalenia   ← produkt, raz na całą wiadomość
Kuchnia                                    ← pomieszczenie
85,7 x 109 L                               ← szerokość × wysokość, strona
95,5 x 120 L
77,7 x 109 P

Łazienka                                   ← następna tabela w ofercie
59 x 82 P
```

- **pierwsza linia** to produkt. Trafia w nazwę każdej pozycji, więc jest nad
  podglądem do poprawienia — jednym polem dla całej wyceny. Dopisek w rodzaju
  „kolor do ustalenia" lepiej stąd skrócić: jego miejsce jest w specyfikacji
  pozycji, nie w nazwie produktu na dokumencie;
- **krótka linia bez cyfr** to pomieszczenie. Każde dostaje w ofercie własną
  tabelę z takim podpisem;
- **linia z wymiarem** to pozycja. Przecinek dziesiętny i dowolny iks
  (`x` albo `×`). Wymiar idzie i w opis pozycji, i w pola *Szerokość całkowita*
  oraz *Wysokość całkowita* — z nich liczy się cena z cennika;
- **czegokolwiek innego program nie zgaduje**: wypisuje te linie wprost
  w oknie importu, żeby dało się sprawdzić, czy nie siedzi w nich wymiar.

## Litery przy wymiarze

Litera niesie dwie rzeczy naraz: **ile sztuk** i **gdzie mechanizm**. Każda
litera to jedna sztuka.

| Zapis  | Znaczy                                  |
| ------ | --------------------------------------- |
| `L`    | 1 szt., sterowanie lewe                 |
| `P`    | 1 szt., sterowanie prawe                |
| `LP`   | 2 szt.: jedna lewa i jedna prawa        |
| `LLPP` | 4 szt.: dwie lewe i dwie prawe          |
| brak   | 1 szt., **strona do uzupełnienia**      |

Wymiar z dwiema stronami rozbija się na dwie pozycje w tym samym wymiarze —
tak, jak potem jedzie na produkcję.

Wymiar **bez litery** zostaje z pustym polem *Strona sterowania*, a okno
importu mówi wprost, ile takich pozycji czeka. Program nie wstawia tu wartości
domyślnej i nigdy nie będzie: zgadnięta strona sterowania to nie literówka do
poprawienia, tylko źle uszyty produkt.

## Ceny

Każda pozycja wyceniana jest z cennika producenta dokładnie tak samo, jak po
wpisaniu wymiaru ręcznie w edytorze — czyli po kratce, w którą wymiar wpada
(85,7 × 109 płaci jak 90 × 110). Pozycja, dla której cennik nie ma kratki —
wymiar poza tabelą albo produkt nazwany inaczej niż w cenniku — zostaje bez
ceny, a okno importu podaje, ile ich jest.

## Ustawienie skrzynki

**Ustawienia → Poczta → Skrzynka odbiorcza.** Potrzebne raz:

- **Serwer odbiorczy IMAP** — zwykle ten sam dostawca co przy wysyłce, tylko
  adres zaczyna się od `imap.` zamiast `smtp.`;
- **Port** — 993 (szyfrowanie od pierwszego bajtu) albo 143 (szyfrowanie po
  komendzie STARTTLS). Pomyłka nie jest groźna: program próbuje obu sposobów
  i jeśli zadziała ten drugi, połączy się mimo wszystko i podpowie, jaki port
  wpisać, żeby następne pobrania nie traciły czasu;
- **Folder** — puste znaczy skrzynkę odbiorczą. Jeśli pomiary trafiają u Was
  do osobnego folderu, wpisz jego nazwę: lista nie będzie się wtedy mieszać
  z resztą poczty;
- **Login i hasło jak przy wysyłce** — włączone bierze dane z ustawień SMTP,
  bo u większości dostawców to jedna skrzynka. Wyłącz, gdy odbiór ma własne
  konto.

*Testuj skrzynkę* łączy się i liczy wiadomości, niczego nie pobierając.

Przy Gmailu zwykłe hasło nie zadziała — trzeba hasła do aplikacji.

### Co program robi ze skrzynką

**Tylko czyta.** Nie kasuje, nie przenosi, nie odpowiada i **nie oznacza
wiadomości jako przeczytanej** — pobiera ją w trybie podglądu, więc skrzynka
pomiarowca wygląda po imporcie tak samo jak przed. Hasło leży w ustawieniach
programu, na tym komputerze.

Połączenie jest **zawsze szyfrowane**. Gdyby serwer szyfrowania nie oferował,
program się rozłącza i mówi o tym wprost, zamiast wysłać hasło do firmowej
skrzynki otwartym tekstem.

## Czego to jeszcze nie robi

Program **nie sprawdza poczty sam z siebie** — zagląda do skrzynki dopiero
wtedy, gdy klikniesz *Pokaż wiadomości*. Nie ma też powiadomienia „przyszedł
nowy pomiar"; jeśli okaże się potrzebne, da się dołożyć.
