import {Vector3} from '@babylonjs/core/Maths/math.vector';

export const KEY_CELL_BOUNDS = {minX: -3.95, maxX: -1.05, minZ: 4.7, maxZ: 7.3};
export const BLOCKERS = [
  {minX: -1.5, maxX: -.65, minZ: 9.3, maxZ: 10.7},
  {minX: -3.9, maxX: -2.42, minZ: 4.82, maxZ: 5.72},
  {minX: -3.58, maxX: -2.92, minZ: 5.92, maxZ: 6.62},
];

export function isInKeyCell(position: {x: number; z: number}) {
  return position.x < -1.5 && position.x >= KEY_CELL_BOUNDS.minX && position.x <= KEY_CELL_BOUNDS.maxX && position.z >= KEY_CELL_BOUNDS.minZ && position.z <= KEY_CELL_BOUNDS.maxZ;
}

export function moveHorizontal(position: Vector3, forward: Vector3, axes: {x: number; y: number}, speed: number, dt: number, doorOpen: boolean, wardDoorOpen = false): Vector3 {
  const result = position.clone();
  if (!Number.isFinite(dt) || dt <= 0) return result;
  let x = Math.abs(axes.x) > .15 ? axes.x : 0, y = Math.abs(axes.y) > .15 ? axes.y : 0;
  const length = Math.hypot(x, y); if (length > 1) {x /= length; y /= length;}
  const f = new Vector3(forward.x, 0, forward.z);
  if (f.lengthSquared() < .0001) f.set(0, 0, 1); else f.normalize();
  const delta = new Vector3(f.z * x - f.x * y, 0, -f.x * x - f.z * y).scale(speed * Math.min(dt, .05));
  const steps = Math.max(1, Math.ceil(delta.length() / .04)); delta.scaleInPlace(1 / steps);
  const maxZ = !doorOpen ? 18.73 : !wardDoorOpen ? 47.25 : 53.2;
  const valid = (px: number, pz: number) => {
    const inCorridor = px >= -1.28 && px <= 1.28 && pz >= .3 && pz <= maxZ;
    const inCell = px >= KEY_CELL_BOUNDS.minX && px <= KEY_CELL_BOUNDS.maxX && pz >= KEY_CELL_BOUNDS.minZ && pz <= KEY_CELL_BOUNDS.maxZ;
    if (!inCorridor && !inCell) return false;
    return !BLOCKERS.some(b => px > b.minX - .22 && px < b.maxX + .22 && pz > b.minZ - .22 && pz < b.maxZ + .22);
  };
  for (let i = 0; i < steps; i++) {
    if (valid(result.x + delta.x, result.z)) result.x += delta.x;
    if (valid(result.x, result.z + delta.z)) result.z += delta.z;
  }
  return result;
}

export function rotationTranslation(offset: Vector3, yaw: number): Vector3 {
  return new Vector3(offset.x - offset.x * Math.cos(yaw) - offset.z * Math.sin(yaw), 0, offset.z + offset.x * Math.sin(yaw) - offset.z * Math.cos(yaw));
}
