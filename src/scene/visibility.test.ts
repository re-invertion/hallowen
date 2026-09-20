import {afterEach, describe, expect, it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine';
import {Scene} from '@babylonjs/core/scene';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder';
import {isObserved} from './visibility';
const engine = new NullEngine();
let scene: Scene;
afterEach(() => scene?.dispose());
describe('observation', () => {
  const setup = () => {
    scene = new Scene(engine);
    const camera = new FreeCamera('eye', new Vector3(0, 1.6, 0), scene);
    camera.setTarget(new Vector3(0, 1.6, 10)); camera.minZ = .05; camera.maxZ = 50;
    const body = MeshBuilder.CreateBox('body', {width: .6, height: 2, depth: .4}, scene);
    body.position.set(0, 1, 5); body.computeWorldMatrix(true);
    return {camera, body};
  };
  it('sees a person in front, not behind', () => {
    const {camera, body} = setup();
    expect(isObserved([camera], [body], [])).toBe(true);
    body.position.z = -5; body.computeWorldMatrix(true);
    expect(isObserved([camera], [body], [])).toBe(false);
  });
  it('does not see through an opaque wall', () => {
    const {camera, body} = setup();
    const wall = MeshBuilder.CreateBox('wall', {width: 5, height: 4, depth: .2}, scene);
    wall.position.set(0, 2, 2); wall.computeWorldMatrix(true);
    expect(isObserved([camera], [body], [wall])).toBe(false);
  });
  it('freezes when one eye can see part of a body', () => {
    const {camera, body} = setup();
    const otherEye = new FreeCamera('other', new Vector3(0, 1.6, 0), scene);
    otherEye.setTarget(new Vector3(0, 1.6, -10));
    body.position.x = 5 * Math.tan(camera.fov / 2) * engine.getAspectRatio(camera);
    body.computeWorldMatrix(true);
    expect(isObserved([otherEye, camera], [body], [])).toBe(true);
  });
});
