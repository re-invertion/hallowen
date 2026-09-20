import {Vector3} from '@babylonjs/core/Maths/math.vector';

type AmbientEvent = 'scream' | 'groan' | 'cough' | 'scrape' | 'metal' | 'bang' | 'rapidKnocks' | 'murmur';

type Room = {
  position: Vector3;
  events: AmbientEvent[];
  next: number;
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

export function createRoomAmbience(context: () => AudioContext | null) {
  const active = new Set<AudioScheduledSourceNode>();
  const rooms: Room[] = [
    {position: new Vector3(1.95, 1.35, 2), events: ['cough', 'murmur', 'scrape'], next: random(6, 14)},
    {position: new Vector3(1.95, 1.35, 10), events: ['groan', 'scream', 'bang'], next: random(8, 18)},
    {position: new Vector3(-1.95, 1.25, 14), events: ['metal', 'scrape', 'rapidKnocks'], next: random(5, 16)},
    {position: new Vector3(1.95, 1.4, 18), events: ['murmur', 'bang', 'groan'], next: random(10, 20)},
    {position: new Vector3(-1.72, 1.2, 37.2), events: ['scream', 'groan', 'metal', 'rapidKnocks'], next: random(4, 10)},
    {position: new Vector3(1.72, 1.2, 41.2), events: ['scream', 'groan', 'bang', 'scrape'], next: random(5, 12)},
  ];
  let busyUntil = 0;

  function makeNoise(audio: AudioContext, seconds: number) {
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * seconds), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function chain(audio: AudioContext, position: Vector3, volume: number, cutoff: number) {
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = .8;
    const gain = audio.createGain();
    gain.gain.value = .001;
    const panner = audio.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.25;
    panner.maxDistance = 16;
    panner.rolloffFactor = 1.35;
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = -position.z;
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(audio.destination);
    return {filter, gain, panner, volume};
  }

  function trackGroup(sources: AudioScheduledSourceNode[], nodes: AudioNode[]) {
    let remaining = sources.length;
    for (const source of sources) {
      active.add(source);
      source.onended = () => {
        active.delete(source);
        try {source.disconnect();} catch {}
        remaining--;
        if (remaining === 0) for (const node of nodes) {
          try {node.disconnect();} catch {}
        }
      };
    }
  }

  function noiseBurst(position: Vector3, volume: number, duration: number, cutoff: number, delay = 0, attack = .008) {
    const audio = context();
    if (!audio || audio.state !== 'running') return;
    const start = audio.currentTime + delay;
    const c = chain(audio, position, volume, cutoff);
    const source = audio.createBufferSource();
    source.buffer = makeNoise(audio, duration);
    source.connect(c.filter);
    c.gain.gain.setValueAtTime(.001, start);
    c.gain.gain.exponentialRampToValueAtTime(Math.max(.002, volume), start + attack);
    c.gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    trackGroup([source], [c.filter, c.gain, c.panner]);
    source.start(start);
    source.stop(start + duration + .02);
  }

  function voiceTone(kind: 'scream' | 'groan' | 'murmur', position: Vector3, volume: number) {
    const audio = context();
    if (!audio || audio.state !== 'running') return;
    const duration = kind === 'scream' ? 1.05 : kind === 'groan' ? 1.7 : 2.2;
    const cutoff = kind === 'scream' ? 1150 : kind === 'groan' ? 720 : 620;
    const c = chain(audio, position, volume, cutoff);
    const first = audio.createOscillator();
    const second = audio.createOscillator();
    first.type = kind === 'murmur' ? 'sine' : 'sawtooth';
    second.type = 'sine';
    const now = audio.currentTime;
    if (kind === 'scream') {
      first.frequency.setValueAtTime(310, now);
      first.frequency.exponentialRampToValueAtTime(680, now + .38);
      first.frequency.exponentialRampToValueAtTime(360, now + duration);
      second.frequency.setValueAtTime(470, now);
      second.frequency.exponentialRampToValueAtTime(820, now + .45);
    } else if (kind === 'groan') {
      first.frequency.setValueAtTime(112, now);
      first.frequency.exponentialRampToValueAtTime(76, now + duration);
      second.frequency.value = 151;
    } else {
      first.frequency.value = 116;
      second.frequency.value = 173;
    }
    first.connect(c.filter);
    second.connect(c.filter);
    c.gain.gain.setValueAtTime(.001, now);
    c.gain.gain.exponentialRampToValueAtTime(Math.max(.002, volume * (kind === 'murmur' ? .34 : .58)), now + .12);
    c.gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    trackGroup([first, second], [c.filter, c.gain, c.panner]);
    first.start(now);
    second.start(now);
    first.stop(now + duration);
    second.stop(now + duration);
    noiseBurst(position, volume * .12, duration * .8, cutoff * .9, .04, .03);
  }

  function play(kind: AmbientEvent, position: Vector3, volume = random(.45, .8)) {
    if (kind === 'scream' || kind === 'groan' || kind === 'murmur') {
      voiceTone(kind, position, volume);
      return kind === 'murmur' ? 2.3 : kind === 'groan' ? 1.8 : 1.15;
    }
    if (kind === 'cough') {
      noiseBurst(position, volume * .62, .24, 760);
      noiseBurst(position, volume * .48, .2, 700, .31);
      return .65;
    }
    if (kind === 'scrape') {
      noiseBurst(position, volume * .42, 1.35, 980, 0, .09);
      return 1.45;
    }
    if (kind === 'metal') {
      noiseBurst(position, volume * .72, .42, 1450, 0, .004);
      voiceTone('murmur', position, volume * .08);
      return .7;
    }
    if (kind === 'rapidKnocks') {
      for (const delay of [0, .19, .37, .58]) noiseBurst(position, volume * .78, .13, 520, delay, .003);
      return .85;
    }
    noiseBurst(position, volume, .32, 460, 0, .003);
    return .45;
  }

  function schedule(room: Room, silent = false) {
    room.next = silent ? random(12, 28) : random(5, 20);
  }

  return {
    update(dt: number, enabled: boolean) {
      if (!enabled || !Number.isFinite(dt) || dt <= 0) return;
      const audio = context();
      if (!audio || audio.state !== 'running') return;
      for (const room of rooms) {
        room.next -= Math.min(dt, .05);
        if (room.next > 0) continue;
        if (audio.currentTime < busyUntil) {
          room.next = random(.8, 2.4);
          continue;
        }
        if (Math.random() < .34) {
          schedule(room, true);
          continue;
        }
        const kind = room.events[Math.floor(Math.random() * room.events.length)]!;
        const duration = play(kind, room.position, random(.42, .78));
        busyUntil = audio.currentTime + duration + random(.7, 1.8);
        schedule(room);
      }
    },
    triggerKeyShock() {
      const audio = context();
      if (!audio || audio.state !== 'running') return;
      const position = new Vector3(1.95, 1.45, 6);
      const duration = play('bang', position, .95);
      busyUntil = audio.currentTime + duration + 1.2;
    },
    reset() {
      for (const source of [...active]) {
        try {source.stop();} catch {}
      }
      active.clear();
      busyUntil = 0;
      for (const room of rooms) room.next = random(5, 18);
    },
    dispose() {
      for (const source of [...active]) {
        try {source.stop();} catch {}
      }
      active.clear();
    },
  };
}
