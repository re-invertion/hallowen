import {Scene} from '@babylonjs/core/scene';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {Vector3, Quaternion} from '@babylonjs/core/Maths/math.vector';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {agedMaterial} from './materials';

export function createDoctor(scene: Scene) {
  const root = new TransformNode('doctor', scene);
  const parts: AbstractMesh[] = [];

  const coat = agedMaterial(scene, 'doctor charcoal coat', '#454842', 'cloth');
  const undercoat = agedMaterial(scene, 'doctor inner vest', '#252a27', 'cloth');
  const leather = agedMaterial(scene, 'doctor worn leather', '#171b19', 'cloth');
  const metal = agedMaterial(scene, 'doctor oxidized steel', '#545852', 'metal');

  const face = new StandardMaterial('featureless blurred face', scene);
  face.diffuseColor = Color3.FromHexString('#7c7d77');
  face.specularColor.set(.025, .025, .025);
  face.specularPower = 8;

  const haze = new StandardMaterial('face blur veil', scene);
  haze.diffuseColor = Color3.FromHexString('#545853');
  haze.emissiveColor = Color3.FromHexString('#151a18');
  haze.specularColor.set(0, 0, 0);
  haze.alpha = .28;
  haze.backFaceCulling = false;

  const stain = new StandardMaterial('doctor dried stains', scene);
  stain.diffuseColor = Color3.FromHexString('#4a211d');
  stain.specularColor.set(.015, .01, .01);

  const fluid = new StandardMaterial('doctor reagent glow', scene);
  fluid.diffuseColor = Color3.FromHexString('#2d6b45');
  fluid.emissiveColor = Color3.FromHexString('#3d9b5a');
  fluid.specularColor.set(.08, .1, .08);

  const addPart = <T extends AbstractMesh>(mesh: T, silhouette = false) => {
    mesh.parent = root;
    if (silhouette) parts.push(mesh);
    return mesh;
  };

  const box = (name: string, size: Vector3, pos: Vector3, mat: StandardMaterial, silhouette = false) => {
    const m = MeshBuilder.CreateBox(name, {width: size.x, height: size.y, depth: size.z}, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    return addPart(m, silhouette);
  };

  const sphere = (name: string, pos: Vector3, scale: Vector3, mat: StandardMaterial, silhouette = false) => {
    const m = MeshBuilder.CreateSphere(name, {diameter: 1, segments: 12}, scene);
    m.position.copyFrom(pos);
    m.scaling.copyFrom(scale);
    m.material = mat;
    return addPart(m, silhouette);
  };

  const cylinder = (name: string, pos: Vector3, height: number, diameter: number, mat: StandardMaterial, silhouette = false) => {
    const m = MeshBuilder.CreateCylinder(name, {height, diameter, tessellation: 10}, scene);
    m.position.copyFrom(pos);
    m.material = mat;
    return addPart(m, silhouette);
  };

  const limb = (name: string, a: Vector3, b: Vector3, top: number, bottom: number, mat: StandardMaterial, silhouette = false) => {
    const delta = b.subtract(a);
    const length = delta.length();
    const m = MeshBuilder.CreateCylinder(name, {height: length, diameterTop: top, diameterBottom: bottom, tessellation: 10}, scene);
    m.position.copyFrom(a.add(b).scale(.5));
    const dir = delta.normalize();
    const axis = Vector3.Cross(Vector3.Up(), dir);
    const angle = Math.acos(Math.max(-1, Math.min(1, dir.y)));
    m.rotationQuaternion = Quaternion.RotationAxis(axis.lengthSquared() > .00001 ? axis.normalize() : Vector3.Right(), angle);
    m.material = mat;
    return addPart(m, silhouette);
  };

  // Broad, heavy silhouette inspired by an old institutional surgeon's coat.
  const torso = MeshBuilder.CreateCylinder('doctor armored coat torso', {height: 1.08, diameterTop: .55, diameterBottom: .72, tessellation: 16}, scene);
  torso.position.set(0, 1.38, 0);
  torso.scaling.z = .62;
  torso.material = coat;
  addPart(torso, true);

  sphere('doctor broad shoulders', new Vector3(0, 1.86, 0), new Vector3(.72, .29, .36), coat, true);
  box('doctor inner vest', new Vector3(.36, .73, .08), new Vector3(0, 1.42, .218), undercoat);

  const lowerLeft = box('doctor coat tail left', new Vector3(.32, .92, .12), new Vector3(-.19, .67, .05), coat, true);
  lowerLeft.rotation.z = -.025;
  lowerLeft.rotation.x = .035;
  const lowerRight = box('doctor coat tail right', new Vector3(.32, .92, .12), new Vector3(.19, .67, .05), coat, true);
  lowerRight.rotation.z = .025;
  lowerRight.rotation.x = .035;

  // High collar and lapels.
  const collarLeft = box('doctor raised collar left', new Vector3(.22, .31, .1), new Vector3(-.18, 1.96, -.02), coat);
  collarLeft.rotation.z = -.28;
  collarLeft.rotation.x = -.16;
  const collarRight = box('doctor raised collar right', new Vector3(.22, .31, .1), new Vector3(.18, 1.96, -.02), coat);
  collarRight.rotation.z = .28;
  collarRight.rotation.x = -.16;
  const lapelLeft = box('doctor lapel left', new Vector3(.12, .47, .045), new Vector3(-.105, 1.67, .225), coat);
  lapelLeft.rotation.z = -.24;
  const lapelRight = box('doctor lapel right', new Vector3(.12, .47, .045), new Vector3(.105, 1.67, .225), coat);
  lapelRight.rotation.z = .24;

  // Completely featureless head. The translucent flattened shells create a smeared,
  // unfocused front surface without eyes, nose or mouth geometry.
  cylinder('doctor neck wrap', new Vector3(0, 2.02, 0), .19, .21, leather, true);
  const head = sphere('doctor featureless head', new Vector3(0, 2.27, .015), new Vector3(.30, .43, .30), face, true);
  head.rotation.x = .055;
  const smearA = sphere('doctor face blur shell a', new Vector3(0, 2.27, .285), new Vector3(.245, .34, .024), haze);
  smearA.rotation.z = .08;
  const smearB = sphere('doctor face blur shell b', new Vector3(.015, 2.27, .298), new Vector3(.215, .31, .018), haze);
  smearB.rotation.z = -.11;

  // Head harness and old examination lamp.
  const headBand = MeshBuilder.CreateTorus('doctor head leather band', {diameter: .57, thickness: .045, tessellation: 14}, scene);
  headBand.position.set(0, 2.37, .015);
  headBand.rotation.x = Math.PI / 2;
  headBand.material = leather;
  addPart(headBand);
  cylinder('doctor lamp mount', new Vector3(0, 2.58, .15), .13, .09, metal).rotation.x = Math.PI / 2;
  const lamp = cylinder('doctor examination lamp', new Vector3(0, 2.62, .22), .07, .22, metal);
  lamp.rotation.x = Math.PI / 2;
  const lens = cylinder('doctor lamp glass', new Vector3(0, 2.62, .263), .012, .145, face);
  lens.rotation.x = Math.PI / 2;

  // Arms, gauntlets and gloves.
  for (const side of [-1, 1]) {
    const shoulder = sphere(`doctor sleeve shoulder ${side}`, new Vector3(side * .38, 1.83, 0), new Vector3(.25, .27, .27), coat, true);
    shoulder.rotation.z = side * .09;
    limb(`doctor upper sleeve ${side}`, new Vector3(side * .39, 1.78, 0), new Vector3(side * .46, 1.31, -.015), .20, .25, coat, true);
    sphere(`doctor elbow ${side}`, new Vector3(side * .46, 1.29, -.015), new Vector3(.17, .18, .17), coat, true);
    limb(`doctor forearm ${side}`, new Vector3(side * .46, 1.25, -.01), new Vector3(side * .50, .85, .06), .135, .18, leather, true);
    box(`doctor gauntlet cuff ${side}`, new Vector3(.19, .16, .18), new Vector3(side * .50, .95, .055), leather);
    for (let band = 0; band < 2; band++) {
      box(`doctor gauntlet strap ${side} ${band}`, new Vector3(.21, .045, .195), new Vector3(side * .50, .93 - band * .1, .055), metal);
    }
    sphere(`doctor glove ${side}`, new Vector3(side * .50, .73, .07), new Vector3(.13, .20, .085), leather, true);
    for (let finger = 0; finger < 3; finger++) {
      const fx = side * .50 + (finger - 1) * .032;
      limb(`doctor glove finger ${side} ${finger}`, new Vector3(fx, .66, .075), new Vector3(fx, .51 - finger * .012, .095), .022, .028, leather);
    }
    limb(`doctor glove thumb ${side}`, new Vector3(side * .445, .70, .075), new Vector3(side * .41, .58, .12), .026, .038, leather);
  }

  // Harness, belts and buckles.
  box('doctor vertical harness', new Vector3(.075, .72, .035), new Vector3(0, 1.48, .265), leather);
  for (const y of [1.66, 1.38, 1.1]) {
    box(`doctor chest belt ${y}`, new Vector3(.56, .075, .04), new Vector3(0, y, .255), leather);
    box(`doctor chest buckle ${y}`, new Vector3(.105, .09, .025), new Vector3(.02, y, .284), metal);
  }
  box('doctor waist belt', new Vector3(.71, .105, .055), new Vector3(0, .94, .24), leather);
  box('doctor waist buckle', new Vector3(.15, .14, .035), new Vector3(0, .94, .278), metal);

  const shoulderStrapLeft = box('doctor shoulder harness left', new Vector3(.075, .66, .035), new Vector3(-.17, 1.64, .255), leather);
  shoulderStrapLeft.rotation.z = -.23;
  const shoulderStrapRight = box('doctor shoulder harness right', new Vector3(.075, .66, .035), new Vector3(.17, 1.64, .255), leather);
  shoulderStrapRight.rotation.z = .23;

  // Medical reagent canister, one restrained green accent from the reference.
  box('doctor vial bracket', new Vector3(.11, .39, .08), new Vector3(.34, 1.5, .20), leather);
  const vialOuter = cylinder('doctor reagent vial casing', new Vector3(.34, 1.52, .255), .33, .105, metal);
  vialOuter.rotation.z = 0;
  const vialGlow = cylinder('doctor reagent vial fluid', new Vector3(.34, 1.52, .257), .23, .062, fluid);
  vialGlow.rotation.z = 0;
  box('doctor vial top clamp', new Vector3(.13, .05, .08), new Vector3(.34, 1.69, .255), metal);
  box('doctor vial lower clamp', new Vector3(.13, .05, .08), new Vector3(.34, 1.35, .255), metal);

  // Instrument pouch with simplified scissors / clamps.
  box('doctor instrument pouch', new Vector3(.25, .31, .08), new Vector3(-.28, 1.02, .23), leather);
  for (let i = 0; i < 3; i++) {
    const x = -.35 + i * .07;
    limb(`doctor instrument stem ${i}`, new Vector3(x, 1.12, .29), new Vector3(x, 1.37 - i * .025, .29), .018, .018, metal);
    const loop = MeshBuilder.CreateTorus(`doctor instrument loop ${i}`, {diameter: .07, thickness: .012, tessellation: 8}, scene);
    loop.position.set(x, 1.39 - i * .025, .29);
    loop.material = metal;
    addPart(loop);
  }

  // Dried, restrained stains and repair plates instead of a high-resolution texture.
  const stainA = box('doctor coat stain left', new Vector3(.17, .38, .012), new Vector3(-.18, 1.31, .286), stain);
  stainA.rotation.z = -.12;
  const stainB = box('doctor coat stain lower', new Vector3(.13, .29, .012), new Vector3(.16, .69, .13), stain);
  stainB.rotation.z = .08;
  box('doctor coat repair plate', new Vector3(.16, .11, .018), new Vector3(.23, 1.17, .293), metal);

  // Legs and strapped boots.
  for (const side of [-1, 1]) {
    limb(`doctor trouser leg ${side}`, new Vector3(side * .17, .7, 0), new Vector3(side * .16, .20, 0), .18, .15, undercoat, true);
    box(`doctor boot shaft ${side}`, new Vector3(.22, .43, .24), new Vector3(side * .16, .25, .015), leather, true);
    sphere(`doctor boot ${side}`, new Vector3(side * .16, .075, .09), new Vector3(.20, .14, .35), leather, true);
    for (const y of [.16, .32]) {
      box(`doctor boot strap ${side} ${y}`, new Vector3(.24, .045, .255), new Vector3(side * .16, y, .02), metal);
    }
  }

  root.position.z = 2;
  root.setEnabled(false);
  return {root, parts};
}
