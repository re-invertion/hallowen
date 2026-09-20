import {Scene} from '@babylonjs/core/scene';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';

type PassageDoorOptions = {
  name: string;
  z: number;
  action: 'door' | 'wardDoor';
  frame: StandardMaterial;
  panel: StandardMaterial;
  inset: StandardMaterial;
  handle: StandardMaterial;
};

export type PassageDoorController = {
  interaction: AbstractMesh;
  blockers: AbstractMesh[];
  update(dt: number, open: boolean): void;
  reset(): void;
};

export function createPassageDoor(scene: Scene, options: PassageDoorOptions): PassageDoorController {
  const {name, z, action, frame, panel, inset, handle} = options;
  const blockers: AbstractMesh[] = [];

  const box = (
    part: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    localZ: number,
    material: StandardMaterial,
  ) => {
    const mesh = MeshBuilder.CreateBox(`${name} ${part}`, {width, height, depth}, scene);
    mesh.position.set(x, y, localZ);
    mesh.material = material;
    return mesh;
  };

  // Real doorway: jambs and lintel remain static while two independent leaves swing open.
  box('left jamb', .16, 2.82, .22, -1.46, 1.41, z, frame);
  box('right jamb', .16, 2.82, .22, 1.46, 1.41, z, frame);
  box('lintel', 3.08, .16, .22, 0, 2.74, z, frame);
  box('threshold', 2.84, .035, .26, 0, .018, z, frame);

  const leftPivot = new TransformNode(`${name} left hinge`, scene);
  leftPivot.position.set(-1.31, 0, z);
  const rightPivot = new TransformNode(`${name} right hinge`, scene);
  rightPivot.position.set(1.31, 0, z);

  const left = box('left leaf', 1.29, 2.58, .095, .645, 1.31, 0, panel);
  const right = box('right leaf', 1.29, 2.58, .095, -.645, 1.31, 0, panel);
  left.parent = leftPivot;
  right.parent = rightPivot;
  left.metadata = {interaction: action};
  right.metadata = {interaction: action};
  blockers.push(left, right);

  // Recessed lower panels, push plates and small wired-glass inspection windows.
  for (const [leaf, sign] of [[left, 1], [right, -1]] as const) {
    const lower = box('lower inset', 1.04, .62, .025, sign * .645, .52, -.061, inset);
    lower.parent = sign > 0 ? leftPivot : rightPivot;
    const push = box('push plate', .16, .42, .025, sign * .18, 1.18, -.065, handle);
    push.parent = leaf;
    push.position.x = sign > 0 ? .18 : -.18;
    push.metadata = {interaction: action};

    const glass = box('wired glass', .56, .46, .028, sign * .645, 1.88, -.066, inset);
    glass.parent = sign > 0 ? leftPivot : rightPivot;
    for (let i = -2; i <= 2; i++) {
      const wire = box('glass wire', .012, .42, .012, sign * .645 + i * .105, 1.88, -.084, handle);
      wire.parent = sign > 0 ? leftPivot : rightPivot;
    }
  }

  for (const pivot of [leftPivot, rightPivot]) for (const y of [.43, 1.28, 2.16]) {
    const hinge = box('hinge plate', .13, .17, .04, pivot === leftPivot ? -1.34 : 1.34, y, z + .07, handle);
    hinge.metadata = {interaction: action};
  }

  let openness = 0;

  function apply() {
    // Swing away from a player walking in +Z, so the doorway visibly clears instead of vanishing.
    leftPivot.rotation.y = -1.34 * openness;
    rightPivot.rotation.y = 1.34 * openness;
  }

  return {
    interaction: left,
    blockers,
    update(dt: number, open: boolean) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      const target = open ? 1 : 0;
      const response = open ? 4.2 : 5.5;
      openness += (target - openness) * (1 - Math.exp(-response * Math.min(dt, .05)));
      if (Math.abs(target - openness) < .002) openness = target;
      apply();
    },
    reset() {
      openness = 0;
      apply();
    },
  };
}
