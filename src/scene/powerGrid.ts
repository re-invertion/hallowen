export type PowerGridController = {
  update(dt: number): number;
  setTension(value: number): void;
  forceBlackout(seconds?: number): void;
  reset(): void;
  level(): number;
};

type Pulse = {level: number; duration: number};

export function createPowerGrid(random: () => number = Math.random): PowerGridController {
  let level = 1;
  let tension = 0;
  let idleTimer = 4 + random() * 5;
  let pattern: Pulse[] = [];
  let pulseIndex = -1;
  let pulseTimer = 0;

  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  function nextIdle() {
    const min = 4.8 - tension * 2.8;
    const max = 11.5 - tension * 4.5;
    idleTimer = Math.max(1.6, min + random() * Math.max(.8, max - min));
  }

  function begin(next: Pulse[]) {
    pattern = next;
    pulseIndex = 0;
    level = next[0]?.level ?? 1;
    pulseTimer = next[0]?.duration ?? 0;
  }

  function randomFailure() {
    const roll = random();
    if (roll < .22 + tension * .18) {
      begin([
        {level: .02, duration: .18 + random() * .28},
        {level: .12, duration: .045},
        {level: 0, duration: .07 + random() * .08},
        {level: .48, duration: .055},
        {level: .04, duration: .05},
        {level: 1, duration: .18},
      ]);
      return;
    }
    if (roll < .62) {
      begin([
        {level: .15, duration: .045},
        {level: 1, duration: .075},
        {level: .03, duration: .065},
        {level: .55, duration: .05},
        {level: 1, duration: .14},
      ]);
      return;
    }
    begin([
      {level: .58, duration: .16 + random() * .18},
      {level: .28, duration: .07},
      {level: .82, duration: .09},
      {level: .08, duration: .05},
      {level: 1, duration: .2},
    ]);
  }

  function advance(step: number) {
    if (pulseIndex < 0) return;
    pulseTimer -= step;
    while (pulseIndex >= 0 && pulseTimer <= 0) {
      pulseIndex++;
      if (pulseIndex >= pattern.length) {
        pulseIndex = -1;
        pattern = [];
        level = 1;
        nextIdle();
        return;
      }
      level = pattern[pulseIndex]!.level;
      pulseTimer += pattern[pulseIndex]!.duration;
    }
  }

  function reset() {
    level = 1;
    tension = 0;
    pattern = [];
    pulseIndex = -1;
    pulseTimer = 0;
    idleTimer = 4 + random() * 5;
  }

  return {
    update(dt: number) {
      if (!Number.isFinite(dt) || dt <= 0) return level;
      const step = Math.min(dt, .05);
      if (pulseIndex >= 0) {
        advance(step);
        return level;
      }
      idleTimer -= step;
      if (idleTimer <= 0) randomFailure();
      return level;
    },
    setTension(value: number) {
      tension = clamp(value);
    },
    forceBlackout(seconds = .55) {
      const hold = Math.max(.12, Math.min(1.1, seconds));
      begin([
        {level: 0, duration: hold},
        {level: .06, duration: .055},
        {level: .72, duration: .045},
        {level: 0, duration: .07},
        {level: .38, duration: .055},
        {level: 1, duration: .22},
      ]);
    },
    reset,
    level: () => level,
  };
}
