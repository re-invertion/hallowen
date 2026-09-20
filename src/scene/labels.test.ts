import {expect, it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine';
import {Scene} from '@babylonjs/core/scene';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {faceTextToward} from './labels';
it('faces the readable front of text toward a viewer on either side and above', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const panel = MeshBuilder.CreatePlane('text', {}, scene);
  for (const target of [new Vector3(0, 0, 3), new Vector3(0, 0, -3), new Vector3(2, 2, 0)]) {
    faceTextToward(panel, target); panel.computeWorldMatrix(true);
    expect(Vector3.Dot(panel.getDirection(new Vector3(0, 0, -1)).normalize(), target.normalizeToNew())).toBeGreaterThan(.999);
  }
  scene.dispose(); engine.dispose();
});
