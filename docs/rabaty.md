# Rabaty w ofercie cenowej

Jeden procent na całą ofertę rzadko odpowiada rzeczywistości: na roletach
materiałowych marża pozwala zejść o 10%, na żaluzjach drewnianych o 5%,
a moskitiery schodzą bez rabatu. Dlatego stawkę przypisuje się **produktowi**,
a lista produktów wyrasta z tej konkretnej wyceny — nie wpisuje się nazw
z pamięci.

## Gdzie to jest

W edytorze oferty, na dole, zakładka **Rabaty**:

1. **Udzielam rabatu na tej ofercie** — przełącznik nadrzędny. Wyłączony
   zeruje wszystkie stawki, także produktowe.
2. **Rabat podstawowy** — procent dla produktów bez własnej stawki.
3. **Produkty w tej wycenie** — po jednym wierszu na każdy produkt, który ma
   w ofercie jakąś kwotę, od najdroższego. Przy każdym:
   - pole wyboru **podlega rabatowi** — odznaczone ustawia temu produktowi
     stawkę „0”, czyli wyłącza mu rabat;
   - pole **stawka** — puste znaczy „bierz rabat podstawowy”.
4. Podgląd na dole pokazuje, ile wychodzi po każdej stawce i ile razem.

## Jak liczy się stawka

Przy każdej pozycji program pyta po kolei:

1. czy ten produkt ma własną stawkę (dopasowanie po nazwie),
2. jeśli nie — rabat podstawowy oferty.

Nazwa dopasowuje się tak samo jak w bibliotece zdjęć: wszystkie słowa stawki
muszą stać w nazwie pozycji, w dowolnej kolejności i odmianie. Stawka wpisana
przy „żaluzje drewniane” obejmie też pozycję „Żaluzja drewniana 50 mm”, a przy
„moskitiery” — wszystkie moskitiery naraz.

Procent spoza zakresu 0–100 jest sprowadzany do zakresu: rabat ujemny byłby
dopłatą, a powyżej 100% oferta robi się ujemna.

## Co widzi klient

Rabaty nie stoją przy pozycjach. W podsumowaniu dokumentu jest **osobna linia
na każdą użytą stawkę**, a gdy stawek jest kilka — z podaną podstawą:

```
Wartość pozycji                      3421,00 zł
Rabat 10% od 591,00 zł                −59,10 zł
Rabat 5% od 1280,00 zł                −64,00 zł
CENA CAŁKOWITA                       3297,90 zł
```

Przy jednym rabacie na wszystko linia jest jedna i wygląda dokładnie tak, jak
przed wprowadzeniem stawek produktowych.

## Rabaty a opcje do wyboru

Stawkę dostaje każdy produkt, także ten, który stoi tylko w jednej z opcji —
dlatego lista obejmuje produkty ze **wszystkich** opcji, nie tylko z wybranej.
Cena całkowita przy każdej opcji jest liczona z jej własnymi rabatami, więc
tańsza opcja może po rabatach wyjść drożej niż się wydaje przed nimi.

## Zgodność ze starymi ofertami

Oferta bez stawek produktowych liczy się **co do grosza tak samo jak dotąd**:
zaokrąglenie robimy raz na stawkę, więc przy jednym rabacie na całość wychodzi
dokładnie ta sama kwota co przed zmianą. Wystawione dokumenty nie zmieniają
się przy ponownym wydruku.
