import {Engine} from '@babylonjs/core/Engines/engine';
import {Scene} from '@babylonjs/core/scene';
import {UniversalCamera} from '@babylonjs/core/Cameras/universalCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Ray} from '@babylonjs/core/Culling/ray';
import {Camera} from '@babylonjs/core/Cameras/camera';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {createCorridor} from '../scene/corridor';
import {isObserved} from '../scene/visibility';
import {createDesktop} from '../input/desktop';
import {createXR} from '../input/xr';
import {isInKeyCell} from '../input/locomotion';
import {createAudio} from '../audio';
import {createEndingFade} from '../scene/ending';
import {pickInteraction} from './interaction';
import {createIntroFilm} from '../intro/film';
import {initialState, startGame, updateGame, enterKeyCell, takeKey, openDoor, takeFuse, openWardDoor, isPlaying, dueKnocks, resumeOrStart, type GameState} from './state';

export function createRuntime(canvas: HTMLCanvasElement, callbacks: {message: (text: string) => void; ended: (won: boolean, vr: boolean) => void; paused: () => void; status: (s: GameState) => void; fps: (value: string) => void}) {
  const engine = new Engine(canvas, true, {stencil: false, preserveDrawingBuffer: false});
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio));
  const scene = new Scene(engine);
  const camera = new UniversalCamera('desktop', new Vector3(0, 1.65, 4), scene); camera.minZ = .05; camera.maxZ = 60;
  const world = createCorridor(scene), audio = createAudio();
  const say = (id: string, radio = false, position?: Vector3, queue = false) => {void audio.speak(id, radio, position, queue).catch(() => callbacks.message('Nagranie jest niedostępne. Możesz grać dalej.'));};
  const intro = createIntroFilm(scene, id => say(id), () => audio.knock(new Vector3(0, 1.5, 0)));
  const fade = createEndingFade(scene);
  let state = initialState(), mode: 'menu' | 'desktop' | 'vr' = 'menu';
  let xr: Awaited<ReturnType<typeof createXR>> | null = null;
  let walkSpeed = 1.5, turnSpeed = 60, previousTime = performance.now(), nextStep = 0, endTime = 0;
  const dot = MeshBuilder.CreateSphere('aim dot', {diameter: .016, segments: 6}, scene);
  const dotMat = new StandardMaterial('aim material', scene); dotMat.emissiveColor = new Color3(.75, .9, .55); dotMat.disableLighting = true; dot.material = dotMat; dot.isPickable = false; dot.setEnabled(false);
  const desktop = createDesktop(camera, canvas, () => select(camera.getForwardRay(1.5)), () => pause());
  const activeCamera = (): Camera => xr?.active() ? xr.xr.baseExperience.camera : camera;
  const panelVisible = () => world.panel.isEnabled();

  function select(ray: Ray) {
    if (state.paused) return;
    if (intro.active) {void finishIntro(); return;}
    const hit = pickInteraction(scene, ray, world.walls, world.panel);
    if (!hit?.hit || !hit.pickedMesh) return;
    const action = hit.pickedMesh.metadata?.interaction;
    if (action === 'restart' && panelVisible() && performance.now() - endTime > 700) {void restart(); return;}
    if (!isPlaying(state)) return;
    if (hit.distance > 1.5) {if (action) callbacks.message('Podejdź bliżej.'); return;}

    if (action === 'key') {
      const hadKey = state.hasKey;
      state = takeKey(state);
      if (!hadKey && state.hasKey) {
        callbacks.message('Masz klucz. Wróć do głównego przejścia.');
        world.keyCellLight.forceOutage(.9);
        audio.triggerKeyShock();
        say('key', true, undefined, true);
      }
    }
    if (action === 'door') {
      state = openDoor(state);
      callbacks.message(state.doorOpen ? 'Otwarte. Idź dalej.' : 'Zamknięte. Znajdź klucz.');
      if (!state.doorOpen) say('locked', false, undefined, true);
    }
    if (action === 'fuse') {
      state = takeFuse(state);
      if (state.hasFuse) callbacks.message('Bezpiecznik 25 A. Pasuje do awaryjnego rygla.');
    }
    if (action === 'wardDoor') {
      state = openWardDoor(state);
      callbacks.message(state.wardDoorOpen ? 'Rygiel puścił. Schody są za drzwiami.' : 'Brak zasilania. Znajdź bezpiecznik w bloku zabiegowym.');
    }
  }

  function pause() {
    if (mode === 'menu' || state.paused) return;
    state = {...state, paused: true}; audio.pause(); desktop.disable(); callbacks.paused();
  }

  function synchronize() {
    world.key.setEnabled(!state.hasKey);
    world.door.setEnabled(!state.doorOpen);
    world.fuse.setEnabled(!state.hasFuse);
    world.wardDoor.setEnabled(!state.wardDoorOpen);
    world.enemy.setEnabled(state.phase === 'threat');
    world.enemy.position.set(state.enemyX, 0, state.enemyZ);
    callbacks.status(state);
  }

  async function restart() {
    intro.stop();
    state = startGame();
    nextStep = 0;
    previousTime = performance.now();
    world.panel.setEnabled(false);
    world.resetAtmosphere();
    audio.reset();
    if (xr?.active()) xr.reset(); else {camera.position.set(0, 1.65, 4); camera.rotation.set(0, 0, 0);}
    synchronize();
    await audio.unlock();
    say('radio-start', true);
    if (mode === 'desktop') await desktop.enable().catch(() => callbacks.message('Kliknij scenę, aby przejąć mysz.'));
  }

  async function beginIntro() {
    audio.reset();
    world.resetAtmosphere();
    state = {...initialState(), phase: 'intro'};
    world.panel.setEnabled(false);
    if (xr?.active()) xr.reset(); else {camera.position.set(0, 1.65, 4); camera.rotation.set(0, 0, 0);}
    await audio.unlock();
    await audio.preload().catch(() => callbacks.message('Nie wszystkie nagrania zostały wczytane.'));
    previousTime = performance.now();
    intro.start(activeCamera());
    if (mode === 'desktop') await desktop.enable().catch(() => {});
  }

  async function finishIntro() {
    if (!intro.active) return;
    intro.stop();
    audio.reset();
    world.resetAtmosphere();
    state = startGame();
    previousTime = performance.now();
    say('radio-start', true);
  }

  const skipKey = (event: KeyboardEvent) => {if (event.code === 'Space' && intro.active && !state.paused) {event.preventDefault(); void finishIntro();}};
  window.addEventListener('keydown', skipKey);
  const resize = () => engine.resize(); window.addEventListener('resize', resize);
  const visible = () => {
    if (document.hidden && mode !== 'menu') {
      state = {...state, paused: true};
      audio.pause();
      if (mode === 'desktop') {desktop.disable(); callbacks.paused();}
    }
    previousTime = performance.now();
  };
  document.addEventListener('visibilitychange', visible);
  const click = () => {if (mode === 'desktop' && !state.paused) void desktop.enable().catch(() => {});};
  canvas.addEventListener('click', click);

  engine.runRenderLoop(() => {
    const now = performance.now(), dt = Math.min(.05, (now - previousTime) / 1000); previousTime = now;
    const cam = activeCamera();
    if (mode === 'menu' && state.phase === 'start') camera.rotation.y = .12 + Math.sin(now * .00012) * .06;

    if (isPlaying(state)) desktop.update(dt, walkSpeed, state.doorOpen, state.wardDoorOpen);
    xr?.update(dt, walkSpeed, turnSpeed, state.doorOpen, state.wardDoorOpen, isPlaying(state), !state.paused);
    if (intro.update(dt, state.paused, cam)) void finishIntro();

    const ray = xr?.active() ? xr.ray() : cam.getForwardRay(16);
    if (ray) {
      world.flashlight.position.copyFrom(ray.origin);
      world.flashlight.direction.copyFrom(ray.direction);
      world.flashlight.setEnabled(true);
    } else world.flashlight.setEnabled(false);

    dot.setEnabled(Boolean(xr?.active() && ray && !intro.active));
    if (xr?.active() && ray) {
      const hit = scene.pickWithRay(ray, m => m !== dot && m.isEnabled());
      dot.position.copyFrom(hit?.pickedPoint ?? ray.origin.add(ray.direction.scale(1.5)));
    }

    if (isPlaying(state) && !state.keyCellVisited && isInKeyCell(cam.position)) {
      state = enterKeyCell(state);
      callbacks.message('Cela jest otwarta. Przeszukaj ją.');
    }

    const keyDistance = state.hasKey ? Number.POSITIVE_INFINITY : Vector3.Distance(cam.position, world.key.getAbsolutePosition());
    world.keyCellLight.setAgitated(state.keyCellVisited && !state.hasKey && keyDistance < 1.55);
    world.updateAtmosphere(dt);

    const previous = state;
    const cameras = cam.rigCameras.length ? cam.rigCameras : [cam];
    const observed = state.phase === 'threat' && isObserved(cameras, world.enemyParts, world.walls);
    state = updateGame(state, {dt, observed, playerZ: cam.position.z, playerX: cam.position.x});

    const zone = cam.position.z >= 31 ? 'treatment' : cam.position.z >= 19 ? 'service' : 'corridor';
    audio.setMood(state.phase, state.phase === 'threat' && !observed, zone);

    if (previous.phase === 'explore' && state.phase === 'knocking') say('radio-warning', true);
    if (previous.phase === 'knocking' && state.phase === 'threat') say('whisper', false, cam.position.subtract(cam.getForwardRay().direction.scale(.4)), true);

    if (state.phase === 'knocking') {
      const before = previous.phase === 'knocking' ? previous.knockElapsed : -Number.EPSILON;
      for (const _ of dueKnocks(before, state.knockElapsed)) audio.knock(new Vector3(0, 1.5, .2));
    }

    if (state.phase === 'threat' && !observed && !state.paused) {
      nextStep -= dt;
      if (nextStep <= 0) {
        audio.footstep(new Vector3(0, .1, state.enemyZ));
        nextStep = .75;
      }
    }

    world.enemy.rotation.y = Math.atan2(cam.position.x - state.enemyX, cam.position.z - state.enemyZ);

    if (state.phase !== previous.phase && (state.phase === 'won' || state.phase === 'lost')) {
      endTime = now;
      audio.reset();
      desktop.disable();
      say(state.phase === 'won' ? 'won' : 'lost', state.phase === 'won');
      world.showPanel(state.phase === 'won' ? 'Przejście otwarte.' : 'Zostałeś na oddziale.', cam.position, cam.getForwardRay().direction);
      callbacks.ended(state.phase === 'won', Boolean(xr?.active()));
    }

    synchronize();
    audio.setListener(cam.position, cam.getForwardRay().direction, cam.getDirection(Vector3.Up()));
    audio.updateAmbience(dt, isPlaying(state) && !state.paused);
    fade.update(cam, state.phase === 'won' || state.phase === 'lost' ? (now - endTime) / 1000 : -1);
    callbacks.fps(`${engine.getFps().toFixed(0)} FPS · ${(1000 / Math.max(engine.getFps(), 1)).toFixed(1)} ms / klatkę`);
    scene.render();
  });

  return {
    scene,
    settings(walk: number, turn: number) {walkSpeed = walk; turnSpeed = turn;},
    async startDesktop() {mode = 'desktop'; await beginIntro();},
    async startVR() {
      desktop.disable();
      xr ??= await createXR(scene, paused => {
        state = {...state, paused};
        previousTime = performance.now();
        if (paused) audio.pause(); else void audio.unlock().catch(() => {});
      }, select, () => {
        const head = xr!.xr.baseExperience.camera;
        camera.position.copyFrom(head.position);
        camera.rotation.copyFrom(head.rotationQuaternion.toEulerAngles());
        mode = 'menu';
        callbacks.paused();
      });
      const resuming = ['intro', 'explore', 'knocking', 'threat'].includes(state.phase);
      await xr.enter();
      mode = 'vr';
      if (resuming) {
        state = resumeOrStart(state);
        previousTime = performance.now();
        await audio.unlock();
      } else await beginIntro();
    },
    async resumeDesktop() {
      state = {...state, paused: false};
      mode = 'desktop';
      previousTime = performance.now();
      await audio.unlock();
      await desktop.enable();
    },
    async menu() {
      intro.stop();
      desktop.disable();
      audio.reset();
      audio.pause();
      world.resetAtmosphere();
      state = initialState();
      mode = 'menu';
      world.panel.setEnabled(false);
      if (xr?.active()) await xr.exit();
      camera.position.set(0, 1.65, 4);
      camera.rotation.set(0, 0, 0);
    },
    restart, pause, skipIntro: finishIntro,
    getState: () => ({...state}),
    dispose() {
      engine.stopRenderLoop();
      desktop.dispose();
      xr?.dispose();
      audio.dispose();
      world.dispose();
      scene.dispose();
      engine.dispose();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', skipKey);
      document.removeEventListener('visibilitychange', visible);
      canvas.removeEventListener('click', click);
    },
  };
}
