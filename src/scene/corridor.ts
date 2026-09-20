import {Scene} from '@babylonjs/core/scene';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3, Color4} from '@babylonjs/core/Maths/math.color';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {PointLight} from '@babylonjs/core/Lights/pointLight';
import {SpotLight} from '@babylonjs/core/Lights/spotLight';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {faceTextToward} from './labels';
import {agedMaterial} from './materials';
import {createDoctor} from './doctor';
import {createFlickerLight, type FlickerController, type FlickerProfile} from './flicker';

export function createCorridor(scene: Scene) {
  scene.clearColor = new Color4(.025, .035, .028, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = .042;
  scene.fogColor = new Color3(.025, .035, .028);

  const material = (name: string, color: string, emissive = false) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor.set(.06, .06, .06);
    if (emissive) m.emissiveColor = m.diffuseColor.clone();
    return m;
  };

  const concrete = agedMaterial(scene, 'cracked plaster', '#8a8b76', 'plaster');
  const lower = agedMaterial(scene, 'peeling hospital paint', '#3b5046', 'plaster');
  const metal = agedMaterial(scene, 'oxidized iron', '#3b433d', 'metal');
  const floorMat = agedMaterial(scene, 'old tiles', '#666451', 'tile');
  const clinic = agedMaterial(scene, 'treatment tiles', '#9b9b87', 'tile');
  const wood = agedMaterial(scene, 'desk wood', '#59472f', 'wood');
  const gold = material('brass', '#b99752');
  const fuseMat = material('ceramic fuse', '#d8d3b4');
  const dark = material('unlit interior', '#080d0b');
  const mattress = material('stained mattress', '#77765f');
  const paper = material('aged documents', '#c2b99a');
  const strap = material('restraint leather', '#30271f');
  const grime = material('wall grime', '#2f382f');
  const sparkMat = material('electrical spark', '#e8d19a', true);
  const floorTexture = floorMat.diffuseTexture as DynamicTexture;
  floorTexture.uScale = 2;
  floorTexture.vScale = 19;

  const walls: AbstractMesh[] = [];
  const flickers: FlickerController[] = [];

  function box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat = concrete, blocker = false) {
    const mesh = MeshBuilder.CreateBox(name, {width: w, height: h, depth: d}, scene);
    mesh.position.set(x, y, z);
    mesh.material = mat;
    if (blocker) walls.push(mesh);
    return mesh;
  }

  box('floor', 3.4, .2, 55, 0, -.1, 26.5, floorMat);
  box('treatment floor', 3.15, .012, 17, 0, .012, 39.5, clinic);
  box('ceiling', 3.4, .2, 55, 0, 3.1, 26.5, concrete);

  for (const side of [-1, 1]) {
    if (side === -1) {
      box('left wall before open cell', .2, 3.1, 5.3, -1.6, 1.55, 2.65, concrete, true);
      box('left wall after open cell', .2, 3.1, 47.35, -1.6, 1.55, 30.325, concrete, true);
      box('left lower before open cell', .025, 1.3, 5.3, -1.485, .65, 2.65, lower);
      box('left lower after open cell', .025, 1.3, 47.35, -1.485, .65, 30.325, lower);
      box('left trim before open cell', .04, .06, 5.3, -1.47, 1.3, 2.65, metal);
      box('left trim after open cell', .04, .06, 47.35, -1.47, 1.3, 30.325, metal);
    } else {
      box('wall', .2, 3.1, 55, side * 1.6, 1.55, 26.5, concrete, true);
      box('lower wall', .025, 1.3, 55, side * 1.485, .65, 26.5, lower);
      box('trim', .04, .06, 55, side * 1.47, 1.3, 26.5, metal);
    }

    for (let z = 2; z < 19; z += 4) {
      if (side === -1 && z === 6) {
        for (const offset of [-.67, .67]) box('open cell door frame', .16, 2.5, .08, -1.43, 1.25, z + offset, metal);
        box('open cell lintel', .16, .1, 1.42, -1.43, 2.46, z, metal);
        continue;
      }

      const spec: {color: string; profile: FlickerProfile} | null =
        side === 1 && z === 2 ? {color: '#9eb9a0', profile: 'stable'} :
        side === 1 && z === 10 ? {color: '#b5a16d', profile: 'light'} :
        side === -1 && z === 14 ? {color: '#78644b', profile: 'dying'} :
        side === 1 && z === 18 ? {color: '#79524b', profile: 'heavy'} : null;
      const slotMat = spec ? material(`cell leak ${side} ${z}`, spec.color, true) : dark;

      box('sealed cell', .07, 2.3, 1.05, side * 1.445, 1.15, z, metal);
      box('cell slot', .025, .17, .34, side * 1.4, 1.67, z, slotMat);
      for (let b = 0; b < 3; b++) box('slot bar', .04, .19, .018, side * 1.38, 1.67, z - .11 + b * .11, metal);
      for (const offset of [-.58, .58]) box('door frame', .14, 2.42, .065, side * 1.41, 1.21, z + offset, metal);
      box('door lintel', .14, .08, 1.2, side * 1.41, 2.38, z, metal);
      box('cell handle', .09, .04, .18, side * 1.37, 1.05, z + .32, gold);
      for (const y of [.56, 1.8]) box('door hinge', .1, .16, .08, side * 1.37, y, z - .46, metal);
      box('door vent', .025, .32, .45, side * 1.39, .5, z, dark);
      for (let s = 0; s < 4; s++) box('door vent slat', .035, .028, .39, side * 1.365, .4 + s * .07, z, metal);

      if (spec) {
        box('cell light floor gap', .018, .035, .58, side * 1.375, .08, z, slotMat);
        flickers.push(createFlickerLight(null, slotMat, spec.profile, 1));
      }
    }

    box('utility pipe', .07, .07, 31, side * 1.32, 2.7, 15, metal);
    for (const [y, z] of [[2.22, 4.2], [1.92, 8.2], [2.38, 12.4], [2.1, 16.2]] as const) {
      box('surface cable', .025, .025, 2.1, side * 1.355, y, z, dark);
    }
    for (const [y, z] of [[2.35, 5], [1.8, 11.6], [2.2, 16.7]] as const) {
      const patch = box('broken plaster patch', .028, .26, .52, side * 1.365, y, z, grime);
      patch.rotation.x = .05;
    }
  }

  // Only seven tiny brackets: plain meshes are more robust here than Babylon instances.
  // This avoids the optional InstancedMesh runtime registration path being tree-shaken
  // out of the production bundle on Quest.
  for (const side of [-1, 1]) for (const z of [3.2, 7.2, 11.2, 15.2]) {
    if (side === -1 && z === 7.2) continue;
    box('pipe bracket', .07, .06, .035, side * 1.32, 2.69, z, metal);
  }

  // Playable side cell: SALA 03, left side around z=6.
  box('key cell floor', 2.55, .18, 3, -2.87, -.09, 6, floorMat);
  box('key cell ceiling', 2.55, .18, 3, -2.87, 3.05, 6, concrete);
  box('key cell outer wall', .18, 3.1, 3, -4.12, 1.55, 6, concrete, true);
  box('key cell north wall', 2.55, 3.1, .18, -2.87, 1.55, 4.5, concrete, true);
  box('key cell south wall', 2.55, 3.1, .18, -2.87, 1.55, 7.5, concrete, true);
  box('key cell lower outer', .025, 1.25, 2.7, -4.015, .63, 6, lower);
  box('key cell stain', .018, .92, 1.05, -4.0, 1.1, 6.65, grime);

  const openDoor = box('open key cell door', .08, 2.28, 1.08, -1.82, 1.14, 5.72, metal);
  openDoor.rotation.y = -.68;
  box('open key cell handle', .08, .05, .18, -1.61, 1.05, 5.94, gold);
  for (const y of [.55, 1.78]) box('open door hinge', .09, .15, .08, -1.54, y, 5.37, metal);

  box('cell bed frame', 1.42, .12, .75, -3.16, .48, 5.28, metal);
  box('cell mattress', 1.34, .14, .68, -3.16, .59, 5.28, mattress);
  for (const x of [-3.78, -2.54]) for (const z of [5.02, 5.54]) box('bed leg', .06, .48, .06, x, .24, z, metal);
  box('bed head rail', .06, .72, .72, -3.83, .82, 5.28, metal);
  box('bed foot rail', .06, .55, .72, -2.49, .73, 5.28, metal);
  for (const z of [5.12, 5.43]) box('restraint strap', 1.2, .025, .07, -3.16, .675, z, strap);

  box('key table top', .62, .07, .62, -3.25, .93, 6.26, wood);
  for (const x of [-3.5, -3.0]) for (const z of [6.01, 6.51]) box('key table leg', .055, .88, .055, x, .46, z, metal);
  box('cell chair seat', .48, .1, .48, -2.28, .52, 6.6, wood);
  box('cell chair back', .48, .62, .08, -2.28, .83, 6.8, wood);
  for (const x of [-2.47, -2.09]) for (const z of [6.43, 6.76]) box('chair leg', .045, .5, .045, x, .25, z, metal);

  const bowl = MeshBuilder.CreateCylinder('metal bowl', {height: .06, diameter: .27, tessellation: 12}, scene);
  bowl.position.set(-2.3, .6, 6.57);
  bowl.material = metal;
  const papers = box('cell documents', .28, .015, .36, -3.13, .975, 6.18, paper);
  papers.rotation.y = -.16;
  for (let i = 0; i < 4; i++) box('cell document mark', .18 - i * .018, .004, .012, -3.12, .988, 6.08 + i * .055, dark);

  box('key cell vent', .025, .52, .72, -4.015, 2.05, 5.28, dark);
  for (let i = 0; i < 5; i++) box('key cell vent slat', .03, .035, .65, -3.992, 1.9 + i * .075, 5.28, metal);
  box('key cell vertical pipe', .07, 2.15, .07, -3.88, 1.25, 7.12, metal);
  box('key cell old cable', .025, .025, 1.65, -4.0, 2.48, 6.55, dark);
  for (const y of [.95, 1.25, 1.55]) box('old equipment mount', .03, .09, .14, -3.995, y, 5.88, metal);

  const key = MeshBuilder.CreateTorus('key', {diameter: .12, thickness: .026, tessellation: 12}, scene);
  key.position.set(-3.25, 1.015, 6.3);
  key.rotation.x = Math.PI / 2;
  key.material = gold;
  const shaft = box('key shaft', .025, .02, .16, 0, 0, .1, gold); shaft.parent = key;
  const tooth = box('key tooth', .065, .02, .028, .026, 0, .16, gold); tooth.parent = key;
  key.metadata = {interaction: 'key'};
  shaft.metadata = key.metadata;
  tooth.metadata = key.metadata;
  const keyTarget = MeshBuilder.CreateSphere('key interaction target', {diameter: .25, segments: 6}, scene);
  keyTarget.parent = key;
  keyTarget.position.z = .05;
  keyTarget.visibility = 0;
  keyTarget.metadata = key.metadata;

  const keyCellLampMat = material('key cell lamp', '#b7b99d', true);
  box('key cell ceiling fixture', .58, .06, .18, -2.82, 2.9, 6.05, keyCellLampMat);
  const keyCellPoint = new PointLight('key cell light', new Vector3(-2.72, 2.55, 6.08), scene);
  keyCellPoint.diffuse = new Color3(.68, .75, .58);
  keyCellPoint.intensity = .42;
  keyCellPoint.range = 4.2;
  const keyCellLight = createFlickerLight(keyCellPoint, keyCellLampMat, 'light', .42);
  flickers.push(keyCellLight);

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
    for (const z of [22.6, 24.8, 27, 29.2]) {
      box('junction box', .16, .26, .22, side * 1.36, 2.05, z, dark);
      box('junction latch', .03, .04, .08, side * 1.27, 2.05, z + .05, metal);
    }
  }

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
    const back = box('treatment chair back', .48, .8, .1, x, 1.02, z + .28, metal);
    back.rotation.x = -.22;
    box('treatment chair base', .12, .55, .12, x, .27, z, metal);
  }
  box('instrument trolley top', .58, .06, .74, -1.0, .93, 38.7, metal);
  for (const x of [-1.22, -.78]) for (const z of [38.42, 38.98]) box('trolley leg', .05, .85, .05, x, .46, z, metal);
  const fuse = MeshBuilder.CreateCylinder('emergency fuse', {height: .16, diameter: .07, tessellation: 12}, scene);
  fuse.rotation.z = Math.PI / 2;
  fuse.position.set(-1.0, 1.02, 38.68);
  fuse.material = fuseMat;
  fuse.metadata = {interaction: 'fuse'};
  const fuseTarget = MeshBuilder.CreateSphere('fuse interaction target', {diameter: .22, segments: 6}, scene);
  fuseTarget.parent = fuse;
  fuseTarget.visibility = 0;
  fuseTarget.metadata = fuse.metadata;
  box('ward door inset', 2.6, 2.5, .06, 0, 0, -.07, lower).parent = wardDoor;
  const wardLatch = box('ward door handle', .28, .055, .07, .85, -.4, -.14, gold); wardLatch.parent = wardDoor;
  wardDoor.metadata = {interaction: 'wardDoor'};

  box('desk top', .85, .08, 1.4, -1.075, .85, 10, wood, true);
  for (const z of [9.4, 10.6]) box('desk leg', .1, .82, .1, -.75, .41, z, metal);
  for (const z of [9.5, 10.1]) {
    box('drawer', .72, .24, .5, -1.08, .68, z, wood);
    box('drawer pull', .025, .035, .17, -.707, .68, z, gold);
  }
  const dossier = box('patient dossier', .32, .02, .36, -1.11, .904, 9.6, paper);
  dossier.rotation.y = .15;
  for (let i = 0; i < 6; i++) box('document redaction', .22 - i * .015, .002, .008, -1.11, .917, 9.48 + i * .04, metal);

  box('exit door inset', 2.6, 2.5, .06, 0, 0, -.07, lower).parent = door;
  const latch = box('exit handle', .28, .055, .07, .85, -.4, -.14, gold); latch.parent = door;
  door.metadata = {interaction: 'door'};

  const sign = (name: string, text: string, x: number, y: number, z: number, width: number, height: number) => {
    const plane = MeshBuilder.CreatePlane(name, {width, height, sideOrientation: Mesh.DOUBLESIDE}, scene);
    plane.position.set(x, y, z);
    const texture = new DynamicTexture(name, {width: 1024, height: 256}, scene, false);
    texture.drawText(text, null, 165, 'bold 62px monospace', '#c4cbb1', '#1b2821', true);
    const mat = material(name, '#ffffff');
    mat.diffuseTexture = texture;
    mat.emissiveColor.set(.18, .18, .14);
    plane.material = mat;
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

  const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = .22;
  ambient.groundColor = new Color3(.12, .17, .12);

  const corridorLights: Array<[number, FlickerProfile]> = [
    [3, 'stable'], [10, 'light'], [17, 'heavy'], [23.5, 'light'], [28.5, 'dying'],
    [33.5, 'stable'], [38.5, 'light'], [43.5, 'heavy'], [51, 'stable'],
  ];
  for (const [z, profile] of corridorLights) {
    const fixtureMat = material(`ceiling lamp ${z}`, z >= 31 ? '#b8b69c' : '#b7bea0', true);
    box('ceiling fixture', .7, .06, .2, 0, 2.94, z, fixtureMat);
    box('ceiling ballast', .42, .035, .08, 0, 2.89, z, metal);
    const light = new PointLight(`ceiling light ${z}`, new Vector3(0, 2.7, z), scene);
    light.diffuse = z >= 31 ? new Color3(.72, .7, .57) : new Color3(.65, .75, .48);
    light.range = 5;
    flickers.push(createFlickerLight(light, fixtureMat, profile, z === 28.5 ? .24 : .35));
  }

  for (const z of [5.8, 13.8, 21.8, 37.8, 45.8]) {
    box('ceiling service strip', 2.7, .035, .08, 0, 2.91, z, metal);
  }

  const spark = MeshBuilder.CreateSphere('junction spark', {diameter: .035, segments: 4}, scene);
  spark.position.set(1.28, 2.08, 24.8);
  spark.material = sparkMat;
  spark.setEnabled(false);
  let sparkCooldown = 6 + Math.random() * 8;
  let sparkLife = 0;

  const flashlight = new SpotLight('flashlight', new Vector3(0, 1.5, 4), new Vector3(0, 0, 1), .9, 3, scene);
  flashlight.diffuse = new Color3(.9, .94, .78);
  flashlight.intensity = 3.5;
  flashlight.range = 16;
  flashlight.renderPriority = 10;

  const {root: enemy, parts: enemyParts} = createDoctor(scene);

  const panel = MeshBuilder.CreatePlane('result panel', {width: 1.5, height: .8, sideOrientation: Mesh.DOUBLESIDE}, scene);
  const panelTexture = new DynamicTexture('result text', {width: 1024, height: 512}, scene, false);
  panelTexture.drawText('', 0, 0, '40px monospace', '#d0ddbb', '#101b14', true);
  const panelMat = material('result material', '#ffffff', true);
  panelMat.diffuseTexture = panelTexture;
  panelMat.emissiveTexture = panelTexture;
  panel.material = panelMat;
  panel.metadata = {interaction: 'restart'};
  panel.setEnabled(false);
  panel.renderingGroupId = 2;

  function showPanel(title: string, position: Vector3, forward: Vector3) {
    panelTexture.drawText('', 0, 0, '40px monospace', '#d0ddbb', '#101b14', true);
    const ctx = panelTexture.getContext() as CanvasRenderingContext2D;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b9c798';
    ctx.font = '24px monospace';
    ctx.fillText('PACJENT 47', 512, 110);
    ctx.font = '48px Georgia';
    ctx.fillText(title, 512, 230);
    ctx.font = '28px monospace';
    ctx.fillText('WSKAŻ I NACIŚNIJ SPUST', 512, 350);
    ctx.fillText('ABY PONOWIĆ PRÓBĘ', 512, 400);
    panelTexture.update();
    const f = forward.lengthSquared() > .0001 ? forward.normalizeToNew() : Vector3.Forward();
    panel.position.copyFrom(position.add(f.scale(1.3)));
    faceTextToward(panel, position);
    panel.setEnabled(true);
  }

  function updateAtmosphere(dt: number) {
    for (const flicker of flickers) flicker.update(dt);
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (sparkLife > 0) {
      sparkLife -= dt;
      spark.setEnabled(true);
      if (sparkLife <= 0) spark.setEnabled(false);
      return;
    }
    sparkCooldown -= dt;
    if (sparkCooldown <= 0) {
      sparkLife = .045;
      sparkCooldown = 9 + Math.random() * 16;
    }
  }

  function resetAtmosphere() {
    for (const flicker of flickers) flicker.reset();
    keyCellLight.setAgitated(false);
    spark.setEnabled(false);
    sparkLife = 0;
    sparkCooldown = 6 + Math.random() * 8;
  }

  return {
    enemy, enemyParts, key, door, fuse, wardDoor, walls, flashlight, panel, showPanel, ambient,
    keyCellLight, updateAtmosphere, resetAtmosphere,
    dispose() {for (const flicker of flickers) flicker.dispose();},
  };
}
