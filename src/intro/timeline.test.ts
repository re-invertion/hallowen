import {expect, it} from 'vitest';
import {introFrame, INTRO_DURATION, introCues, introKnocks} from './timeline';
it('advances four archive chapters and ends, without replaying cues during pause', () => {
  expect(introFrame(0).chapter).toBe(0);
  expect(introFrame(10).chapter).toBe(1);
  expect(introFrame(20).chapter).toBe(2);
  expect(introFrame(30).chapter).toBe(3);
  expect(introFrame(INTRO_DURATION).done).toBe(true);
  expect(introCues(10, 10)).toEqual([]);
  expect(introCues(-.01, .01)).toEqual(['intro-1']);
  expect(introCues(8, 20)).toEqual(['intro-2', 'intro-3']);
  expect(introKnocks(36, 38)).toHaveLength(3);
  expect(introKnocks(37, 37)).toHaveLength(0);
});
