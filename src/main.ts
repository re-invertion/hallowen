import './style.css';
import {createRuntime} from './game/runtime';
import {probeVrAvailability} from './vrSupport';

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const menu = el('menu');
const hud = el('hud');
const result = el('result');
const crosshair = el('crosshair');
const enter = el<HTMLButtonElement>('enter');
const desktopButton = el<HTMLButtonElement>('desktop');
const status = el('status');

let toastTimer = 0, resume = false, busy = false, vrCanAttempt = false;

function detectVR() {
  if (!window.isSecureContext) {
    vrCanAttempt = false;
    enter.disabled = true;
    status.textContent = 'VR wymaga HTTPS lub localhost. Podgląd na komputerze jest dostępny.';
    return;
  }

  const xr = navigator.xr;
  if (!xr) {
    vrCanAttempt = false;
    enter.disabled = true;
    status.textContent = 'Ta przeglądarka nie udostępnia WebXR. Podgląd na komputerze jest dostępny.';
    return;
  }

  // Do not block the menu on isSessionSupported(). Some headset/browser versions
  // can leave this promise pending despite exposing a usable XR API.
  vrCanAttempt = true;
  enter.disabled = false;
  status.textContent = 'WebXR wykryte. Możesz wejść do VR. Sprawdzam zgodność w tle…';

  void probeVrAvailability(() => xr.isSessionSupported('immersive-vr')).then(availability => {
    if (availability === 'supported') {
      vrCanAttempt = true;
      enter.disabled = false;
      status.textContent = 'Gogle gotowe. Wejdź do VR, aby rozpocząć.';
    } else if (availability === 'unsupported') {
      vrCanAttempt = false;
      enter.disabled = true;
      status.textContent = 'Tryb immersive-vr jest niedostępny. Podgląd na komputerze nadal działa.';
    } else {
      // Keep the button enabled. The actual enterXRAsync call remains the final
      // authority and its error is shown by action() if the browser rejects it.
      vrCanAttempt = true;
      enter.disabled = false;
      status.textContent = 'WebXR jest dostępne. Automatyczna kontrola nie odpowiedziała — możesz wejść do VR.';
    }
  });
}

detectVR();

let runtime: ReturnType<typeof createRuntime>;
try {
  runtime = createRuntime(el<HTMLCanvasElement>('game'), {
    message(text) {el('toast').textContent = text; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => el('toast').textContent = '', 3000);},
    ended(won, vr) {
      hud.hidden = true; crosshair.hidden = true; result.hidden = vr;
      el('result-title').textContent = won ? 'Tym razem wyszedłeś.' : 'Oddział nie wypuszcza.';
      el('result-copy').textContent = won ? 'Koniec prototypu. Eksperyment dopiero się zaczyna.' : 'Gdy odwracasz wzrok, lekarz się zbliża.';
      if (!vr) {el('blackout').style.opacity = '1'; window.setTimeout(() => el('blackout').style.opacity = '0', 350);}
    },
    paused() {
      menu.hidden = false; hud.hidden = true; crosshair.hidden = true;
      resume = ['intro', 'explore', 'knocking', 'threat'].includes(runtime.getState().phase);
      desktopButton.textContent = resume ? 'Wznów na komputerze →' : 'Podgląd na komputerze →';
    },
    status(s) {
      el('objective').textContent =
        s.phase === 'intro' ? 'Akta Oddziału Zero · Spacja: pomiń wstęp' :
        s.wardDoorOpen ? 'Rygiel otwarty. Dotrzyj do schodów.' :
        s.hasFuse ? 'Masz bezpiecznik. Otwórz awaryjny rygiel bloku zabiegowego.' :
        s.doorOpen ? 'Blok zabiegowy jest dalej. Znajdź bezpiecznik na wózku.' :
        s.hasKey ? 'Masz klucz. Wróć do głównego przejścia i otwórz je.' :
        s.keyCellVisited ? 'Przeszukaj otwartą celę.' :
        'Znajdź otwartą celę. E / prawy spust: interakcja.';
    },
    fps(text) {el('performance').textContent = text;},
  });
} catch (error) {
  enter.disabled = true;
  desktopButton.disabled = true;
  status.textContent = `Błąd inicjalizacji sceny: ${error instanceof Error ? error.message : String(error)}`;
  throw error;
}

function hideUI(vr = false) {menu.hidden = true; result.hidden = true; hud.hidden = vr; crosshair.hidden = vr;}

async function action(task: () => Promise<void>, vr = false) {
  if (busy) return;
  busy = true;
  enter.disabled = true;
  desktopButton.disabled = true;
  try {
    hideUI(vr);
    await task();
  } catch (error) {
    menu.hidden = false;
    hud.hidden = true;
    crosshair.hidden = true;
    status.textContent = `Nie udało się uruchomić: ${error instanceof Error ? error.message : String(error)}. Możesz spróbować ponownie.`;
  } finally {
    busy = false;
    desktopButton.disabled = false;
    enter.disabled = !vrCanAttempt;
  }
}

desktopButton.onclick = () => void action(() => resume ? runtime.resumeDesktop() : runtime.startDesktop());
enter.onclick = () => void action(() => runtime.startVR(), true);
el('restart').onclick = () => void action(() => runtime.restart());
el('pause').onclick = () => runtime.pause();
el('back').onclick = () => {
  void runtime.menu();
  resume = false;
  result.hidden = true;
  menu.hidden = false;
  desktopButton.textContent = 'Podgląd na komputerze →';
};

for (const id of ['walk', 'turn']) el<HTMLInputElement>(id).oninput = () => {
  const walk = Number(el<HTMLInputElement>('walk').value), turn = Number(el<HTMLInputElement>('turn').value);
  runtime.settings(walk, turn);
  el('walk-value').textContent = `${walk.toFixed(1).replace('.', ',')} m/s`;
  el('turn-value').textContent = `${turn}°/s`;
};

el('performance').hidden = !new URLSearchParams(location.search).has('debug');
if (import.meta.env.DEV) Object.defineProperty(window, '__oddzial', {value: {state: runtime.getState, scene: runtime.scene}});
