import {describe, it, expect} from 'vitest';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {moveHorizontal, rotationTranslation, BLOCKERS} from './locomotion';

describe('locomotion', () => {
  const p = new Vector3(0, 1.65, 4);
  it('preserves height and remains finite with a vertical gaze', () => {
    const n = moveHorizontal(p, new Vector3(0, 1, 0), {x: 0, y: -1}, 1.5, .02, false);
    expect(n.y).toBe(p.y); expect(Number.isFinite(n.z)).toBe(true);
  });
  it('normalizes diagonal input and ignores stick drift', () => {
    const f = new Vector3(0, 0, 1);
    const a = moveHorizontal(p, f, {x: 1, y: -1}, 1.5, .02, false);
    expect(Vector3.Distance(a, p)).toBeCloseTo(.03);
    expect(moveHorizontal(p, f, {x: .1, y: .1}, 1.5, .02, false)).toEqual(p);
  });
  it('blocks walls, desk and closed exit, allows open exit', () => {
    const f = new Vector3(0, 0, 1);
    expect(moveHorizontal(new Vector3(1.27, 1.65, 5), f, {x: 1, y: 0}, 1.5, .05, false).x).toBeLessThanOrEqual(1.28);
    expect(moveHorizontal(new Vector3(0, 1.65, 18.7), f, {x: 0, y: -1}, 1.5, .05, false).z).toBeLessThan(18.8);
    expect(moveHorizontal(new Vector3(0, 1.65, 18.7), f, {x: 0, y: -1}, 1.5, .05, true).z).toBeGreaterThan(18.7);
    expect(BLOCKERS.length).toBeGreaterThan(0);
    const n = moveHorizontal(new Vector3(-.39, 1.65, 10), f, {x: -1, y: 0}, 1.5, .05, false);
    expect(n.x).toBeGreaterThan(-.43);
  });
  it('keeps the head fixed when rotating an offset rig', () => {
    const offset = new Vector3(.6, 0, .3), yaw = Math.PI / 2;
    const correction = rotationTranslation(offset, yaw);
    const rotated = new Vector3(offset.x * Math.cos(yaw) + offset.z * Math.sin(yaw), 0, -offset.x * Math.sin(yaw) + offset.z * Math.cos(yaw));
    expect(rotated.add(correction).subtract(offset).length()).toBeLessThan(1e-8);
  });
});
