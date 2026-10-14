# Konta, hasła i stanowiska

## Co to logowanie naprawdę daje

Program działa lokalnie i trzyma dane w zwykłym pliku na dysku. Logowanie
pilnuje, **kto używa programu** — nie szyfruje danych.

**Chroni przed:** tym, że warsztat zobaczy ceny i oferty; tym, że ktoś skasuje
ofertę albo wystawi dokument w imieniu firmy; brakiem odpowiedzi na pytanie,
kto przestawił etap.

**Nie chroni przed:** kimś, kto ma dostęp do tego komputera i wie, gdzie szukać.
Plik `dane-wz.json` w katalogu użytkownika można otworzyć notatnikiem i
przeczytać zlecenia oraz oferty bez uruchamiania programu. Przed tym chroni
osobne konto Windows dla każdej osoby albo szyfrowanie dysku (BitLocker) —
i to jest właściwe miejsce na taką ochronę, nie hasło w programie.

Hasła są zapisane jako skróty PBKDF2-SHA256 z solą, po 210 000 obrotów.
W pliku nie ma hasła, tylko wynik liczenia, z którego nie da się go odtworzyć.

## Stanowiska

| Stanowisko | Co może |
|---|---|
| **Właściciel** | Wszystko, razem z kontami pracowników i ustawieniami |
| **Biuro** | Oferty, dokumenty WZ, cennik i zlecenia. Bez zakładania kont |
| **Warsztat** | Tylko zlecenia: podgląd, etapy i notatki. Bez cen i bez ofert |

Warsztat nie widzi w menu zakładek, do których nie ma prawa — pusta zakładka
myli bardziej niż jej brak. Nie założy ani nie skasuje zlecenia; w karcie
zlecenia pola są widoczne, ale zablokowane, bo termin i adres ma widzieć.

## Zakładanie kont

Ustawienia → **Konta i stanowiska**. Konta zapisują się od razu, bez klikania
„Zapisz ustawienia" — hasło to nie jest rzecz, przy której ktoś ma pamiętać
o dodatkowym kroku.

Dopóki nie ma żadnego konta, program działa jak dotąd: bez logowania. Pierwsze
konto zamyka program na hasło, ale **dopiero od następnego uruchomienia** —
nikt nie zostaje wyrzucony z programu w pół zdania.

Program nie pozwoli usunąć ani wyłączyć ostatniego konta właściciela. Bez niego
nikt nie wszedłby już do ustawień.

## Zapomniane hasło

**Pracownik** — właściciel ustawia nowe w Ustawieniach → Konta i stanowiska,
przyciskiem z kluczykiem.

**Właściciel** — nie ma kogo poprosić, więc trzeba sięgnąć do pliku danych.
Dane nie są stracone; blokuje tylko konto.

1. Zamknij program.
2. Otwórz `%APPDATA%\Lechrol WZ\dane-wz.json` w Notatniku
   (Win+R → wklej `%APPDATA%\Lechrol WZ` → Enter).
3. Zrób kopię tego pliku, zanim cokolwiek zmienisz.
4. Znajdź fragment `"users":[ ... ]` i zamień go na `"users":[]`.
5. Zapisz i uruchom program — poprosi o założenie konta właściciela od nowa.

Pozostałe dane (oferty, zlecenia, historia etapów) zostają nietknięte.
Wpisy w historii zleceń są podpisane imieniem, a nie odnośnikiem do konta,
więc po skasowaniu kont dalej widać, kto co robił.

## Wylogowanie

Przycisk przy imieniu na dole menu bocznego. Zamknięcie programu też wylogowuje
— „zostaw mnie zalogowanego" na wspólnym komputerze znosiłoby sens haseł.
