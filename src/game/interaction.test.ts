import {expect, it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine';
import {Scene} from '@babylonjs/core/scene';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Ray} from '@babylonjs/core/Culling/ray';
import {pickInteraction} from './interaction';
it('lets a restart overlay be selected across a wall, but blocks gameplay through it', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const wall = MeshBuilder.CreateBox('wall', {size: 1}, scene); wall.position.z = 1;
  const panel = MeshBuilder.CreateBox('panel', {size: 1}, scene); panel.position.z = 2.5; panel.metadata = {interaction: 'restart'};
  const key = MeshBuilder.CreateBox('key', {size: .2}, scene); key.position.z = 2; key.metadata = {interaction: 'key'};
  for (const m of [wall, panel, key]) m.computeWorldMatrix(true);
  const ray = new Ray(Vector3.Zero(), Vector3.Forward(), 3);
  expect(pickInteraction(scene, ray, [wall], panel)?.pickedMesh).toBe(panel);
  panel.setEnabled(false);
  expect(pickInteraction(scene, ray, [wall], panel)?.pickedMesh).toBe(wall);
  scene.dispose(); engine.dispose();
});
