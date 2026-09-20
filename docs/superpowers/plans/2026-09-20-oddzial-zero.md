# Oddział Zero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grywalny prototyp jednego korytarza WebXR na Meta Quest 2 z płynnym ruchem, latarką, kluczem i lekarzem poruszającym się poza polem widzenia.

**Architecture:** Babylon.js renderuje scenę i obsługuje sesję XR. Niezależny moduł logiki steruje przebiegiem, a adaptery wejścia, widoczności i dźwięku przekazują mu zdarzenia. Jeden cykl aktualizacji synchronizuje scenę ze stanem gry.

**Tech Stack:** TypeScript, Vite, @babylonjs/core, Vitest, Web Audio API. Wersje zależności dobrać do zainstalowanego Node podczas wykonania i zapisać w package-lock.json.

**Spec:** `docs/superpowers/specs/2026-09-20-oddzial-zero-design.md` — zaakceptowana przez użytkownika.

## Global Constraints

- Projekt nie używa p4project ani jego metadanych i procedur.
- Lewy drążek: płynny ruch po poziomej podłodze, względem poziomego kierunku głowy; patrzenie w górę nie powoduje unoszenia.
- Prawy drążek: płynny obrót wokół aktualnej pozycji głowy.
- Początkowa prędkość chodu 1,5 m/s i obrotu 60 stopni/s; ustawienia można zmniejszyć przed wejściem do VR.
- Brak automatycznego ruchu kamery, kołysania głowy, stroboskopu i wymuszonego biegu w pierwszym prototypie.
- Ruch głowy zawsze pozostaje śledzony, także podczas zakończenia próby.
- Publikacja na zewnętrznym hostingu nie jest częścią tego etapu.
- Cel wydajności: stabilne 72 klatki/s przy sesji 72 Hz na Queście 2, do potwierdzenia rzeczywistym pomiarem.
- Modele proceduralne i zastępcze dźwięki; bez luster, płatnych zasobów i pełnej fabuły w tym etapie.

## Review Focus

1. Zdjęcie gogli lub powrót po długiej przerwie: pauza nie może przenieść lekarza do gracza (zadanie 1 i 3).
2. Patrzenie pionowo i wychylenie głowy od środka przestrzeni: ruch pozostaje poziomy, obrót nie zatacza głową koła (zadanie 3).
3. Lekarz na skraju obrazu jednego oka: pozostaje nieruchomy, dopóki część postaci jest widoczna (zadanie 2).
4. Odmowa sesji XR lub odłączenie kontrolera: komunikat i możliwość ponowienia bez pozostawionego ruchu (zadanie 3).
5. Wielokrotne restarty: brak nakładających się uderzeń, podwójnych zdarzeń i zachowanego klucza (zadanie 4).

