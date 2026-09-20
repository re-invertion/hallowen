# Oprawa, dubbing i wstęp — wykonane zmiany

Użytkownik potwierdził działanie pierwszego prototypu na Queście 2 i zamówił poprawkę odwróconych napisów, lepsze modele, dubbing oraz filmowy wstęp. Zaakceptowany kierunek: animowane akta i mroczny polski lektor.

## Wykonanie

- Napisy: wspólna orientacja płaszczyzny czytelną stroną do widza, również dla spojrzenia ukośnego i pionowego; naprawiono panel końca. Oznaczenia sal korzystają z tej samej funkcji.
- Korytarz: deterministyczne tekstury 512×512, ramy i uchwyty drzwi, numery sal, drewniane szuflady i dokumenty. Modele pozostają lekką geometrią proceduralną.
- Lekarz: ciągły fason fartucha, guziki, kieszeń, kołnierz, zaokrąglone rękawy, dłonie z palcami, buty i gładka głowa. Brak zmiany zasady ruchu podczas obserwacji.
- Wstęp: 38,5 s animacji akt na ekranie w scenie VR. Cztery rozdziały, fikcyjna ilustracja archiwalna, pisany tekst, stempel, postęp, trzy uderzenia. Pomijanie prawym spustem lub spacją. Brak narzuconego ruchu głowy.
- Dubbing: 11 plików MP3 (około 367 KB łącznie), syntetyczny polski MarekNeural. Gotowe nagrania dołączone do aplikacji, bez TTS podczas gry. FIFO kolejkuje kwestie; anulowanie wycina aktywną i oczekujące kwestie po pominięciu/resetowaniu.
- [Pochodzenie ilustracji i prompt](../public/media/PROVENANCE.md); asset z wbudowanego imagegen: `public/media/archive-corridor.png`.

## Weryfikacja

- `npm.cmd test`: 21 testów, wszystkie przechodzą.
- `npm.cmd run typecheck`: bez błędów.
- `npm.cmd run build`: sukces; pozostaje ostrzeżenie o wielkości pakietu silnika 3D.
- `node scripts/browser-check.mjs`: intro ma kontrast i mieści się w kadrze; pominięcie, klucz, wyjście, przegrana i pięć restartów bez błędów JavaScript.
- `node scripts/intro-check.mjs`: pełne odtworzenie, pauza/wznowienie, cztery nagrania narratora, trzy uderzenia i wejściowa kwestia radia; bez błędów JavaScript.
- Zrzuty intro, korytarza i lekarza obejrzano w Chromium. Niezależny przegląd wykrył prześwietlenie materiału intro i nadpisywanie kolejki audio; oba problemy naprawiono i zweryfikowano regresjami.
- Quest 2 pozostaje połączony przez USB z przekierowaniem portu 5173. Nowa wersja wymaga odbioru czytelności, dźwięku i wydajności w goglach. Nie deklarujemy pomiaru 72 FPS.

## Decyzje

Wstęp jest animacją w silniku, a nie plikiem MP4: zachowuje śledzenie głowy, pauzę i wybór pominięcia bez zewnętrznego odtwarzacza. Użytkownik zaakceptował animowane akta. Grafika archiwalna jest jawnie oznaczona jako fikcyjna ilustracja. Rozmiar ekranu dopasowuje się do widoku komputerowego; ekran VR pozostaje umieszczony w świecie przed graczem.
