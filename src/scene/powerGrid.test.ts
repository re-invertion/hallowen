import {describe, expect, it} from 'vitest';
import {createPowerGrid} from './powerGrid';

describe('power grid', () => {
  it('forces a true blackout and recovers through unstable power', () => {
    const grid = createPowerGrid(() => .5);
    expect(grid.level()).toBe(1);

    grid.forceBlackout(.2);
    expect(grid.level()).toBe(0);

    grid.update(.05);
    expect(grid.level()).toBe(0);

    for (let i = 0; i < 20; i++) grid.update(.05);
    expect(grid.level()).toBe(1);
  });

  it('ignores invalid frame times and clamps tension safely', () => {
    const grid = createPowerGrid(() => .25);
    grid.setTension(5);
    expect(grid.update(NaN)).toBe(1);
    expect(grid.update(-1)).toBe(1);
    grid.setTension(-4);
    expect(grid.level()).toBe(1);
  });
});
