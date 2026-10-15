# Kontrola jakości: kod QR i zdjęcie z telefonu

## Jak to działa

Przy każdym zleceniu, pod pozycjami, jest karta **Kontrola jakości**. Są w niej
trzy rzeczy:

1. **Protokół** — etap po etapie: kto go prowadził, ile pozycji przez niego
   przeszło i kiedy się skończył. Nie wpisuje się tego ręcznie; protokół czyta
   się z dziennika, który i tak powstaje przy każdym przestawieniu etapu.
   Zlecenie cofnięte i poprawione przechodzi przez etap dwa razy — i w protokole
   to widać.
2. **Kod QR** — „Pokaż kod do zdjęcia". Skanujesz telefonem, otwiera się strona,
   robisz zdjęcie, wysyłasz. Zdjęcie ląduje w zleceniu od razu, bez odświeżania.
3. **Odbiór** — przycisk „Odbierz po kontroli" zapisuje, kto i kiedy odebrał.
   Pojawia się, gdy wszystkie pozycje doszły do ostatniego etapu.

Protokół i odbiór drukują się na kartce zlecenia, gdy jest skończone — przed
odbiorem w ich miejscu jest linijka na podpis.

## Dlaczego nie potrzeba chmury

Program uruchamia **własny, mały serwer w sieci lokalnej warsztatu**. Kod QR
prowadzi na adres tego komputera, nie na żadną stronę w internecie. Zdjęcie
idzie prosto z telefonu do programu. Nic nie wychodzi na zewnątrz, nie trzeba
konta ani abonamentu.

**Warunek: telefon musi być w tej samej sieci Wi-Fi co komputer z programem.**
Przez dane komórkowe to nie zadziała — telefon nie widzi wtedy komputera.

## Co powie Windows

Przy pierwszym pokazaniu kodu Windows zapyta, czy zezwolić programowi
na komunikację w sieci. Trzeba zezwolić **dla sieci prywatnych** — bez tego
telefon nie połączy się z komputerem. To pytanie pojawia się raz.

## Bezpieczeństwo

Dostęp do strony chroni jednorazowy klucz, który siedzi wyłącznie w kodzie QR.
Kto nie ma kodu, nie trafi na stronę zlecenia; kod przestaje działać, gdy
zamkniesz zlecenie w programie.

To zamek na miarę warsztatu, nie banku: ktoś w tej samej sieci Wi-Fi, kto
zobaczy czyjś kod na ekranie, może dorzucić zdjęcie do tego zlecenia. W małej
firmie, gdzie sieć jest swoja, to w porządku; gdyby kiedyś miało to przeszkadzać,
trzeba będzie dołożyć logowanie na stronie telefonu.

## Zdjęcia a wielkość danych

Telefon zmniejsza zdjęcie przed wysłaniem (dłuższy bok do 1600 px), więc po
sieci idzie kilkaset kilobajtów zamiast kilkunastu megabajtów. Mimo to zdjęcia
to dziś największa rzecz w pliku danych — przy kilkuset zleceniach ze zdjęciami
wrócimy do rozmowy o przeniesieniu danych do bazy.
