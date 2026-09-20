import type {Phase} from './game/state';

export type SoundtrackMood = {
  master: number;
  drone: number;
  air: number;
  dissonance: number;
  pulse: number;
};

export function soundtrackMood(phase: Phase, hunted = false): SoundtrackMood {
  if (phase === 'start') return {master: 0, drone: 0, air: 0, dissonance: 0, pulse: 0};
  if (phase === 'intro') return {master: .24, drone: .11, air: .03, dissonance: .006, pulse: .002};
  if (phase === 'explore') return {master: .22, drone: .1, air: .028, dissonance: .005, pulse: .004};
  if (phase === 'knocking') return {master: .28, drone: .125, air: .038, dissonance: .014, pulse: .014};
  if (phase === 'threat') return hunted
    ? {master: .34, drone: .15, air: .05, dissonance: .026, pulse: .03}
    : {master: .3, drone: .14, air: .042, dissonance: .019, pulse: .018};
  if (phase === 'lost') return {master: .3, drone: .14, air: .046, dissonance: .028, pulse: .02};
  return {master: .14, drone: .055, air: .016, dissonance: .002, pulse: .002};
}

export function createSoundtrack(context: () => AudioContext | null) {
  let phase: Phase = 'start', hunted = false, ducked = false;
  let master: GainNode | null = null, drone: GainNode | null = null, air: GainNode | null = null, dissonance: GainNode | null = null, pulse: GainNode | null = null, pulseDepth: GainNode | null = null;
  const running: AudioScheduledSourceNode[] = [];

  function ramp(param: AudioParam, value: number, time = .35) {
    const audio = context();
    if (!audio) return;
    param.cancelScheduledValues(audio.currentTime);
    param.setTargetAtTime(value, audio.currentTime, time);
  }

  function apply() {
    if (!master || !drone || !air || !dissonance || !pulse || !pulseDepth) return;
    const mood = soundtrackMood(phase, hunted);
    ramp(master.gain, mood.master * (ducked ? .38 : 1), ducked ? .08 : .45);
    ramp(drone.gain, mood.drone);
    ramp(air.gain, mood.air);
    ramp(dissonance.gain, mood.dissonance);
    ramp(pulse.gain, mood.pulse);
    ramp(pulseDepth.gain, mood.pulse * .65);
  }

  function start() {
    const audio = context();
    if (!audio || master) return;

    master = audio.createGain(); master.gain.value = 0; master.connect(audio.destination);

    const droneFilter = audio.createBiquadFilter(); droneFilter.type = 'lowpass'; droneFilter.frequency.value = 150; droneFilter.Q.value = .55;
    drone = audio.createGain(); drone.gain.value = 0; drone.connect(droneFilter); droneFilter.connect(master);

    for (const [frequency, level] of [[41.2, 1], [61.8, .48], [82.1, .22]] as const) {
      const osc = audio.createOscillator(); osc.type = 'sine'; osc.frequency.value = frequency;
      const gain = audio.createGain(); gain.gain.value = level;
      osc.connect(gain); gain.connect(drone); osc.start(); running.push(osc);
    }

    const seconds = 6;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * seconds), audio.sampleRate);
    const data = buffer.getChannelData(0); let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + .025 * (Math.random() * 2 - 1)) / 1.025;
      data[i] = brown * .55;
    }
    const noise = audio.createBufferSource(); noise.buffer = buffer; noise.loop = true;
    const airFilter = audio.createBiquadFilter(); airFilter.type = 'bandpass'; airFilter.frequency.value = 720; airFilter.Q.value = .35;
    air = audio.createGain(); air.gain.value = 0;
    noise.connect(airFilter); airFilter.connect(air); air.connect(master); noise.start(); running.push(noise);

    const metallic = audio.createOscillator(); metallic.type = 'triangle'; metallic.frequency.value = 147.4;
    const metallicFilter = audio.createBiquadFilter(); metallicFilter.type = 'bandpass'; metallicFilter.frequency.value = 190; metallicFilter.Q.value = 2.2;
    dissonance = audio.createGain(); dissonance.gain.value = 0;
    metallic.connect(metallicFilter); metallicFilter.connect(dissonance); dissonance.connect(master); metallic.start(); running.push(metallic);

    const pulseOsc = audio.createOscillator(); pulseOsc.type = 'sine'; pulseOsc.frequency.value = 54;
    pulse = audio.createGain(); pulse.gain.value = 0; pulseOsc.connect(pulse); pulse.connect(master); pulseOsc.start(); running.push(pulseOsc);
    const lfo = audio.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = .83;
    pulseDepth = audio.createGain(); pulseDepth.gain.value = 0;
    lfo.connect(pulseDepth); pulseDepth.connect(pulse.gain); lfo.start(); running.push(lfo);

    apply();
  }

  return {
    start,
    setMood(nextPhase: Phase, nextHunted = false) {
      if (phase === nextPhase && hunted === nextHunted) return;
      phase = nextPhase; hunted = nextHunted; apply();
    },
    duck(active: boolean) {
      if (ducked === active) return;
      ducked = active; apply();
    },
    dispose() {
      for (const source of running) {
        try {source.stop();} catch {}
        source.disconnect();
      }
      running.length = 0;
      master?.disconnect(); master = null;
      drone = air = dissonance = pulse = pulseDepth = null;
    },
  };
}
