# TWORKI: ODDZIAŁ ZERO — projekt prototypu

## Cel i ustalenia

Krótki horror VR w WebXR i Babylon.js, uruchamiany w przeglądarce Meta Quest 2 bez komputera podczas grania. Docelowa historia użytkownika trwa 5–6 minut. Pierwszy etap sprawdza ruch, atmosferę i zachowanie przeciwnika w jednej scenie, a nie realizuje jeszcze całej historii.

Użytkownik wybrał płynny ruch i ma Quest 2 do testów. Projekt nie używa p4project ani jego metadanych i procedur. Oddział Zero i program NACHTIGALL są fikcyjne; gra nie przedstawia ich jako udokumentowanych wydarzeń historycznych.

## Przebieg pierwszej sceny

1. Strona startowa pokazuje tytuł, krótką instrukcję, informację o fikcji oraz przycisk wejścia do VR. Dźwięk uruchamia się po działaniu użytkownika.
2. Gracz pojawia się w niewielkim betonowym korytarzu. Ma latarkę, przed sobą biurko z kluczem oraz zamknięte drzwi wyjściowe.
3. Przekroczenie wyznaczonego miejsca uruchamia trzy przestrzenne uderzenia. Na końcu korytarza pojawia się wysoki lekarz bez twarzy.
4. Lekarz pozostaje nieruchomy, gdy jest widoczny przed graczem. Zbliża się, gdy gracz odwróci głowę. Kroki sygnalizują ruch.
5. Gracz podnosi klucz i otwiera drzwi. Przekroczenie wyjścia kończy próbę.
6. Jeżeli lekarz dotrze do gracza, następuje krótki blackout i ekran ponowienia próby. Restart zeruje klucz, przeciwnika i wyzwalacze dźwięków.

## Sterowanie i komfort

- Lewy drążek: płynny ruch po poziomej podłodze, względem poziomego kierunku głowy; patrzenie w górę nie powoduje unoszenia.
- Prawy drążek: płynny obrót wokół aktualnej pozycji głowy.
- Prawy kontroler: kierunek latarki i wskazywanie przedmiotów; spust podnosi pobliski klucz lub otwiera drzwi w zasięgu.
- Początkowa prędkość chodu 1,5 m/s i obrotu 60 stopni/s; ustawienia można zmniejszyć przed wejściem do VR.
- Kolizje blokują przechodzenie joystickiem przez ściany. Ruch głowy zawsze pozostaje śledzony, także podczas zakończenia próby.
- Brak automatycznego ruchu kamery, kołysania głowy, stroboskopu i wymuszonego biegu w pierwszym prototypie.
- Utrata sesji VR lub zdjęcie gogli pauzuje przebieg; powrót nie powoduje nagłego skoku przeciwnika.

## Mechanika obserwacji

Quest 2 nie dostarcza śledzenia oczu: używamy kierunku i pola widzenia głowy. Sprawdzamy widoczność bryły lekarza w widoku kamery VR oraz przesłonięcie przez geometrię. Dodajemy niewielki margines pola widzenia, aby lekarz nie poruszał się na jego skraju. Ruch zależy od upływu czasu, nie liczby klatek. Lekarz nigdy nie przekracza ścian; pierwszy korytarz zapewnia mu prostą trasę bez potrzeby nawigacji po całym budynku.

## Technologia i podział odpowiedzialności

TypeScript, Vite i Babylon.js. Scena używa prostych modeli proceduralnych, materiałów i generowanych dźwięków zastępczych — bez pobierania płatnych zasobów.

- Aplikacja: strona startowa, ustawienia, inicjalizacja silnika, wejście i wyjście z VR.
- Scena: korytarz, kolizje, biurko, drzwi, klucz, światło i model lekarza.
- Sterowanie: kontrolery, ruch, obrót i interakcje z ograniczonym zasięgiem.
- Przebieg: stany start, eksploracja, zagrożenie, wygrana i przegrana; reset oraz pauza.
- Przeciwnik: obserwacja, zbliżanie i wykrycie dotarcia do gracza.
- Audio: trzy uderzenia, szum otoczenia i kroki z pozycjami w scenie.

Podgląd komputerowy pozwala obejrzeć scenę i sprawdzić przebieg klawiaturą oraz myszą. Nie zastępuje testu sterowania i wydajności w goglach.

## Uruchomienie i błędy

WebXR wymaga bezpiecznego kontekstu. Dostęp Questa do adresu LAN po zwykłym HTTP nie jest docelową ścieżką testowania. Instrukcja uruchomienia będzie zawierać działającą drogę HTTPS lub localhost przez przekierowanie USB, zależnie od dostępnych narzędzi. Publikacja na zewnętrznym hostingu nie jest częścią tego etapu.

Brak WebXR wyświetla zrozumiały komunikat i pozostawia podgląd komputerowy. Odmowa wejścia do VR pozwala ponowić próbę. Brak kontrolerów zatrzymuje zależne od nich interakcje bez awarii. Ponowne uruchomienie nie dubluje dźwięków ani nasłuchów zdarzeń.

## Kryteria odbioru

- Projekt przechodzi kontrolę typów i build produkcyjny.
- Test logiki potwierdza, że obserwowany lekarz stoi, nieobserwowany się zbliża, a pauza i zakończenie zatrzymują ruch.
- Drzwi wymagają klucza; restart przywraca stan początkowy.
- Na Queście 2 działają wejście do VR, dwa kontrolery, latarka, płynny ruch i pełna próba od startu do zakończenia.
- Cel wydajności: stabilne 72 klatki/s przy sesji 72 Hz na Queście 2, do potwierdzenia rzeczywistym pomiarem. Ograniczamy dynamiczne światła, cienie i liczbę obiektów; brak luster i postprocessingu w prototypie.
- Raport oddziela automatyczne sprawdzenia od testów sprzętowych wykonanych przez użytkownika.

## Poza pierwszym etapem

Pełne 5–6 minut fabuły, schody, lustra, fotografie i sobowtór gracza, dialogi lektorskie, fotele zabiegowe, przemiany epok i finalna oprawa. Prototyp wyznacza podstawę do ich późniejszego zaplanowania.
