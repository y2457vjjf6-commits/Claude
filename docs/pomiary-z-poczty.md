# Pomiar z poczty → wycena

Pomiarowiec wraca z budowy i pisze maila: produkt, pomieszczenia, wymiary.
Dotąd ktoś przepisywał te dwadzieścia kilka linijek do oferty ręcznie — pół
godziny roboty i jedno przestawione „8" i „3" dzielące od źle uszytej żaluzji.
Program czyta tę wiadomość sam.

**Oferta nigdy nie wystawia się sama.** Import kończy się **szkicem** otwartym
w edytorze: ceny są już podstawione z cennika, ale podpisuje się pod nimi
człowiek, który widzi, czego brakuje.

## Jak to uruchomić

**Oferty cenowe → Pomiar z poczty.** Dalej dwie drogi:

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

## Czego to jeszcze nie robi

Program **nie łączy się sam ze skrzynką**. Wiadomość trzeba podać: plikiem
albo wklejeniem. Automatyczne pobieranie poczty (IMAP) wymaga dołożenia do
programu bibliotek pocztowych — treść tej strony się wtedy nie zmieni, dojdzie
tylko lista wiadomości do wyboru zamiast przeciągania pliku.
