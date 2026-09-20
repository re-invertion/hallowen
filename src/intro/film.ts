import {Scene} from '@babylonjs/core/scene';
import {Camera} from '@babylonjs/core/Cameras/camera';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {faceTextToward} from '../scene/labels';
import {CHAPTERS, introFrame, introCues, introKnocks} from './timeline';

export function createIntroFilm(scene: Scene, speak: (id: string) => void, knock: () => void) {
  const screen = MeshBuilder.CreatePlane('archive cinema', {width: 3.6, height: 2.025, sideOrientation: Mesh.DOUBLESIDE}, scene);
  const texture = new DynamicTexture('animated archives', {width: 1280, height: 720}, scene, false);
  const ctx = texture.getContext() as CanvasRenderingContext2D;
  const mat = new StandardMaterial('archive screen', scene); mat.disableLighting = true; mat.emissiveTexture = texture; mat.diffuseColor = Color3.Black(); mat.emissiveColor = Color3.Black(); mat.fogEnabled = false; screen.material = mat; screen.renderingGroupId = 2; screen.isPickable = false;
  const surround = MeshBuilder.CreateSphere('cinema darkness', {diameter: 20, segments: 8, sideOrientation: Mesh.BACKSIDE}, scene);
  const black = new StandardMaterial('cinema black', scene); black.disableLighting = true; black.emissiveColor = Color3.Black(); black.diffuseColor = Color3.Black(); surround.material = black; surround.renderingGroupId = 1; surround.isPickable = false;
  const photo = new Image(); photo.src = `${import.meta.env.BASE_URL}media/archive-corridor.png`;
  let active = false, elapsed = 0, drawTime = -1;
  screen.setEnabled(false); surround.setEnabled(false);
  const draw = () => {
    const frame = introFrame(elapsed), c = CHAPTERS[frame.chapter];
    ctx.fillStyle = '#0b0d0a'; ctx.fillRect(0, 0, 1280, 720);
    if (photo.complete && photo.naturalWidth) {
      const zoom = 1.03 + frame.localTime * .004, w = 1280 * zoom, h = w * photo.naturalHeight / photo.naturalWidth;
      ctx.globalAlpha = .55; ctx.drawImage(photo, 1280 - w + frame.chapter * 8, (720 - h) / 2, w, h); ctx.globalAlpha = 1;
    }
    const shade = ctx.createLinearGradient(0, 0, 1280, 0); shade.addColorStop(0, '#080c09e8'); shade.addColorStop(.7, '#080c0960'); shade.addColorStop(1, '#080c0920'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 1280, 720);
    ctx.save();
    ctx.translate(65, 120 + Math.max(0, 1 - frame.localTime * 1.6) * 30); ctx.rotate(-.013);
    ctx.globalAlpha = Math.min(1, frame.localTime * 2 + .05);
    ctx.fillStyle = '#d1c5a7'; ctx.fillRect(0, 0, 620, 405);
    ctx.fillStyle = '#b3a88b'; ctx.fillRect(16, 0, 2, 405); ctx.fillRect(0, 52, 620, 1);
    ctx.textAlign = 'left'; ctx.fillStyle = '#655f4e'; ctx.font = '16px monospace'; ctx.fillText(c.code, 35, 34);
    ctx.fillStyle = '#282e25'; ctx.font = 'bold 37px Georgia'; ctx.fillText(c.title, 35, 112);
    ctx.font = '21px monospace';
    c.lines.forEach((line, i) => {const count = Math.max(0, Math.floor((frame.localTime - .6 - i * .55) * 36)); ctx.fillText(line.slice(0, count), 35, 174 + i * 43);});
    ctx.strokeStyle = '#7c2823'; ctx.lineWidth = 3; ctx.save(); ctx.translate(378, 315); ctx.rotate(-.12); ctx.strokeRect(-15, -30, 205, 48); ctx.fillStyle = '#7c2823'; ctx.font = 'bold 22px monospace'; ctx.fillText(frame.chapter === 3 ? 'NIE OTWIERAĆ' : 'ŚCIŚLE TAJNE', 0, 2); ctx.restore();
    for (let i = 0; i < 3; i++) {ctx.fillStyle = '#a69b8055'; ctx.fillRect(35, 336 + i * 15, 220 - i * 30, 3);}
    ctx.restore();
    ctx.fillStyle = '#c8c7ad'; ctx.textAlign = 'right'; ctx.font = '14px monospace'; ctx.fillText('SONDERABTEILUNG 0', 1215, 82);
    ctx.font = '124px Georgia'; ctx.fillStyle = '#c5c2a650'; ctx.fillText(String(frame.chapter === 3 ? 47 : 0).padStart(2, '0'), 1215, 550);
    ctx.textAlign = 'left'; ctx.font = '13px monospace'; ctx.fillStyle = '#b4b79f'; ctx.fillText('FIKCYJNE AKTA / ODDZIAŁ ZERO', 65, 58);
    ctx.fillStyle = '#a3a48f'; ctx.font = '14px Arial'; ctx.fillText('Historia Oddziału Zero jest fikcyjna. Kadr jest ilustracją.', 65, 616);
    ctx.font = '15px monospace'; ctx.fillStyle = '#d3d6ba'; ctx.fillText('PRAWY SPUST LUB SPACJA — POMIŃ WSTĘP', 65, 650);
    ctx.fillStyle = '#68705a'; ctx.fillRect(65, 680, 1150, 2); ctx.fillStyle = '#c1c6a4'; ctx.fillRect(65, 680, 1150 * frame.progress, 2);
    // Film scratches drift slowly; no flashing or stroboscopic frames.
    ctx.fillStyle = '#bcb69d0c'; for (let i = 0; i < 5; i++) ctx.fillRect((i * 277 + elapsed * 4) % 1280, 0, 1, 720);
    texture.update();
  };
  draw();
  return {
    get active() {return active;},
    get elapsed() {return elapsed;},
    start(camera: Camera) {
      active = true; elapsed = 0; drawTime = -1; screen.setEnabled(true); surround.setEnabled(true);
      const f = camera.getForwardRay().direction; const horizontal = new Vector3(f.x, 0, f.z);
      if (horizontal.lengthSquared() < .01) horizontal.set(0, 0, 1); horizontal.normalize();
      const aspect = scene.getEngine().getAspectRatio(camera);
      const distance = camera.rigCameras.length ? 2.45 : Math.max(2.45, 1.0125 / Math.tan(camera.fov / 2) * 1.1, 1.8 / (Math.tan(camera.fov / 2) * aspect) * 1.1);
      screen.position.copyFrom(camera.position.add(horizontal.scale(distance))); faceTextToward(screen, camera.position);
      surround.position.copyFrom(camera.position); draw(); speak('intro-1');
    },
    update(dt: number, paused: boolean, camera: Camera) {
      if (!active) return false;
      surround.position.copyFrom(camera.position);
      if (paused) return false;
      const before = elapsed; elapsed += Math.max(0, Math.min(dt, .1));
      for (const id of introCues(before, elapsed)) speak(id);
      for (const _ of introKnocks(before, elapsed)) knock();
      if (elapsed - drawTime >= 1 / 24) {draw(); drawTime = elapsed;}
      return introFrame(elapsed).done;
    },
    stop() {active = false; screen.setEnabled(false); surround.setEnabled(false);},
  };
}
