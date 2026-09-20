import {expect, it} from 'vitest';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine';
import {Scene} from '@babylonjs/core/scene';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {createEndingFade, endingOpacity} from './ending';
it('renders a short blackout inside the scene for either desktop or XR cameras', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const camera = new FreeCamera('head', new Vector3(1.2, 1.65, 8), scene);
  const fade = createEndingFade(scene);
  fade.update(camera, 0); expect(fade.mesh.isEnabled()).toBe(true);
  expect(fade.mesh.parent).toBe(camera); expect(fade.mesh.renderingGroupId).toBe(3);
  expect(endingOpacity(.1)).toBe(1);
  fade.update(camera, 1); expect(fade.mesh.isEnabled()).toBe(false);
  scene.dispose(); engine.dispose();
});
