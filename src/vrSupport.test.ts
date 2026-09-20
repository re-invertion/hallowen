import {describe, expect, it, vi} from 'vitest';
import {probeVrAvailability} from './vrSupport';

describe('probeVrAvailability', () => {
  it('reports support and rejection without throwing', async () => {
    await expect(probeVrAvailability(async () => true, 20)).resolves.toBe('supported');
    await expect(probeVrAvailability(async () => false, 20)).resolves.toBe('unsupported');
    await expect(probeVrAvailability(async () => {throw new Error('blocked');}, 20)).resolves.toBe('unknown');
  });

  it('times out instead of leaving startup pending forever', async () => {
    vi.useFakeTimers();
    const pending = probeVrAvailability(() => new Promise<boolean>(() => {}), 1400);
    await vi.advanceTimersByTimeAsync(1400);
    await expect(pending).resolves.toBe('unknown');
    vi.useRealTimers();
  });
});
