import {Scene} from '@babylonjs/core/scene';
import {Camera} from '@babylonjs/core/Cameras/camera';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {Mesh} from '@babylonjs/core/Meshes/mesh';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';
export const endingOpacity = (elapsed: number) => elapsed < 0 || elapsed >= .65 ? 0 : elapsed < .2 ? 1 : 1 - (elapsed - .2) / .45;
export function createEndingFade(scene: Scene) {
  const mesh = MeshBuilder.CreatePlane('immersive blackout', {size: 10, sideOrientation: Mesh.DOUBLESIDE}, scene);
  const mat = new StandardMaterial('blackout material', scene); mat.disableLighting = true; mat.diffuseColor = Color3.Black(); mat.emissiveColor = Color3.Black(); mat.backFaceCulling = false;
  mesh.material = mat; mesh.isPickable = false; mesh.renderingGroupId = 3; mesh.alwaysSelectAsActiveMesh = true; mesh.setEnabled(false);
  return {mesh, update(camera: Camera, elapsed: number) {mat.alpha = endingOpacity(elapsed); mesh.setEnabled(mat.alpha > 0); mesh.parent = camera; mesh.position.set(0, 0, .25);}};
}
