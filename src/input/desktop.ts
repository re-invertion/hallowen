import {UniversalCamera} from '@babylonjs/core/Cameras/universalCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {moveHorizontal} from './locomotion';
export function createDesktop(camera: UniversalCamera, canvas: HTMLCanvasElement, select: () => void, paused: () => void) {
  const keys = new Set<string>(); let enabled = false;
  const down = (e: KeyboardEvent) => {if (!enabled) return; keys.add(e.code); if (e.code === 'KeyE' && !e.repeat) select();};
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const mouse = (e: MouseEvent) => {if (document.pointerLockElement !== canvas || !enabled) return; camera.rotation.y += e.movementX * .002; camera.rotation.x = Math.max(-1.5, Math.min(1.5, camera.rotation.x + e.movementY * .002));};
  const unlock = () => {keys.clear(); if (!document.pointerLockElement && enabled) paused();};
  const blur = () => {keys.clear(); if (enabled) paused();};
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousemove', mouse); window.addEventListener('blur', blur); document.addEventListener('pointerlockchange', unlock);
  let forward = new Vector3(0, 0, 1);
  return {
    async enable() {enabled = true; await canvas.requestPointerLock();},
    disable() {enabled = false; keys.clear(); if (document.pointerLockElement) document.exitPointerLock();},
    update(dt: number, speed: number, doorOpen: boolean) {
      if (!enabled || document.pointerLockElement !== canvas) return;
      const f = camera.getForwardRay().direction;
      if (Math.hypot(f.x, f.z) > .01) forward = f;
      camera.position.copyFrom(moveHorizontal(camera.position, forward, {x: Number(keys.has('KeyD')) - Number(keys.has('KeyA')), y: Number(keys.has('KeyS')) - Number(keys.has('KeyW'))}, speed, dt, doorOpen));
    },
    dispose() {window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousemove', mouse); window.removeEventListener('blur', blur); document.removeEventListener('pointerlockchange', unlock);},
  };
}
