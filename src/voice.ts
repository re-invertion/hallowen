import {Vector3} from '@babylonjs/core/Maths/math.vector';
type Line = {id: string; radio: boolean; position?: Vector3};
/** Owns the single dialogue channel, including asynchronous loads and cancellation. */
export function createVoicePlayer(context: () => AudioContext | null, load: (id: string) => Promise<AudioBuffer>, onSpeaking: (active: boolean) => void = () => {}) {
  let epoch = 0, busy = false, release: (() => void) | null = null;
  const waiting: Line[] = [];
  function cancel() {epoch++; waiting.length = 0; release?.(); release = null; if (busy) onSpeaking(false); busy = false;}
  async function speak(id: string, radio = false, position?: Vector3, enqueue = false): Promise<void> {
    if (enqueue && busy) {waiting.push({id, radio, position}); return;}
    if (!enqueue) cancel();
    busy = true; const generation = epoch;
    try {
      const buffer = await load(id), audio = context();
      if (!audio || generation !== epoch) return;
      const source = audio.createBufferSource(); source.buffer = buffer;
      const archive = id.startsWith('intro-') || id === 'whisper' || id === 'lost';
      source.playbackRate.value = 1;
      source.detune.value = 0;
      const highpass = audio.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = radio ? 250 : 65; highpass.Q.value = .5;
      const lowpass = audio.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = radio ? 3400 : archive ? 7600 : 8200; lowpass.Q.value = radio ? .8 : .45;
      const gain = audio.createGain(); gain.gain.value = radio ? .9 : .98;
      source.connect(highpass); highpass.connect(lowpass); lowpass.connect(gain);
      let panner: PannerNode | null = null;
      if (position) {panner = audio.createPanner(); panner.panningModel = 'HRTF'; panner.refDistance = 1; panner.maxDistance = 18; panner.rolloffFactor = 1.2; panner.positionX.value = position.x; panner.positionY.value = position.y; panner.positionZ.value = -position.z; gain.connect(panner); panner.connect(audio.destination);} else gain.connect(audio.destination);
      onSpeaking(true);
      const disconnect = () => {source.disconnect(); highpass.disconnect(); lowpass.disconnect(); gain.disconnect(); panner?.disconnect();};
      release = () => {source.onended = null; source.stop(); disconnect();};
      source.onended = () => {
        disconnect();
        if (generation !== epoch) return;
        release = null; busy = false;
        const next = waiting.shift();
        if (next) void speak(next.id, next.radio, next.position, true).catch(() => {});
        else onSpeaking(false);
      };
      source.start();
    } catch (error) {if (generation === epoch) {busy = false; waiting.length = 0; onSpeaking(false);} throw error;}
  }
  return {speak, cancel};
}
