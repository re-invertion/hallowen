export type VrAvailability = 'supported' | 'unsupported' | 'unknown';

export function probeVrAvailability(
  probe: () => Promise<boolean>,
  timeoutMs = 1400,
): Promise<VrAvailability> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: VrAvailability) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish('unknown'), timeoutMs);
    void probe().then(
      supported => finish(supported ? 'supported' : 'unsupported'),
      () => finish('unknown'),
    );
  });
}
