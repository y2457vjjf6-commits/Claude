# Opcje w ofercie cenowej

„Pozycja xxx **albo** yyy **albo** zzz” — kilka wersji tej samej rzeczy obok
siebie, z ceną całkowitą policzoną dla każdej. Klient porównuje kwoty końcowe,
a nie same różnice.

## Czym to jest

Grupa opcji ma **jeden szkielet pozycji** — to, co się nie zmienia: nazwa
produktu, pomieszczenie, wymiar, ilość. Każda **opcja** podstawia pod ten
szkielet własny materiał i cenę.

```
szkielet:   Salon · 186 x 202 cm · 2 szt.
            ├─ Opcja A „dzień-noc"       materiał DN14   410 zł/szt.
            ├─ Opcja B „zaciemniający"   blackout BL22   470 zł/szt.
            └─ Opcja C „plisa Duette"    plisa D40       560 zł/szt.
```

Na ofercie wychodzi z tego tabela porównawcza: wiersze to produkty, kolumny to
alternatywy. Pod spodem stoi **cena całkowita całej oferty** policzona dla
każdej opcji — pozycje wspólne plus ta jedna opcja, po rabacie.

## Co jest wspólne, a co należy do opcji

| Pole | Gdzie siedzi | Dlaczego |
| --- | --- | --- |
| Nazwa produktu, ilość, Lp. | szkielet | to jedno i to samo okno |
| Wymiar (Szerokość/Wysokość całkowita) | szkielet | z niego liczy się cena z cennika; gdyby został przy jednej opcji, pozostałe byłyby bez ceny |
| Materiał, cena, koszt własny, dopłaty | opcja | tym opcje się właśnie różnią |
| Parametr z wartością wpisaną w szkielecie | szkielet | skoro ma wartość, jest wspólny |
| Parametr bez wartości („Kolor materiału:”) | opcja | to rubryka do wypełnienia osobno w każdej opcji |
| Parametr dopisany tylko przy opcji | opcja | np. „Napęd: silnik” wyłącznie w wersji droższej |

Wymiar wpisany przy którejkolwiek opcji **sam staje się wspólny** — program
podnosi go do szkieletu, żeby druga opcja nie została bez ceny.

## Jak się tego używa

1. W edytorze oferty: **Dodaj opcje do wyboru** (albo **Zamień na opcje** na
   istniejącej tabeli — wpisana już robota wchodzi wtedy do pierwszej opcji).
2. Wpisz pozycje: nazwę, wymiar i ilość wpisujesz **raz**.
3. Przełączaj się zakładkami między opcjami i uzupełniaj materiał oraz cenę.
   Na zakładce widać od razu cenę całkowitą oferty z tą opcją.
4. **Dodaj opcję** dokłada kolejną kolumnę, gotową ze wspólnymi polami.
5. Gdy klient zdecyduje — **Zaznacz jako wybraną**. Ta opcja wchodzi do ceny
   całkowitej i to ona idzie dalej: do zlecenia produkcyjnego i na WZ.

Dopóki nikt nie zaznaczy, program liczy pierwszą opcję, ale **nie zaznacza jej
na dokumencie** — udawanie decyzji klienta byłoby kłamstwem. Przy przepisaniu
takiej oferty na WZ dostajesz o tym ostrzeżenie.

## Kilka grup opcji w jednej ofercie

Wolno. Każda grupa ma swoją zaznaczoną opcję, a cena całkowita to pozycje
wspólne plus po jednej opcji z każdej grupy. W tabeli danej grupy kwoty
odpowiadają na pytanie „ile wyjdzie, jeśli wezmę tę opcję, a reszta zostanie
bez zmian”.

## Stare warianty alternatywne

Wcześniejszy mechanizm („Wariant alternatywny — poza ceną całkowitą”) pokazywał
kwotę samego wariantu, ale nie to, ile klient ostatecznie zapłaci. Zostaje
nietknięty w ofertach, które go używają: **wysłany dokument ma drukować się
dokładnie tak, jak go wysłano**. W nowych ofertach checkbox się nie pojawia.

Ofertę z wariantami można przenieść na nowy mechanizm przyciskiem **Zamień
warianty na opcje** — każdy wariant staje się opcją, a przy każdej staje pełna
cena oferty. Zmiana dotyczy tylko otwartej oferty i zapisuje się dopiero przy
zapisie.

## Czego ten mechanizm nie robi

- Nie pokazuje zakresu cen („od … do …”) — oferta ma podawać konkretne kwoty.
- Nie przelicza kombinacji między grupami opcji: każda grupa jest niezależna.
- Nie wyróżnia opcji „polecanej” — wyróżniona jest ta, którą wybrał klient.
