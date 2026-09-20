import {describe, expect, it} from 'vitest';
import {initialState, startGame, takeKey, openDoor, updateGame, dueKnocks, resumeOrStart} from './state';

describe('experience progression', () => {
  it('catches a player in either side lane without crossing the desk', () => {
    for (const [playerX, playerZ] of [[-1.2, 8], [1.2, 8], [1.2, 10]]) {
      let s = {...startGame(), phase: 'threat' as const};
      for (let i = 0; i < 700; i++) s = updateGame(s, {dt: .05, observed: false, playerX, playerZ}) as typeof s;
      expect(s.phase).toBe('lost');
    }
  });
  it('resumes a paused attempt without removing inventory or enemy progress', () => {
    const s = {...takeKey(startGame()), phase: 'threat' as const, paused: true, enemyZ: 6};
    expect(resumeOrStart(s)).toEqual({...s, paused: false});
    expect(resumeOrStart(initialState())).toEqual(startGame());
  });
  it('requires a key and resets the complete attempt', () => {
    expect(openDoor(startGame()).doorOpen).toBe(false);
    expect(openDoor(takeKey(startGame())).doorOpen).toBe(true);
    expect(initialState()).toMatchObject({phase: 'start', hasKey: false, doorOpen: false, enemyZ: 2});
  });
  it('stops an observed, paused or finished enemy', () => {
    const s = {...startGame(), phase: 'threat' as const};
    expect(updateGame(s, {dt: .02, observed: true, playerZ: 10}).enemyZ).toBe(2);
    expect(updateGame(s, {dt: .02, observed: false, playerZ: 10}).enemyZ).toBeGreaterThan(2);
    expect(updateGame({...s, paused: true}, {dt: 30, observed: false, playerZ: 10})).toEqual({...s, paused: true});
    expect(updateGame({...s, phase: 'won'}, {dt: 1, observed: false, playerZ: 10}).enemyZ).toBe(2);
  });
  it('moves the same distance at 72 and 90 Hz', () => {
    const simulate = (hz: number) => {
      let s = {...startGame(), phase: 'threat' as const};
      for (let n = 0; n < hz; n++) s = updateGame(s, {dt: 1 / hz, observed: false, playerZ: 10}) as typeof s;
      return s.enemyZ;
    };
    expect(simulate(72)).toBeCloseTo(simulate(90), 8);
  });
  it('does not leap after a stall or accept invalid time', () => {
    const s = {...startGame(), phase: 'threat' as const};
    expect(updateGame(s, {dt: 30, observed: false, playerZ: 10}).enemyZ).toBeLessThan(2.04);
    for (const dt of [NaN, Infinity, -1]) expect(updateGame(s, {dt, observed: false, playerZ: 10})).toEqual(s);
  });
  it('triggers once, finishes knocks then can catch or escape', () => {
    let s = updateGame(startGame(), {dt: .01, observed: true, playerZ: 8});
    expect(s.phase).toBe('knocking');
    for (let i = 0; i < 50; i++) s = updateGame(s, {dt: .05, observed: true, playerZ: 8});
    expect(s.phase).toBe('threat');
    expect(updateGame(s, {dt: .01, observed: true, playerZ: 2.2}).phase).toBe('lost');
    expect(updateGame(openDoor(takeKey(s)), {dt: .01, observed: true, playerZ: 19.6}).phase).toBe('won');
    expect(updateGame(s, {dt: .01, observed: true, playerZ: 19.6}).phase).not.toBe('won');
  });
  it('schedules three knocks once and can repeat after reset', () => {
    expect(dueKnocks(-Number.EPSILON, 2)).toEqual([0, .8, 1.6]);
    expect(dueKnocks(2, 2)).toEqual([]);
    expect(dueKnocks(.7, 1)).toEqual([.8]);
    expect(dueKnocks(-Number.EPSILON, 0)).toEqual([0]);
  });
});
