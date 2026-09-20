import {PointLight} from '@babylonjs/core/Lights/pointLight';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial';
import {Color3} from '@babylonjs/core/Maths/math.color';

export type FlickerProfile = 'stable' | 'light' | 'heavy' | 'dying';

type ProfileConfig = {
  minInterval: number;
  maxInterval: number;
  dropoutChance: number;
  minLevel: number;
  maxLevel: number;
  response: number;
};

const PROFILES: Record<FlickerProfile, ProfileConfig> = {
  stable: {minInterval: 1.4, maxInterval: 4.2, dropoutChance: 0, minLevel: .94, maxLevel: 1.02, response: 6},
  light: {minInterval: .45, maxInterval: 2.3, dropoutChance: .045, minLevel: .68, maxLevel: 1.04, response: 10},
  heavy: {minInterval: .18, maxInterval: .9, dropoutChance: .12, minLevel: .24, maxLevel: 1.03, response: 16},
  dying: {minInterval: .24, maxInterval: 1.55, dropoutChance: .24, minLevel: .08, maxLevel: .82, response: 13},
};

export type FlickerController = {
  update(dt: number): void;
  setAgitated(active: boolean): void;
  forceOutage(seconds: number): void;
  setMasterLevel(value: number): void;
  reset(): void;
  dispose(): void;
};

export function createFlickerLight(
  light: PointLight | null,
  fixture: StandardMaterial,
  profile: FlickerProfile,
  baseIntensity: number,
): FlickerController {
  const config = PROFILES[profile];
  const baseEmissive = fixture.emissiveColor.clone();
  let timer = 0;
  let level = 1;
  let target = 1;
  let forcedOutage = 0;
  let agitated = false;
  let masterLevel = 1;

  const random = (min: number, max: number) => min + Math.random() * (max - min);

  function schedule() {
    const agitation = agitated ? .58 : 1;
    const dropoutChance = Math.min(.38, config.dropoutChance + (agitated ? .1 : 0));
    if (Math.random() < dropoutChance) {
      target = 0;
      timer = random(.2, profile === 'dying' ? 1.5 : .95);
      return;
    }
    target = random(config.minLevel, config.maxLevel);
    timer = Math.max(.16, random(config.minInterval, config.maxInterval) * agitation);
  }

  function apply(value: number) {
    const local = Math.max(0, Math.min(1.08, value));
    const safe = local * Math.max(0, Math.min(1, masterLevel));
    if (light) light.intensity = baseIntensity * safe;
    fixture.emissiveColor.copyFrom(baseEmissive.scale(safe));
  }

  function reset() {
    timer = random(.25, 1.2);
    level = 1;
    target = 1;
    forcedOutage = 0;
    agitated = false;
    masterLevel = 1;
    apply(1);
  }

  reset();

  return {
    update(dt: number) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(dt, .05);
      if (forcedOutage > 0) {
        forcedOutage = Math.max(0, forcedOutage - step);
        level = 0;
        apply(0);
        if (forcedOutage === 0) {
          target = .72;
          timer = .22;
        }
        return;
      }
      timer -= step;
      if (timer <= 0) schedule();
      const response = target === 0 ? Math.max(20, config.response) : config.response;
      level += (target - level) * (1 - Math.exp(-response * step));
      apply(level);
    },
    setAgitated(active: boolean) {
      if (agitated === active) return;
      agitated = active;
      timer = Math.min(timer, active ? .25 : .8);
    },
    forceOutage(seconds: number) {
      forcedOutage = Math.max(forcedOutage, Math.max(.2, Math.min(1.5, seconds)));
    },
    setMasterLevel(value: number) {
      masterLevel = Math.max(0, Math.min(1, value));
      apply(level);
    },
    reset,
    dispose() {
      apply(1);
    },
  };
}
