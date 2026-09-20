import {Scene} from '@babylonjs/core/scene';
import {Ray} from '@babylonjs/core/Culling/ray';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
export function pickInteraction(scene: Scene, ray: Ray, walls: AbstractMesh[], panel: AbstractMesh) {
  return scene.pickWithRay(ray, mesh => mesh.isEnabled() && (panel.isEnabled() ? mesh === panel : Boolean(mesh.metadata?.interaction) || walls.includes(mesh)));
}