## Struktura plików

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`: narzędzia i powtarzalne uruchomienie.
- `index.html`, `src/main.ts`, `src/style.css`: polski ekran startowy, ustawienia i uruchomienie aplikacji.
- `src/game/state.ts`, `src/game/state.test.ts`: stany i reguły ukończenia próby.
- `src/scene/corridor.ts`: geometria, materiały, światła i obiekty interaktywne.
- `src/scene/visibility.ts`, `src/scene/visibility.test.ts`: obserwacja lekarza i przesłonięcia.
- `src/input/locomotion.ts`, `src/input/locomotion.test.ts`: obliczenia ruchu i kolizji.
- `src/input/xr.ts`, `src/input/desktop.ts`: kontrolery i podgląd komputerowy.
- `src/audio.ts`, `src/game/runtime.ts`: dźwięki i integracja cyklu gry.
- `README.md`: uruchomienie, sterowanie, połączenie gogli i wyniki testów.

## Zadanie 1: Logika gry i uruchamialny projekt

**Interfaces:** `Phase = 'start' | 'explore' | 'knocking' | 'threat' | 'won' | 'lost'`; `GameState = {phase: Phase; paused: boolean; hasKey: boolean; doorOpen: boolean; knockElapsed: number; enemyZ: number}`. Eksporty: `initialState(): GameState`, `startGame(): GameState`, `takeKey(s: GameState): GameState`, `openDoor(s: GameState): GameState`, `updateGame(s: GameState, input: {dt: number; observed: boolean; playerZ: number}): GameState`.

- [ ] Sprawdzić `node --version` i `npm.cmd --version`; utworzyć konfigurację TypeScript strict, Vite i Vitest. Skrypty: `dev: vite --host 127.0.0.1 --port 5173 --strictPort`, `typecheck: tsc --noEmit`, `test: vitest run`, `build: tsc --noEmit && vite build`.
- [ ] Napisać testy reguł przed implementacją, uruchomić `npm.cmd test` i potwierdzić błąd z powodu brakującego modułu:

```ts
it('requires a key', () => {
  expect(openDoor(startGame()).doorOpen).toBe(false);
  expect(openDoor(takeKey(startGame())).doorOpen).toBe(true);
});
it('freezes an observed or paused enemy', () => {
  const s = {...startGame(), phase: 'threat' as const, enemyZ: 3};
  expect(updateGame(s, {dt: .02, observed: true, playerZ: 10}).enemyZ).toBe(3);
  expect(updateGame({...s, paused: true}, {dt: 30, observed: false, playerZ: 10})).toEqual({...s, paused: true});
  expect(updateGame(s, {dt: .02, observed: false, playerZ: 10}).enemyZ).toBeGreaterThan(3);
});
```

- [ ] Zaimplementować niemutujące przejścia. Start gracza przy z=4; przekroczenie z=7 uruchamia sekwencję; lekarz startuje przy z=2, po trzech uderzeniach zbliża się z prędkością 0,7 m/s. Odległość poniżej 0,8 m kończy próbę przegraną; otwarte wyjście za z=19,5 kończy wygraną. Aktualizacja nie działa w pauzie i stanach końcowych; `dt` ograniczyć do 0,05 s i odrzucać wartości niefinitywne/ujemne.
- [ ] Dodać testy: terminalny stan nie zmienia pozycji, reset usuwa klucz, dwie symulacje przy 72 i 90 Hz przez sekundę dają to samo przemieszczenie. Uruchomić testy i kontrolę typów.

## Zadanie 2: Scena, widoczność i podgląd komputerowy

**Interfaces:** `createCorridor(scene: Scene): {enemy: TransformNode; enemyParts: AbstractMesh[]; key: AbstractMesh; door: AbstractMesh; walls: AbstractMesh[]; flashlight: SpotLight; dispose(): void}`; `isObserved(cameras: Camera[], parts: AbstractMesh[], walls: AbstractMesh[]): boolean`.

- [ ] Zbudować korytarz szerokości 3 m i długości 20 m, z podłogą, sufitem, drzwiami przy z=19 i biurkiem przy bocznej ścianie przy z=10. Przejście środkiem ma pozostawać wolne. Lekarz: biały wydłużony tułów, kończyny i gładka głowa z prostych brył. Ograniczyć materiały i światła; zamrozić statyczne macierze.

```ts
const floor = MeshBuilder.CreateBox('floor', {width: 3, height: .2, depth: 20}, scene);
floor.position.set(0, -.1, 10);
const camera = new UniversalCamera('desktop', new Vector3(0, 1.65, 4), scene);
camera.setTarget(new Vector3(0, 1.65, 10));
```

- [ ] Dodać podgląd WASD i myszą oraz E do interakcji. Nie podłączać równocześnie wbudowanego ruchu kamery i własnej lokomocji.
- [ ] Widoczność wyznaczać dla obu kamer oczu, używając brył części ciała z niewielkim marginesem oraz promieni do głowy, tułowia i krańców bryły. Lekarz jest obserwowany, jeśli przynajmniej jedna widoczna próbka nie jest przesłonięta ścianą. Nie stosować pojedynczego promienia do środka głowy.
- [ ] W testach z Babylon NullEngine ustawić kamery i bryły: postać przed kamerą → true; za kamerą → false; za pełną ścianą → false; część bryły na krawędzi widoku jednego oka → true. Przed implementacją uruchomić te przypadki i potwierdzić niepowodzenie; po niej wykonać je ponownie.
- [ ] Obejrzeć scenę w przeglądarce: wejście, czytelny klucz, wolne przejście, drzwi i sylwetka lekarza. Zanotować dostępność narzędzia przeglądarkowego; nie deklarować oględzin, jeśli nie można ich wykonać.

## Zadanie 3: WebXR, płynny ruch i interakcje

**Interfaces:** `moveHorizontal(position: Vector3, forward: Vector3, axes: {x: number; y: number}, speed: number, dt: number, doorOpen: boolean): Vector3`; `createXR(scene: Scene, onPause: (paused: boolean) => void, onSelect: (ray: Ray) => void): Promise<{enter(): Promise<void>; dispose(): void}>`. Przy braku XR zwrócić obsługiwany błąd do UI; nie wyłączać podglądu.

- [ ] Napisać test ruchu dla wektora patrzenia `(0, 1, 0)`: wysokość pozostaje stała, wynik jest skończony; używać ostatniego poprawnego poziomego kierunku. Testować także ruch po przekątnej (normalizacja), martwą strefę 0,15 i zatrzymanie na ścianie. Przykład asercji:

```ts
const p = new Vector3(0, 1.65, 4);
const next = moveHorizontal(p, new Vector3(0, 1, 0), {x: 0, y: -1}, 1.5, .02, false);
expect(next.y).toBe(p.y);
expect(Number.isFinite(next.z)).toBe(true);
```

- [ ] Zaimplementować ruch z kolizjami promienia ciała 0,22 m z prostokątami ścian, biurka i zamkniętych drzwi; ruch dzielić na małe kroki, aby nie przeskakiwał przeszkód. Prawy drążek zmienia yaw; skorygować translację, aby światowa pozycja głowy podczas samego obrotu nie zmieniała się.
- [ ] Utworzyć doświadczenie Babylon XR bez teleportacji i bez pobierania modeli kontrolerów. Przed użyciem konkretnego API przeczytać deklaracje zainstalowanej wersji w node_modules. Użyć handedness oraz komponentów thumbstick/trigger, nie zakładać, że pierwszy kontroler to prawy.
- [ ] Prawy kontroler ustawia światło i promień interakcji; spust obsłużyć na zboczu naciśnięcia. Trafiony klucz lub drzwi muszą znajdować się w zasięgu 1,5 m i bez ściany pomiędzy. Zniknięcie kontrolera zeruje osie i blokuje jego interakcje.
- [ ] Obsłużyć widoczność sesji i zakończenie XR: pauza logiki/audio, wyzerowanie czasu poprzedniej klatki, bez dodatkowego naliczania upływu czasu. Ponowne wejście ma bezpiecznie wznawiać stan.
- [ ] W goglach sprawdzić: oba drążki, pionowe spojrzenie, obrót po wychyleniu głowy, kolizje, odłożenie kontrolera, zdjęcie i założenie gogli. W przeglądarce bez XR sprawdzić komunikat; odrzucenie żądania wejścia ma przywrócić aktywny przycisk ponowienia. Nie oznaczać testów gogli jako zaliczonych bez wyniku użytkownika lub rzeczywistego testu.

## Zadanie 4: Dźwięk, pełna próba i przekazanie do testów

**Interfaces:** `createAudio(): {unlock(): Promise<void>; setListener(position: Vector3, forward: Vector3, up: Vector3): void; knock(position: Vector3): void; footstep(position: Vector3): void; pause(): void; reset(): void; dispose(): void}`. `startRuntime(scene: Scene): {restart(): void; dispose(): void}` integruje poprzednie moduły.

- [ ] Utworzyć jeden AudioContext po kliknięciu Start. Uderzenia i kroki generować z krótkiego szumu z filtrem i obwiednią, prowadzonego przez PannerNode HRTF. Listener aktualizować z aktywnej kamery. Zdarzenia uderzeń wyzwalać przy przekraczaniu 0, 0,8 i 1,6 s czasu sekwencji; zagrożenie aktywować po 2,4 s. Nie używać niezależnych timeoutów, które przeżyją restart.

```ts
const thresholds = [0, .8, 1.6];
const due = thresholds.filter(t => previousTime < t && currentTime >= t);
// Dla startu sekwencji previousTime = -Number.EPSILON.
```

- [ ] Test harmonogramu: jedna duża aktualizacja nie gubi przekroczonych progów, powtórzenie tego samego czasu nic nie emituje, reset pozwala dokładnie na trzy nowe uderzenia. Audio reset zatrzymuje aktywne źródła i usuwa je ze zbioru.
- [ ] Dodać polski ekran startowy: tytuł, informacja o fikcji, sterowanie, suwaki 0,5–1,5 m/s i 20–60 stopni/s, przyciski VR i podglądu. Dodać komunikaty o braku WebXR, błędzie sesji i stanie wczytywania.
- [ ] Ekran końca wyświetlać również wewnątrz VR jako panel w świecie, dostępny promieniem kontrolera. Krótki blackout ma wygaszać scenę bez zatrzymania śledzenia głowy. Przycisk „Ponów próbę” przywraca drzwi, klucz, pozycje, dźwięki i stan; obsługi zdarzeń podłączyć tylko raz.
- [ ] Przejść podgląd komputerowy: odmowa otwarcia drzwi bez klucza, trzy uderzenia, zatrzymanie lekarza podczas patrzenia, przegrana, restart i wygrana. Powtórzyć restart pięć razy i sprawdzić liczbę zdarzeń/audio oraz brak narastających listenerów.
- [ ] Wykonać `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`. Naprawić błędy przed przekazaniem.
- [ ] Zapisać README z dokładną ścieżką testowania przez USB:

```powershell
npm.cmd install
npm.cmd run dev
# Drugi terminal, po połączeniu Questa z włączonym trybem deweloperskim
# i zaakceptowaniu debugowania USB w goglach:
adb devices
adb reverse tcp:5173 tcp:5173
# W Meta Quest Browser otworzyć http://localhost:5173
```

Jeśli `adb devices` pokazuje `unauthorized`, użytkownik musi zaakceptować debugowanie w goglach. Jeśli brak urządzenia, sprawdzić kabel danych i tryb deweloperski; nie ogłaszać linku jako dostępnego. Testowy serwer wymaga działającego komputera; po późniejszej publikacji HTTPS komputer nie będzie potrzebny podczas grania.

- [ ] Dodać pomiar czasu klatek w trybie diagnostycznym i zebrać wynik z Questa: 72 Hz oznacza budżet około 13,9 ms na klatkę. Bez wyniku sprzętowego raportować cel jako niezweryfikowany. Sprawdzić całą próbę, kontrolery, restart i pauzę na sprzęcie z użytkownikiem.

## Organizacja wykonania

Rekomendacja: wykonanie bezpośrednio w tej sesji, kolejno zadania 1–4. Projekt jest mały, a integracja XR i sceny wymaga spójności. Nie tworzyć repozytorium zdalnego, nie publikować strony i nie używać p4project. Folder obecnie nie jest repozytorium Git; ewentualna lokalna inicjalizacja i commity nie wymagają zdalnego hostingu, ale nie są warunkiem testowania gry.

## Źródła techniczne

- Meta: https://developers.meta.com/horizon/documentation/web/browser-remote-debugging/ — testowanie lokalnego portu przez ADB reverse.
- Babylon: https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/webXR/webXRInputControllerSupport.md — obsługa kontrolerów.
- Przy implementacji API weryfikować względem zainstalowanych deklaracji Babylon.js i dokumentacji; nie przyjmować wersji na podstawie pamięci.
