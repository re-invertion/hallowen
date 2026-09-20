import {Camera} from '@babylonjs/core/Cameras/camera';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {Frustum} from '@babylonjs/core/Maths/math.frustum';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Ray} from '@babylonjs/core/Culling/ray';

/** Either eye seeing any unobstructed body sample counts as observation. */
export function isObserved(cameras: Camera[], parts: AbstractMesh[], walls: AbstractMesh[]): boolean {
  for (const camera of cameras) {
    const planes = Frustum.GetPlanes(camera.getViewMatrix().multiply(camera.getProjectionMatrix()));
    const origin = camera.globalPosition;
    for (const part of parts) {
      part.computeWorldMatrix(true);
      const box = part.getBoundingInfo().boundingBox;
      if (!planes.every(p => box.vectorsWorld.some(v => p.dotCoordinate(v) >= -.12))) continue;
      for (const sample of [box.centerWorld, ...box.vectorsWorld]) {
        if (!planes.every(p => p.dotCoordinate(sample) >= -.12)) continue;
        const direction = sample.subtract(origin), distance = direction.length();
        if (distance < .01) return true;
        const ray = new Ray(origin, direction.scale(1 / distance), distance);
        if (!walls.some(wall => {
          if (!wall.isEnabled()) return false;
          const hit = ray.intersectsMesh(wall, false);
          return hit.hit && hit.distance < distance - .05;
        })) return true;
      }
    }
  }
  return false;
}
