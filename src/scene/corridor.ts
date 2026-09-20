import {Scene} from '@babylonjs/core/scene';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3, Color4} from '@babylonjs/core/Maths/math.color';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {PointLight} from '@babylonjs/core/Lights/pointLight';
import {SpotLight} from '@babylonjs/core/Lights/spotLight';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {faceTextToward} from './labels';
import {agedMaterial} from './materials';
import {createDoctor} from './doctor';

export function createCorridor(scene: Scene) {
  scene.clearColor = new Color4(.025, .035, .028, 1);
  scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = .042; scene.fogColor = new Color3(.025, .035, .028);
  const material = (name: string, color: string, emissive = false) => {
    const m = new StandardMaterial(name, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.set(.06, .06, .06);
    if (emissive) {m.emissiveColor = m.diffuseColor; m.disableLighting = true;}
    return m;
  };
  const concrete = agedMaterial(scene, 'cracked plaster', '#8a8b76', 'plaster'), lower = agedMaterial(scene, 'peeling hospital paint', '#3b5046', 'plaster'), metal = agedMaterial(scene, 'oxidized iron', '#3b433d', 'metal'), floorMat = agedMaterial(scene, 'old tiles', '#666451', 'tile'), clinic = agedMaterial(scene, 'treatment tiles', '#9b9b87', 'tile'), wood = agedMaterial(scene, 'desk wood', '#59472f', 'wood'), gold = material('brass key', '#c8a553'), fuseMat = material('ceramic fuse', '#d8d3b4'), glowing = material('phosphor', '#c4d4a7', true), dark = material('unlit interior', '#080d0b');
  const floorTexture = floorMat.diffuseTexture as DynamicTexture; floorTexture.uScale = 2; floorTexture.vScale = 19;
  const walls: AbstractMesh[] = [];
  function box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat = concrete, blocker = false) {
    const mesh = MeshBuilder.CreateBox(name, {width: w, height: h, depth: d}, scene); mesh.position.set(x, y, z); mesh.material = mat;
    if (blocker) walls.push(mesh); return mesh;
  }
  box('floor', 3.4, .2, 55, 0, -.1, 26.5, floorMat);
  box('treatment floor', 3.15, .012, 17, 0, .012, 39.5, clinic);
  box('ceiling', 3.4, .2, 55, 0, 3.1, 26.5, concrete);
  for (const side of [-1, 1]) {
    box('wall', .2, 3.1, 55, side * 1.6, 1.55, 26.5, concrete, true);
    box('lower wall', .025, 1.3, 55, side * 1.485, .65, 26.5, lower);
    box('trim', .04, .06, 55, side * 1.47, 1.3, 26.5, metal);
    for (let z = 2; z < 19; z += 4) {
      box('sealed cell', .07, 2.3, 1.05, side * 1.445, 1.15, z, metal);
      box('cell slot', .025, .15, .32, side * 1.4, 1.65, z, dark);
      for (let b = 0; b < 3; b++) box('slot bar', .04, .17, .018, side * 1.38, 1.65, z - .1 + b * .1, metal);
      for (const offset of [-.58, .58]) box('door frame', .14, 2.42, .065, side * 1.41, 1.21, z + offset, metal);
      box('door lintel', .14, .08, 1.2, side * 1.41, 2.38, z, metal);
      box('cell handle', .09, .04, .18, side * 1.37, 1.05, z + .32, gold);
    }
    box('utility pipe', .07, .07, 31, side * 1.32, 2.7, 15, metal);
  }
  box('back wall', 3.4, 3.1, .2, 0, 1.55, 0, concrete, true);
  const door = box('exit door', 3, 3, .1, 0, 1.5, 19, metal, true);
  const wardDoor = box('treatment ward door', 3, 3, .1, 0, 1.5, 47.5, metal, true);
  box('final bulkhead', 3.4, 3.1, .2, 0, 1.55, 54, metal, true);
  for (const z of [21.2, 25.2, 29.2]) {
    box('service arch left', .18, 2.9, .18, -1.43, 1.45, z, metal, true);
    box('service arch right', .18, 2.9, .18, 1.43, 1.45, z, metal, true);
    box('service arch top', 2.7, .16, .18, 0, 2.86, z, metal);
  }
  for (const side of [-1, 1]) {
    box('service conduit', .08, .08, 9.4, side * 1.18, 2.42, 25.3, metal);
    for (const z of [22.6, 24.8, 27, 29.2]) box('junction box', .16, .26, .22, side * 1.36, 2.05, z, dark);
  }

  // Stage 3: treatment ward. The playable lane stays narrow for Quest comfort,
  // but the materials, props and lighting deliberately break the corridor rhythm.
  for (const side of [-1, 1]) {
    box('treatment tile wall', .035, 2.35, 16.2, side * 1.46, 1.17, 39.25, clinic);
    box('treatment rail', .07, .08, 15.8, side * 1.39, 2.18, 39.3, metal);
    for (const z of [33.2, 37.2, 41.2, 45.2]) {
      box('observation frame', .06, 1.05, 1.15, side * 1.42, 1.55, z, metal);
      box('observation glass', .025, .88, .95, side * 1.385, 1.55, z, dark);
    }
  }
  for (const z of [34.5, 40.5, 45]) {
    box('curtain rail', 2.45, .045, .06, 0, 2.62, z, metal);
    box('hanging curtain left', .03, 1.55, .78, -1.18, 1.78, z, lower);
    box('hanging curtain right', .03, 1.25, .7, 1.18, 1.62, z + .22, lower);
  }
  for (const [x, z] of [[-1.05, 35.5], [1.02, 42.3]] as const) {
    box('treatment chair seat', .48, .12, .72, x, .58, z, metal);
    const back = box('treatment chair back', .48, .8, .1, x, 1.02, z + .28, metal); back.rotation.x = -.22;
    box('treatment chair base', .12, .55, .12, x, .27, z, metal);
  }
  box('instrument trolley top', .58, .06, .74, -1.0, .93, 38.7, metal);
  for (const x of [-1.22, -.78]) for (const z of [38.42, 38.98]) box('trolley leg', .05, .85, .05, x, .46, z, metal);
  const fuse = MeshBuilder.CreateCylinder('emergency fuse', {height: .16, diameter: .07, tessellation: 12}, scene);
  fuse.rotation.z = Math.PI / 2; fuse.position.set(-1.0, 1.02, 38.68); fuse.material = fuseMat; fuse.metadata = {interaction: 'fuse'};
  const fuseTarget = MeshBuilder.CreateSphere('fuse interaction target', {diameter: .22, segments: 6}, scene);
  fuseTarget.parent = fuse; fuseTarget.visibility = 0; fuseTarget.metadata = fuse.metadata;
  box('ward door inset', 2.6, 2.5, .06, 0, 0, -.07, lower).parent = wardDoor;
  const wardLatch = box('ward door handle', .28, .055, .07, .85, -.4, -.14, gold); wardLatch.parent = wardDoor;
  wardDoor.metadata = {interaction: 'wardDoor'};
  box('desk top', .85, .08, 1.4, -1.075, .85, 10, wood, true);
  for (const z of [9.4, 10.6]) box('desk leg', .1, .82, .1, -.75, .41, z, metal);
  for (const z of [9.5, 10.1]) {box('drawer', .72, .24, .5, -1.08, .68, z, wood); box('drawer pull', .025, .035, .17, -.707, .68, z, gold);}
  const paper = material('aged documents', '#c2b99a');
  const dossier = box('patient dossier', .32, .02, .36, -1.11, .904, 9.6, paper); dossier.rotation.y = .15;
  for (let i = 0; i < 6; i++) box('document redaction', .22 - i * .015, .002, .008, -1.11, .917, 9.48 + i * .04, metal);
  box('exit door inset', 2.6, 2.5, .06, 0, 0, -.07, lower).parent = door;
  const latch = box('exit handle', .28, .055, .07, .85, -.4, -.14, gold); latch.parent = door;
  const key = MeshBuilder.CreateTorus('key', {diameter: .1, thickness: .025, tessellation: 12}, scene);
  key.position.set(-.85, .94, 10); key.material = gold;
  const shaft = box('key shaft', .025, .02, .15, 0, 0, .09, gold); shaft.parent = key;
  const tooth = box('key tooth', .06, .02, .025, .025, 0, .14, gold); tooth.parent = key;
  key.metadata = {interaction: 'key'}; shaft.metadata = key.metadata; tooth.metadata = key.metadata;
  const keyTarget = MeshBuilder.CreateSphere('key interaction target', {diameter: .24, segments: 6}, scene);
  keyTarget.parent = key; keyTarget.position.z = .04; keyTarget.visibility = 0; keyTarget.metadata = key.metadata;
  door.metadata = {interaction: 'door'};
  const sign = (name: string, text: string, x: number, y: number, z: number, width: number, height: number) => {
    const plane = MeshBuilder.CreatePlane(name, {width, height, sideOrientation: Mesh.DOUBLESIDE}, scene);
    plane.position.set(x, y, z);
    const texture = new DynamicTexture(name, {width: 1024, height: 256}, scene, false);
    texture.drawText(text, null, 165, 'bold 62px monospace', '#c4cbb1', '#1b2821', true);
    const mat = material(name, '#ffffff'); mat.diffuseTexture = texture; mat.emissiveColor.set(.18, .18, .14); plane.material = mat;
    return plane;
  };
  const exitSign = sign('exit label', 'PRZEJŚCIE / ZAMKNIĘTE', 0, 2.2, 18.88, 2.2, .45); exitSign.parent = door; exitSign.position.set(0, .7, -.12);
  sign('warning', 'NIE ODWRACAJ SIĘ', 0, 2.5, .13, 2.4, .45).rotation.y = Math.PI;
  const serviceSign = sign('service zone', 'STREFA TECHNICZNA / -1', 0, 2.45, 20.35, 2.45, .34); faceTextToward(serviceSign, new Vector3(0, 2.45, 19));
  const treatmentSign = sign('treatment zone', 'BLOK ZABIEGOWY / 0', 0, 2.45, 31.35, 2.45, .34); faceTextToward(treatmentSign, new Vector3(0, 2.45, 30));
  const powerSign = sign('power warning', 'ZASILANIE AWARYJNE', 0, 2.25, 47.36, 2.2, .3); powerSign.parent = wardDoor; powerSign.position.set(0, .72, -.12);
  const finalSign = sign('final warning', 'WYJŚCIE / SCHODY', 0, 2.45, 53.78, 2.1, .34); faceTextToward(finalSign, new Vector3(0, 2.45, 52));
  for (const side of [-1, 1]) for (let z = 2; z < 19; z += 4) {
    const number = sign(`cell number ${side} ${z}`, `SALA ${String(Math.floor(z / 2) + (side > 0 ? 1 : 0)).padStart(2, '0')}`, side * 1.39, 2.07, z, .62, .16);
    faceTextToward(number, new Vector3(0, 2.07, z));
  }
  const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene); ambient.intensity = .24; ambient.groundColor = new Color3(.12, .17, .12);
  for (const z of [3, 10, 17, 23.5, 28.5, 33.5, 38.5, 43.5, 51]) {
    box('ceiling fixture', .7, .06, .2, 0, 2.94, z, glowing);
    const light = new PointLight('ceiling light', new Vector3(0, 2.7, z), scene); light.diffuse = new Color3(.65, .75, .48); light.intensity = .35; light.range = 5;
  }
  const flashlight = new SpotLight('flashlight', new Vector3(0, 1.5, 4), new Vector3(0, 0, 1), .9, 3, scene);
  flashlight.diffuse = new Color3(.9, .94, .78); flashlight.intensity = 3.5; flashlight.range = 16;
  flashlight.renderPriority = 10;
  const {root: enemy, parts: enemyParts} = createDoctor(scene);
  // In-headset end screen is world-space, so head tracking stays live.
  const panel = MeshBuilder.CreatePlane('result panel', {width: 1.5, height: .8, sideOrientation: Mesh.DOUBLESIDE}, scene);
  const panelTexture = new DynamicTexture('result text', {width: 1024, height: 512}, scene, false);
  panelTexture.drawText('', 0, 0, '40px monospace', '#d0ddbb', '#101b14', true);
  const panelMat = material('result material', '#ffffff', true); panelMat.diffuseTexture = panelTexture; panelMat.emissiveTexture = panelTexture; panel.material = panelMat; panel.metadata = {interaction: 'restart'}; panel.setEnabled(false);
  // End UI is an overlay in 3D: walls cannot hide it or block its pointer hit.
  panel.renderingGroupId = 2;
  function showPanel(title: string, position: Vector3, forward: Vector3) {
    panelTexture.drawText('', 0, 0, '40px monospace', '#d0ddbb', '#101b14', true);
    const ctx = panelTexture.getContext() as CanvasRenderingContext2D; ctx.textAlign = 'center'; ctx.fillStyle = '#b9c798'; ctx.font = '24px monospace'; ctx.fillText('PACJENT 47', 512, 110); ctx.font = '48px Georgia'; ctx.fillText(title, 512, 230); ctx.font = '28px monospace'; ctx.fillText('WSKAŻ I NACIŚNIJ SPUST', 512, 350); ctx.fillText('ABY PONOWIĆ PRÓBĘ', 512, 400); panelTexture.update();
    const f = forward.lengthSquared() > .0001 ? forward.normalizeToNew() : Vector3.Forward(); panel.position.copyFrom(position.add(f.scale(1.3))); faceTextToward(panel, position); panel.setEnabled(true);
  }
  return {enemy, enemyParts, key, door, fuse, wardDoor, walls, flashlight, panel, showPanel, ambient, dispose: () => scene.dispose()};
}
