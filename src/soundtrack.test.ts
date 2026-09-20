import {describe, expect, it} from 'vitest';
import {soundtrackMood} from './soundtrack';

describe('soundtrack mood', () => {
  it('keeps the menu silent and gives gameplay a quiet bed', () => {
    expect(soundtrackMood('start').master).toBe(0);
    expect(soundtrackMood('explore').master).toBeGreaterThan(0);
    expect(soundtrackMood('explore').master).toBeLessThan(.3);
  });

  it('raises tension during knocks and an unseen pursuit', () => {
    const explore = soundtrackMood('explore');
    const knocking = soundtrackMood('knocking');
    const watched = soundtrackMood('threat', false);
    const hunted = soundtrackMood('threat', true);
    expect(knocking.dissonance).toBeGreaterThan(explore.dissonance);
    expect(watched.pulse).toBeGreaterThan(explore.pulse);
    expect(hunted.pulse).toBeGreaterThan(watched.pulse);
    expect(hunted.master).toBeGreaterThan(watched.master);
  });

  it('backs off after escape', () => {
    expect(soundtrackMood('won').master).toBeLessThan(soundtrackMood('threat', true).master);
  });
});
