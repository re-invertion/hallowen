import type {Phase} from './game/state';

export type SoundtrackMix = {
  master: number;
  bed: number;
  danger: number;
  pulse: number;
};

export function soundtrackMix(phase: Phase, hunted = false): SoundtrackMix {
  if (phase === 'start') return {master: 0, bed: 0, danger: 0, pulse: 0};
  if (phase === 'intro') return {master: .42, bed: .7, danger: .04, pulse: .015};
  if (phase === 'explore') return {master: .48, bed: .78, danger: .06, pulse: .02};
  if (phase === 'knocking') return {master: .56, bed: .64, danger: .34, pulse: .055};
  if (phase === 'threat') return hunted
    ? {master: .68, bed: .36, danger: .82, pulse: .11}
    : {master: .6, bed: .48, danger: .62, pulse: .07};
  if (phase === 'lost') return {master: .58, bed: .3, danger: .76, pulse: .08};
  return {master: .28, bed: .42, danger: .08, pulse: .015};
}

export function createSoundtrack(
  context: () => AudioContext | null,
  load: (name: string) => Promise<AudioBuffer>,
) {
  let phase: Phase = 'start', hunted = false, ducked = false, started = false;
  let master: GainNode | null = null, bed: GainNode | null = null, danger: GainNode | null = null, pulse: GainNode | null = null;
  const running: AudioScheduledSourceNode[] = [];
  let preloadPromise: Promise<[AudioBuffer, AudioBuffer]> | null = null;

  const preload = () => preloadPromise ??= Promise.all([
    load('abandoned-passages'),
    load('lurking-evil'),
  ]);

  function ramp(param: AudioParam, value: number, time = .28) {
    const audio = context();
    if (!audio) return;
    param.cancelScheduledValues(audio.currentTime);
    param.setTargetAtTime(value, audio.currentTime, time);
  }

  function apply() {
    if (!master || !bed || !danger || !pulse) return;
    const mix = soundtrackMix(phase, hunted);
    ramp(master.gain, mix.master * (ducked ? .24 : 1), ducked ? .06 : .32);
    ramp(bed.gain, mix.bed);
    ramp(danger.gain, mix.danger);
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
    pulse = audio.createGain();
    bed.gain.value = danger.gain.value = pulse.gain.value = 0;
    bed.connect(master);
    danger.connect(master);
    pulse.connect(master);

    // Audible fallback immediately, even if network decoding takes a moment.
    const pulseOsc = audio.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.value = 52;
    pulseOsc.connect(pulse);
    pulseOsc.start();
    running.push(pulseOsc);

    apply();

    try {
      const [bedBuffer, dangerBuffer] = await preload();
      if (!master || !bed || !danger) return;

      const bedSource = audio.createBufferSource();
      bedSource.buffer = bedBuffer;
      bedSource.loop = true;
      bedSource.connect(bed);
      bedSource.start();
      running.push(bedSource);

      const dangerSource = audio.createBufferSource();
      dangerSource.buffer = dangerBuffer;
      dangerSource.loop = true;
      dangerSource.connect(danger);
      dangerSource.start();
      running.push(dangerSource);
    } catch {
      // Keep the low pulse fallback; gameplay must continue if a music asset fails.
    }
  }

  return {
    preload,
    start,
    setMood(nextPhase: Phase, nextHunted = false) {
      if (phase === nextPhase && hunted === nextHunted) return;
      phase = nextPhase;
      hunted = nextHunted;
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
      master = bed = danger = pulse = null;
      started = false;
    },
  };
}
