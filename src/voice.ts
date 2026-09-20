import {Vector3} from '@babylonjs/core/Maths/math.vector';
type Line = {id: string; radio: boolean; position?: Vector3};
/** Owns the single dialogue channel, including asynchronous loads and cancellation. */
export function createVoicePlayer(context: () => AudioContext | null, load: (id: string) => Promise<AudioBuffer>) {
  let epoch = 0, busy = false, release: (() => void) | null = null;
  const waiting: Line[] = [];
  function cancel() {epoch++; waiting.length = 0; release?.(); release = null; busy = false;}
  async function speak(id: string, radio = false, position?: Vector3, enqueue = false): Promise<void> {
    if (enqueue && busy) {waiting.push({id, radio, position}); return;}
    if (!enqueue) cancel();
    busy = true; const generation = epoch;
    try {
      const buffer = await load(id), audio = context();
      if (!audio || generation !== epoch) return;
      const source = audio.createBufferSource(); source.buffer = buffer;
      const gain = audio.createGain(); gain.gain.value = radio ? .85 : .95;
      const filter = audio.createBiquadFilter(); filter.type = radio ? 'bandpass' : 'lowpass'; filter.frequency.value = radio ? 1500 : 6500; filter.Q.value = radio ? .65 : .7;
      source.connect(filter); filter.connect(gain);
      let panner: PannerNode | null = null;
      if (position) {panner = audio.createPanner(); panner.panningModel = 'HRTF'; panner.refDistance = 1; panner.positionX.value = position.x; panner.positionY.value = position.y; panner.positionZ.value = -position.z; gain.connect(panner); panner.connect(audio.destination);} else gain.connect(audio.destination);
      const disconnect = () => {source.disconnect(); filter.disconnect(); gain.disconnect(); panner?.disconnect();};
      release = () => {source.onended = null; source.stop(); disconnect();};
      source.onended = () => {
        disconnect();
        if (generation !== epoch) return;
        release = null; busy = false;
        const next = waiting.shift();
        if (next) void speak(next.id, next.radio, next.position, true).catch(() => {});
      };
      source.start();
    } catch (error) {if (generation === epoch) {busy = false; waiting.length = 0;} throw error;}
  }
  return {speak, cancel};
}
