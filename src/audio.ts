import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {createVoicePlayer} from './voice';
import {createSoundtrack} from './soundtrack';
import type {Phase} from './game/state';
export function createAudio() {
  let context: AudioContext | null = null;
  const sources = new Set<AudioBufferSourceNode>();
  const voices = new Map<string, Promise<AudioBuffer>>();
  const bufferFor = (id: string) => {
    if (!context) return Promise.reject(new Error('Dźwięk nie został uruchomiony.'));
    if (!voices.has(id)) voices.set(id, fetch(`${import.meta.env.BASE_URL}audio/${id}.mp3?v=audio-v2`).then(r => {if (!r.ok) throw new Error(`Brak nagrania ${id}`); return r.arrayBuffer();}).then(data => context!.decodeAudioData(data)));
    return voices.get(id)!;
  };
  const soundtrack = createSoundtrack(() => context);
  const voice = createVoicePlayer(() => context, bufferFor, active => soundtrack.duck(active));
  function noise(seconds: number, volume: number, frequency: number, position?: Vector3) {
    if (!context || context.state !== 'running') return;
    const audio = context;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * seconds), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource(); source.buffer = buffer;
    const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = frequency;
    const gain = audio.createGain(); gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + seconds);
    source.connect(filter); filter.connect(gain);
    let panner: PannerNode | undefined;
    if (position) {
      panner = audio.createPanner(); panner.panningModel = 'HRTF'; panner.refDistance = 2; panner.maxDistance = 25;
      panner.positionX.value = position.x; panner.positionY.value = position.y; panner.positionZ.value = -position.z;
      gain.connect(panner); panner.connect(audio.destination);
    } else gain.connect(audio.destination);
    sources.add(source); source.onended = () => {sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); panner?.disconnect();}; source.start();
  }
  return {
    speak: voice.speak,
    async preload() {await Promise.all(['intro-1', 'intro-2', 'intro-3', 'intro-4', 'radio-start', 'radio-warning', 'whisper', 'key', 'locked', 'lost', 'won'].map(bufferFor));},
    async unlock() {
      context ??= new AudioContext(); await context.resume();
      soundtrack.start();
    },
    setMood(phase: Phase, hunted = false) {soundtrack.setMood(phase, hunted);},
    setListener(position: Vector3, forward: Vector3, up: Vector3) {
      if (!context) return;
      const l = context.listener;
      l.positionX.value = position.x; l.positionY.value = position.y; l.positionZ.value = -position.z;
      l.forwardX.value = forward.x; l.forwardY.value = forward.y; l.forwardZ.value = -forward.z;
      l.upX.value = up.x; l.upY.value = up.y; l.upZ.value = -up.z;
    },
    knock(position: Vector3) {noise(.24, .75, 350, position);},
    footstep(position: Vector3) {noise(.18, .28, 200, position);},
    pause() {if (context?.state === 'running') void context.suspend();},
    reset() {voice.cancel(); for (const s of sources) s.stop(); sources.clear();},
    dispose() {this.reset(); soundtrack.dispose(); if (context) void context.close(); context = null;},
  };
}
