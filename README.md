# TWORKI: ODDZIAŁ ZERO

Prototyp horroru WebXR dla Meta Quest 2. Animowany wstęp fabularny, jeden korytarz, latarka, klucz, trzy uderzenia i lekarz, który zbliża się, gdy nie znajduje się w polu widzenia. To pierwszy fragment gry, nie pełna 5–6-minutowa fabuła.

Historia Oddziału Zero i program NACHTIGALL są fikcyjne. Projekt nie korzysta z p4project.

## Wstęp, grafika i dubbing

- Wstęp trwa około 38 sekund: cztery animowane akta na kinowym ekranie wewnątrz VR, ilustracja archiwalna, polski lektor i trzy uderzenia. To animacja renderowana w grze, bez wymuszania ruchu głowy. Prawy spust lub spacja pomijają wstęp. Restart próby nie odtwarza go ponownie; powrót do menu i nowa gra odtwarzają całość.
- Polski dubbing: 11 gotowych plików MP3 — narrator, radio, szept oraz kwestie dotyczące klucza i zakończenia. Kwestie oczekujące są odtwarzane kolejno. Reset i pominięcie wstępu anulują poprzednie nagrania. Podczas gry nie ma połączenia z usługą TTS.
- Nowa sylwetka lekarza: modelowany fartuch, rękawy, dłonie z palcami, buty i gładka twarz. Korytarz ma faktury tynku, metalu, drewna i kafli, ramy drzwi, numery sal, uchwyty, szuflady i dokumenty.
- Napisy na panelach są zwrócone czytelną stroną do gracza; orientację sprawdza test geometryczny.
- Głos jest syntetyczny, a kadr archiwalny wygenerowany przez AI. Pochodzenie i pełny prompt: [public/media/PROVENANCE.md](public/media/PROVENANCE.md). Transkrypcja: [public/audio/transcript.json](public/audio/transcript.json). Skrypt regeneracji głosu wymaga osobno Pythona, edge-tts i FFmpeg; nie są potrzebne do uruchomienia gry.

## Uruchomienie na komputerze

Wymagany Node.js zgodny z Vite 8 (sprawdzono Node 22.21.1).

```powershell
npm.cmd ci
npm.cmd run dev
```

Otwórz http://127.0.0.1:5173 i wybierz „Podgląd na komputerze”. WASD: chodzenie; mysz: rozglądanie; E: interakcja; Esc: pauza. Kliknięcie „Wznów na komputerze” ponownie przechwytuje mysz. Klucz leży na biurku, drzwi są na końcu korytarza.

## Quest 2 przez USB

1. Włącz tryb deweloperski gogli. Podłącz kabel USB obsługujący dane i zaakceptuj debugowanie USB w goglach.
2. Pozostaw serwer `npm.cmd run dev` uruchomiony. W drugim terminalu:

```powershell
adb devices
adb reverse tcp:5173 tcp:5173
adb reverse --list
```

3. W Meta Quest Browser ręcznie otwórz **http://localhost:5173/**, wybierz **WEJDŹ DO VR** i zaakceptuj wejście w VR, jeśli przeglądarka zapyta.
4. Lewy drążek: chodzenie względem kierunku głowy; prawy drążek: płynny obrót. Prawy kontroler kieruje latarką. Wskaż klucz lub drzwi i naciśnij prawy spust w odległości do 1,5 m.
5. Po zakończeniu wskaż panel ponowienia i naciśnij spust. Wyjście z sesji VR pauzuje próbę; ponowne wejście wznawia niedokończoną próbę.

Test przez USB wymaga włączonego komputera i serwera, choć sama gra renderuje się w goglach. Docelowy hosting HTTPS umożliwi grę bez komputera; nie został jeszcze opublikowany.

Gdy `adb devices` pokazuje `unauthorized`, zaakceptuj debugowanie w goglach. Brak urządzenia: sprawdź kabel danych i tryb deweloperski. Po ponownym podłączeniu może być potrzebne ponowienie `adb reverse`. Zwykły adres `http://192.168...` nie zapewnia bezpiecznego kontekstu WebXR.

Oficjalna instrukcja Meta: https://developers.meta.com/horizon/documentation/web/browser-remote-debugging/

## Sprawdzenia

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
# Opcjonalnie test przeglądarkowy (przy uruchomionym serwerze dev):
npx.cmd playwright install chromium
node scripts/browser-check.mjs
node scripts/intro-check.mjs
```

Test przeglądarkowy sprawdza rzeczywiste interakcje klawiaturą, blokadę drzwi, zebranie klucza, wygraną, przegraną i pięć restartów. Do ustawienia punktów testowych korzysta z diagnostyki sceny dostępnej wyłącznie w trybie dev; nie zastępuje fizycznego przejścia całej trasy. Zrzuty zapisuje w ignorowanym `test-results/`.

Parametr `?debug=1` pokazuje pomiar FPS na stronie 2D. Wyniki komputera, szczególnie programowego renderera testowego, nie są pomiarem Questa. Cel: 72 FPS przy sesji 72 Hz; wymaga sprawdzenia sprzętowego. Nie wymuszamy zmiany częstotliwości sesji.

### Stan weryfikacji

- Testy jednostkowe: logika, przegrana w bocznych częściach korytarza, pauza/wznowienie, kolizje, widoczność z obu oczu, wygaszenie obrazu w scenie.
- Build i kontrola TypeScript: wykonane.
- Przeglądarka Chromium: pełna próba i wielokrotne restarty sprawdzone bez błędów JavaScript.
- Quest 2: użytkownik potwierdził działanie pierwszego prototypu. Nowe modele, intro, czytelność tekstu i dubbing wymagają ponownego odbioru w goglach; 72 FPS nadal nie zostało zmierzone na sprzęcie.
- Lustra, przemiany epok, pełne sale zabiegowe i finał z sobowtórem nie należą jeszcze do tej wersji.
- Build zgłasza duży pakiet silnika 3D; po ograniczeniu importów główny pakiet ma około 1,4 MB (337 KB gzip). To ostrzeżenie o rozmiarze, nie nieudany build.

## Test odbiorczy w goglach

- Rozglądanie i płynny ruch bez unoszenia podczas patrzenia w górę.
- Obrót po fizycznym wychyleniu głowy nie przenosi gracza po okręgu.
- Latarka porusza się z prawą ręką; klucz i drzwi reagują na spust.
- Lekarz stoi, gdy jest widoczny, i zbliża się po odwróceniu głowy.
- Zdjęcie gogli zatrzymuje próbę; powrót nie powoduje skoku przeciwnika.
- Restart po przegranej działa również przy ścianie i przy pionowym spojrzeniu.
- Nie ma wyraźnych spadków płynności. Pomiar na sprzęcie dokumentujemy osobno od testów automatycznych.
