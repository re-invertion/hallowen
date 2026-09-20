import {describe, expect, it} from 'vitest';
import {soundtrackMix} from './soundtrack';

describe('soundtrack mix', () => {
  it('keeps menu silent and gameplay clearly audible', () => {
    expect(soundtrackMix('start').master).toBe(0);
    expect(soundtrackMix('explore').master).toBeGreaterThan(.4);
    expect(soundtrackMix('explore').bed).toBeGreaterThan(.7);
  });

  it('brings in the danger layer during knocks and pursuit', () => {
    const explore = soundtrackMix('explore');
    const knocking = soundtrackMix('knocking');
    const watched = soundtrackMix('threat', false);
    const hunted = soundtrackMix('threat', true);
    expect(knocking.danger).toBeGreaterThan(explore.danger);
    expect(watched.danger).toBeGreaterThan(knocking.danger);
    expect(hunted.danger).toBeGreaterThan(watched.danger);
    expect(hunted.pulse).toBeGreaterThan(watched.pulse);
  });

  it('crossfades to a distinct treatment ward layer', () => {
    const corridor = soundtrackMix('threat', false, 'corridor');
    const ward = soundtrackMix('threat', false, 'treatment');
    expect(corridor.treatment).toBe(0);
    expect(ward.treatment).toBeGreaterThan(.5);
    expect(ward.bed).toBeLessThan(corridor.bed);
  });

  it('backs off after escape', () => {
    expect(soundtrackMix('won').master).toBeLessThan(soundtrackMix('threat', true).master);
  });
});
