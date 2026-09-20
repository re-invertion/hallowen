import {Scene} from '@babylonjs/core/scene';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {PointLight} from '@babylonjs/core/Lights/pointLight';

type AnimatedPatient = {
  root: TransformNode;
  head: TransformNode;
  baseY: number;
  baseZ: number;
  phase: number;
};

export function createOperatingRooms(scene: Scene) {
  const metal = new StandardMaterial('operating room steel', scene);
  metal.diffuseColor = Color3.FromHexString('#515955');
  metal.specularColor = new Color3(.16, .17, .16);

  const tile = new StandardMaterial('operating room tile backing', scene);
  tile.diffuseColor = Color3.FromHexString('#777d70');
  tile.specularColor = new Color3(.06, .07, .06);

  const mattress = new StandardMaterial('operating room mattress', scene);
  mattress.diffuseColor = Color3.FromHexString('#666a5f');
  mattress.specularColor.set(.02, .02, .02);

  const patientMat = new StandardMaterial('restrained patient cloth', scene);
  patientMat.diffuseColor = Color3.FromHexString('#b6b8aa');
  patientMat.specularColor.set(.02, .02, .02);

  const skin = new StandardMaterial('restrained patient pale skin', scene);
  skin.diffuseColor = Color3.FromHexString('#8f9187');
  skin.specularColor.set(.03, .03, .03);

  const restraint = new StandardMaterial('operating restraint straps', scene);
  restraint.diffuseColor = Color3.FromHexString('#242723');
  restraint.specularColor.set(.05, .05, .05);

  const glass = new StandardMaterial('operating observation glass', scene);
  glass.diffuseColor = Color3.FromHexString('#536966');
  glass.emissiveColor = Color3.FromHexString('#07100e');
  glass.specularColor = new Color3(.65, .72, .68);
  glass.specularPower = 96;
  glass.alpha = .24;
  glass.backFaceCulling = false;

  const dark = new StandardMaterial('operating room darkness', scene);
  dark.diffuseColor = Color3.FromHexString('#090d0b');
  dark.specularColor.set(0, 0, 0);

  const animated: AnimatedPatient[] = [];
  const roomLights: Array<{light: PointLight; base: number; material: StandardMaterial; emissive: Color3}> = [];

  const box = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, {width: w, height: h, depth: d}, scene);
    mesh.position.set(x, y, z);
    mesh.material = mat;
    return mesh;
  };

  function createWindow(side: -1 | 1, z: number, occupied: boolean, phase: number) {
    const xGlass = side * 1.255;
    const xRoom = side * 1.355;

    box('operating window recess', .045, 1.42, 1.58, side * 1.405, 1.48, z, dark);
    box('operating window glass', .025, 1.28, 1.42, xGlass, 1.48, z, glass);
    for (const dz of [-.76, .76]) box('operating window vertical frame', .07, 1.52, .075, side * 1.285, 1.48, z + dz, metal);
    box('operating window top frame', .07, .075, 1.58, side * 1.285, 2.22, z, metal);
    box('operating window lower frame', .07, .075, 1.58, side * 1.285, .74, z, metal);

    // Shallow 3D theatre: the original wall becomes the dark rear surface.
    box('operating room rear tile', .035, 1.34, 1.44, side * 1.445, 1.48, z, tile);
    box('operating bed frame', .16, .16, 1.15, xRoom, .48, z, metal);
    box('operating mattress', .13, .13, 1.02, side * 1.335, .61, z, mattress);
    for (const dz of [-.46, .46]) {
      box('operating bed leg', .08, .46, .08, xRoom, .23, z + dz, metal);
      box('operating bed foot', .15, .025, .15, xRoom, .0125, z + dz, metal);
    }

    const lampMat = new StandardMaterial(`operating lamp material ${side} ${z}`, scene);
    lampMat.diffuseColor = Color3.FromHexString('#a8ad99');
    lampMat.emissiveColor = Color3.FromHexString('#7e836f');
    lampMat.specularColor.set(.12, .12, .1);
    const lamp = MeshBuilder.CreateCylinder('operating theatre lamp', {height: .045, diameter: .38, tessellation: 12}, scene);
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(side * 1.32, 2.02, z - .28);
    lamp.material = lampMat;
    const light = new PointLight('operating theatre light', new Vector3(side * 1.32, 1.8, z), scene);
    light.diffuse = new Color3(.65, .68, .56);
    light.range = 2.1;
    light.intensity = .16;
    roomLights.push({light, base: .16, material: lampMat, emissive: lampMat.emissiveColor.clone()});

    // IV pole and tray silhouettes give the room readable surgical context.
    box('operating tray', .08, .055, .48, side * 1.33, .94, z + .54, metal);
    box('operating tray post', .05, .86, .05, side * 1.33, .46, z + .54, metal);
    box('operating iv pole', .045, 1.35, .045, side * 1.34, .68, z - .56, metal);
    box('operating iv arm', .045, .045, .28, side * 1.34, 1.31, z - .47, metal);

    if (!occupied) return;

    const root = new TransformNode(`restrained patient ${side} ${z}`, scene);
    root.position.set(side * 1.315, .72, z);

    const torso = box('patient torso', .11, .18, .42, 0, 0, 0, patientMat);
    torso.parent = root;
    const pelvis = box('patient pelvis', .11, .16, .22, 0, -.01, .29, patientMat);
    pelvis.parent = root;

    const headRoot = new TransformNode('patient head pivot', scene);
    headRoot.parent = root;
    headRoot.position.set(0, .015, -.34);
    const head = MeshBuilder.CreateSphere('patient featureless head', {diameter: .19, segments: 10}, scene);
    head.scaling.set(.58, .78, .72);
    head.material = skin;
    head.parent = headRoot;

    const armA = box('patient restrained arm a', .065, .07, .35, 0, -.03, -.08, skin);
    armA.rotation.x = .13;
    armA.parent = root;
    const armB = box('patient restrained arm b', .065, .07, .35, 0, -.03, .08, skin);
    armB.rotation.x = -.12;
    armB.parent = root;
    for (const z0 of [.48, .69]) {
      const leg = box('patient restrained leg', .08, .08, .34, 0, -.03, z0, patientMat);
      leg.parent = root;
    }

    // Straps stay anchored to the bed while the body moves underneath them.
    for (const dz of [-.08, .22, .54]) {
      box('patient restraint strap', .19, .035, .095, side * 1.30, .845, z + dz, restraint);
      box('patient restraint buckle', .205, .055, .055, side * 1.292, .86, z + dz, metal);
    }

    animated.push({root, head: headRoot, baseY: root.position.y, baseZ: z, phase});
  }

  // Two occupied theatres plus two additional rooms make the treatment block feel inhabited.
  createWindow(1, 33.2, false, .3);
  createWindow(-1, 37.2, true, 1.1);
  createWindow(1, 41.2, true, 2.7);
  createWindow(-1, 45.2, false, 4.0);

  let time = 0;

  return {
    update(dt: number, power: number) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      time += Math.min(dt, .05);
      const safePower = Math.max(0, Math.min(1, power));
      for (const entry of roomLights) {
        entry.light.intensity = entry.base * safePower;
        entry.material.emissiveColor.copyFrom(entry.emissive.scale(safePower));
      }

      for (const patient of animated) {
        const t = time + patient.phase;
        // Restrained jumping/thrashing: short upward kicks plus constant smaller tremor.
        const kick = Math.pow(Math.max(0, Math.sin(t * 4.9)), 7) * .095;
        const tremor = Math.sin(t * 13.1) * .009 + Math.sin(t * 7.7) * .006;
        patient.root.position.y = patient.baseY + kick + tremor;
        patient.root.position.z = patient.baseZ + Math.sin(t * 8.6) * .018;
        patient.root.rotation.x = Math.sin(t * 6.4) * .075 + Math.sin(t * 15.3) * .025;
        patient.head.rotation.x = Math.sin(t * 10.8 + .8) * .18;
        patient.head.rotation.z = Math.sin(t * 8.9) * .11;
      }
    },
    reset() {
      time = 0;
      for (const patient of animated) {
        patient.root.position.y = patient.baseY;
        patient.root.position.z = patient.baseZ;
        patient.root.rotation.set(0, 0, 0);
        patient.head.rotation.set(0, 0, 0);
      }
      for (const entry of roomLights) {
        entry.light.intensity = entry.base;
        entry.material.emissiveColor.copyFrom(entry.emissive);
      }
    },
  };
}
