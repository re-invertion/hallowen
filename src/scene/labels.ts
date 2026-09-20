import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
/** Babylon planes display text on their -Z front; lookAt aims +Z. */
export function faceTextToward(panel: TransformNode, viewer: Vector3) {
  panel.lookAt(viewer);
  panel.rotate(Vector3.Up(), Math.PI);
}
