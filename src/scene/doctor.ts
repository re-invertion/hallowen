import {Scene} from '@babylonjs/core/scene';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {Vector3, Quaternion} from '@babylonjs/core/Maths/math.vector';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
import {agedMaterial} from './materials';

export function createDoctor(scene: Scene) {
  const root = new TransformNode('doctor', scene), parts: AbstractMesh[] = [];
  const coat = agedMaterial(scene, 'stained linen coat', '#aca997', 'cloth');
  const skin = new StandardMaterial('smooth ashen skin', scene); skin.diffuseColor = Color3.FromHexString('#b4b0a0'); skin.specularColor.set(.08, .08, .07);
  const dark = new StandardMaterial('doctor leather', scene); dark.diffuseColor = Color3.FromHexString('#1c211c'); dark.specularColor.set(.14, .14, .12);
  const seam = new StandardMaterial('coat seam', scene); seam.diffuseColor = Color3.FromHexString('#686956'); seam.specularColor.set(0, 0, 0);
  const sphere = (name: string, pos: Vector3, scale: Vector3, mat: StandardMaterial, parent: TransformNode = root) => {
    const m = MeshBuilder.CreateSphere(name, {diameter: 1, segments: 16}, scene); m.position.copyFrom(pos); m.scaling.copyFrom(scale); m.material = mat; m.parent = parent; parts.push(m); return m;
  };
  const limb = (name: string, a: Vector3, b: Vector3, top: number, bottom: number, mat: StandardMaterial, parent: TransformNode = root) => {
    const delta = b.subtract(a), length = delta.length();
    const m = MeshBuilder.CreateCylinder(name, {height: length, diameterTop: top, diameterBottom: bottom, tessellation: 12}, scene);
    m.position.copyFrom(a.add(b).scale(.5));
    const dir = delta.normalize(), axis = Vector3.Cross(Vector3.Up(), dir), angle = Math.acos(Math.max(-1, Math.min(1, dir.y)));
    m.rotationQuaternion = Quaternion.RotationAxis(axis.lengthSquared() > .00001 ? axis.normalize() : Vector3.Right(), angle);
    m.material = mat; m.parent = parent; parts.push(m); return m;
  };
  // Continuous tapered silhouette, with a long split-looking lower coat.
  const torso = MeshBuilder.CreateCylinder('coat body', {height: 1.18, diameterTop: .49, diameterBottom: .68, tessellation: 24}, scene);
  torso.position.y = 1.22; torso.scaling.z = .59; torso.material = coat; torso.parent = root; parts.push(torso);
  sphere('shoulders', new Vector3(0, 1.79, 0), new Vector3(.69, .32, .35), coat);
  limb('neck', new Vector3(0, 1.84, 0), new Vector3(0, 2.04, 0), .13, .17, skin);
  const head = sphere('smooth head', new Vector3(0, 2.23, .025), new Vector3(.31, .46, .32), skin);
  head.rotation.x = .075;
  for (const side of [-1, 1]) {
    limb('trouser leg', new Vector3(side * .16, .13, 0), new Vector3(side * .15, .76, 0), .16, .13, dark);
    sphere('shoe', new Vector3(side * .16, .08, .07), new Vector3(.19, .15, .36), dark);
    const arm = new TransformNode(`arm ${side}`, scene); arm.parent = root; arm.position.set(side * .3, 1.8, 0);
    sphere('rounded sleeve shoulder', new Vector3(0, -.025, 0), new Vector3(.23, .25, .25), coat, arm);
    limb('upper sleeve', new Vector3(0, 0, 0), new Vector3(side * .065, -.49, -.025), .17, .22, coat, arm);
    sphere('elbow', new Vector3(side * .065, -.49, -.025), new Vector3(.16, .19, .17), coat, arm);
    limb('long forearm', new Vector3(side * .065, -.49, -.025), new Vector3(side * .13, -1.05, .035), .11, .16, coat, arm);
    sphere('hand', new Vector3(side * .13, -1.14, .035), new Vector3(.115, .22, .065), skin, arm);
    for (let i = 0; i < 4; i++) {
      const x = side * .13 + (i - 1.5) * .025, len = .12 + (1 - Math.abs(i - 1.5) / 2) * .055;
      limb('finger', new Vector3(x, -1.21, .035), new Vector3(x, -1.21 - len, .06), .017, .025, skin, arm);
    }
    limb('thumb', new Vector3(side * .075, -1.1, .04), new Vector3(side * .05, -1.22, .085), .02, .035, skin, arm);
    limb('lapel', new Vector3(side * .045, 1.49, .173), new Vector3(side * .15, 1.83, .12), .07, .035, coat);
  }
  limb('front seam', new Vector3(0, .65, .202), new Vector3(0, 1.52, .15), .012, .012, seam);
  for (let i = 0; i < 5; i++) sphere('button', new Vector3(.028, 1.56 - i * .155, .17 + i * .009), new Vector3(.027, .027, .013), dark);
  const pocket = MeshBuilder.CreateBox('breast pocket', {width: .14, height: .16, depth: .012}, scene); pocket.position.set(-.13, 1.53, .16); pocket.material = coat; pocket.parent = root; parts.push(pocket);
  const badge = MeshBuilder.CreateBox('blank identification badge', {width: .1, height: .05, depth: .012}, scene); badge.position.set(-.13, 1.61, .18); badge.material = seam; badge.parent = root;
  root.position.z = 2; root.setEnabled(false);
  return {root, parts};
}
