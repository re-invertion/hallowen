import type {Phase} from './game/state';

export type SoundtrackZone = 'corridor' | 'service' | 'treatment';
export type SoundtrackMix = {
  master: number;
  bed: number;
  danger: number;
  treatment: number;
  pulse: number;
};

export function soundtrackMix(phase: Phase, hunted = false, zone: SoundtrackZone = 'corridor'): SoundtrackMix {
  if (phase === 'start') return {master: 0, bed: 0, danger: 0, treatment: 0, pulse: 0};
  const treatment = zone === 'treatment';
  const service = zone === 'service';
  if (phase === 'intro') return {master: .42, bed: .7, danger: .04, treatment: 0, pulse: .015};
  if (phase === 'explore') return {master: treatment ? .54 : .48, bed: treatment ? .16 : service ? .58 : .78, danger: .06, treatment: treatment ? .82 : 0, pulse: treatment ? .035 : .02};
  if (phase === 'knocking') return {master: .56, bed: treatment ? .14 : .64, danger: .34, treatment: treatment ? .7 : 0, pulse: .055};
  if (phase === 'threat') return hunted
    ? {master: .68, bed: treatment ? .1 : .36, danger: .82, treatment: treatment ? .56 : 0, pulse: .11}
    : {master: .6, bed: treatment ? .12 : .48, danger: .62, treatment: treatment ? .64 : 0, pulse: .07};
  if (phase === 'lost') return {master: .58, bed: .3, danger: .76, treatment: treatment ? .4 : 0, pulse: .08};
  return {master: .28, bed: .42, danger: .08, treatment: treatment ? .3 : 0, pulse: .015};
}

export function createSoundtrack(
  context: () => AudioContext | null,
  load: (name: string) => Promise<AudioBuffer>,
) {
  let phase: Phase = 'start', hunted = false, zone: SoundtrackZone = 'corridor', ducked = false, started = false;
  let master: GainNode | null = null, bed: GainNode | null = null, danger: GainNode | null = null, treatment: GainNode | null = null, pulse: GainNode | null = null;
  const running: AudioScheduledSourceNode[] = [];
  let preloadPromise: Promise<[AudioBuffer, AudioBuffer, AudioBuffer]> | null = null;

  const preload = () => preloadPromise ??= Promise.all([
    load('abandoned-passages'),
    load('lurking-evil'),
    load('lost-bad-place'),
  ]);

  function ramp(param: AudioParam, value: number, time = .28) {
    const audio = context();
    if (!audio) return;
    param.cancelScheduledValues(audio.currentTime);
    param.setTargetAtTime(value, audio.currentTime, time);
  }

  function apply() {
    if (!master || !bed || !danger || !treatment || !pulse) return;
    const mix = soundtrackMix(phase, hunted, zone);
    ramp(master.gain, mix.master * (ducked ? .24 : 1), ducked ? .06 : .32);
    ramp(bed.gain, mix.bed);
    ramp(danger.gain, mix.danger);
    ramp(treatment.gain, mix.treatment, .55);
    ramp(pulse.gain, mix.pulse);
  }

  async function start() {
    const audio = context();
    if (!audio || started) return;
    started = true;

    master = audio.createGain();
    master.gain.value = 0;
    const compressor = audio.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = .012;
    compressor.release.value = .25;
    master.connect(compressor);
    compressor.connect(audio.destination);

    bed = audio.createGain();
    danger = audio.createGain();
    treatment = audio.createGain();
    pulse = audio.createGain();
    bed.gain.value = danger.gain.value = treatment.gain.value = pulse.gain.value = 0;
    bed.connect(master);
    danger.connect(master);
    treatment.connect(master);
    pulse.connect(master);

    const pulseOsc = audio.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.value = 52;
    pulseOsc.connect(pulse);
    pulseOsc.start();
    running.push(pulseOsc);

    apply();

    try {
      const [bedBuffer, dangerBuffer, treatmentBuffer] = await preload();
      if (!master || !bed || !danger || !treatment) return;
      for (const [buffer, gain] of [[bedBuffer, bed], [dangerBuffer, danger], [treatmentBuffer, treatment]] as const) {
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        source.start();
        running.push(source);
      }
    } catch {
      // Keep the low pulse fallback; gameplay must continue if a music asset fails.
    }
  }

  return {
    preload,
    start,
    setMood(nextPhase: Phase, nextHunted = false, nextZone: SoundtrackZone = 'corridor') {
      if (phase === nextPhase && hunted === nextHunted && zone === nextZone) return;
      phase = nextPhase;
      hunted = nextHunted;
      zone = nextZone;
      apply();
    },
    duck(active: boolean) {
      if (ducked === active) return;
      ducked = active;
      apply();
    },
    dispose() {
      for (const source of running) {
        try {source.stop();} catch {}
        source.disconnect();
      }
      running.length = 0;
      master?.disconnect();
      master = bed = danger = treatment = pulse = null;
      started = false;
    },
  };
}
