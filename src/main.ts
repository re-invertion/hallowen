import './style.css';
import {createRuntime} from './game/runtime';

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const menu = el('menu'), hud = el('hud'), result = el('result'), crosshair = el('crosshair'), enter = el<HTMLButtonElement>('enter'), status = el('status');
let toastTimer = 0, resume = false, busy = false;
const runtime = createRuntime(el<HTMLCanvasElement>('game'), {
  message(text) {el('toast').textContent = text; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => el('toast').textContent = '', 3000);},
  ended(won, vr) {
    hud.hidden = true; crosshair.hidden = true; result.hidden = vr;
    el('result-title').textContent = won ? 'Tym razem wyszedłeś.' : 'Oddział nie wypuszcza.';
    el('result-copy').textContent = won ? 'Koniec prototypu. Eksperyment dopiero się zaczyna.' : 'Gdy odwracasz wzrok, lekarz się zbliża.';
    if (!vr) {el('blackout').style.opacity = '1'; window.setTimeout(() => el('blackout').style.opacity = '0', 350);}
  },
  paused() {menu.hidden = false; hud.hidden = true; crosshair.hidden = true; resume = ['intro', 'explore', 'knocking', 'threat'].includes(runtime.getState().phase); el('desktop').textContent = resume ? 'Wznów na komputerze →' : 'Podgląd na komputerze →';},
  status(s) {el('objective').textContent = s.phase === 'intro' ? 'Akta Oddziału Zero · Spacja: pomiń wstęp' : s.wardDoorOpen ? 'Rygiel otwarty. Dotrzyj do schodów.' : s.hasFuse ? 'Masz bezpiecznik. Otwórz awaryjny rygiel bloku zabiegowego.' : s.doorOpen ? 'Blok zabiegowy jest dalej. Znajdź bezpiecznik na wózku.' : s.hasKey ? 'Masz klucz. Wróć do głównego przejścia i otwórz je.' : s.keyCellVisited ? 'Przeszukaj otwartą celę.' : 'Znajdź otwartą celę. E / prawy spust: interakcja.';},
  fps(text) {el('performance').textContent = text;},
});
function hideUI(vr = false) {menu.hidden = true; result.hidden = true; hud.hidden = vr; crosshair.hidden = vr;}
async function action(task: () => Promise<void>, vr = false) {
  if (busy) return; busy = true; enter.disabled = true;
  try {hideUI(vr); await task();}
  catch (error) {menu.hidden = false; hud.hidden = true; crosshair.hidden = true; status.textContent = `Nie udało się uruchomić: ${error instanceof Error ? error.message : String(error)}. Możesz spróbować ponownie.`;}
  finally {busy = false; enter.disabled = false;}
}
el('desktop').onclick = () => void action(() => resume ? runtime.resumeDesktop() : runtime.startDesktop());
enter.onclick = () => void action(() => runtime.startVR(), true);
el('restart').onclick = () => void action(() => runtime.restart());
el('pause').onclick = () => runtime.pause();
el('back').onclick = () => {void runtime.menu(); resume = false; result.hidden = true; menu.hidden = false; el('desktop').textContent = 'Podgląd na komputerze →';};
for (const id of ['walk', 'turn']) el<HTMLInputElement>(id).oninput = () => {
  const walk = Number(el<HTMLInputElement>('walk').value), turn = Number(el<HTMLInputElement>('turn').value);
  runtime.settings(walk, turn); el('walk-value').textContent = `${walk.toFixed(1).replace('.', ',')} m/s`; el('turn-value').textContent = `${turn}°/s`;
};
el('performance').hidden = !new URLSearchParams(location.search).has('debug');
async function detectVR() {
  try {
    const supported = window.isSecureContext && await navigator.xr?.isSessionSupported('immersive-vr');
    enter.disabled = !supported;
    status.textContent = supported ? 'Gogle gotowe. Wejdź do VR, aby rozpocząć.' : 'VR: otwórz tę stronę w Meta Quest Browser przez HTTPS lub localhost. Podgląd komputerowy jest dostępny.';
  } catch {enter.disabled = true; status.textContent = 'Przeglądarka nie udostępniła VR. Uruchom podgląd komputerowy.';}
}
void detectVR();
if (import.meta.env.DEV) Object.defineProperty(window, '__oddzial', {value: {state: runtime.getState, scene: runtime.scene}});
