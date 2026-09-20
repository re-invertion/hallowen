import {expect, it, vi} from 'vitest';
import {createVoicePlayer} from './voice';
function rig() {
  const started: string[] = [], sources: {onended: null | (() => void); buffer: {id: string} | null; start: () => void; stop: () => void; connect: () => void; disconnect: () => void}[] = [];
  const node = () => ({connect() {}, disconnect: vi.fn(), gain: {value: 0}, frequency: {value: 0}, Q: {value: 0}, positionX: {value: 0}, positionY: {value: 0}, positionZ: {value: 0}});
  const context = {destination: {}, createGain: node, createBiquadFilter: node, createPanner: node, createBufferSource() {const s = {onended: null as null | (() => void), buffer: null as {id: string} | null, start() {started.push(s.buffer!.id);}, stop() {}, connect() {}, disconnect() {}}; sources.push(s); return s;}} as unknown as AudioContext;
  const player = createVoicePlayer(() => context, async id => ({id}) as unknown as AudioBuffer);
  return {player, started, sources};
}
it('plays every queued story line in order without replacing earlier dialogue', async () => {
  const {player, started, sources} = rig();
  await player.speak('warning'); await player.speak('key', false, undefined, true); await player.speak('whisper', false, undefined, true);
  expect(started).toEqual(['warning']);
  sources[0].onended?.(); await vi.waitFor(() => expect(started).toEqual(['warning', 'key']));
  sources[1].onended?.(); await vi.waitFor(() => expect(started).toEqual(['warning', 'key', 'whisper']));
});
it('reset discards pending and in-flight narration after intro skip', async () => {
  let release: (b: AudioBuffer) => void = () => {};
  const {sources} = rig();
  const context = {createBufferSource: () => {throw Error('Stale voice must not start');}} as unknown as AudioContext;
  const player = createVoicePlayer(() => context, () => new Promise(r => {release = r;}));
  const pending = player.speak('intro-1');
  await player.speak('intro-2', false, undefined, true);
  player.cancel(); release({} as AudioBuffer); await pending;
  expect(sources).toHaveLength(0);
});
