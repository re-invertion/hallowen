export type Phase = 'start' | 'intro' | 'explore' | 'knocking' | 'threat' | 'won' | 'lost';
export interface GameState {
  phase: Phase; paused: boolean; hasKey: boolean; doorOpen: boolean;
  knockElapsed: number; enemyZ: number; enemyX: number;
}
export const initialState = (): GameState => ({phase: 'start', paused: false, hasKey: false, doorOpen: false, knockElapsed: 0, enemyZ: 2, enemyX: 0});
export const startGame = (): GameState => ({...initialState(), phase: 'explore'});
export const resumeOrStart = (s: GameState): GameState => ['intro', 'explore', 'knocking', 'threat'].includes(s.phase) ? {...s, paused: false} : startGame();
export const isPlaying = (s: GameState) => !s.paused && ['explore', 'knocking', 'threat'].includes(s.phase);
export const takeKey = (s: GameState): GameState => isPlaying(s) ? {...s, hasKey: true} : s;
export const openDoor = (s: GameState): GameState => isPlaying(s) && s.hasKey ? {...s, doorOpen: true} : s;
export const dueKnocks = (previous: number, current: number) => [0, .8, 1.6].filter(t => previous < t && current >= t);
export function updateGame(s: GameState, input: {dt: number; observed: boolean; playerZ: number; playerX?: number}): GameState {
  if (!isPlaying(s) || !Number.isFinite(input.dt) || input.dt <= 0) return s;
  const dt = Math.min(input.dt, .05);
  if (s.doorOpen && input.playerZ > 19.5) return {...s, phase: 'won'};
  if (s.phase === 'explore' && input.playerZ >= 7) return {...s, phase: 'knocking', knockElapsed: 0};
  if (s.phase === 'knocking') {
    const knockElapsed = s.knockElapsed + dt;
    return {...s, knockElapsed, phase: knockElapsed >= 2.4 ? 'threat' : 'knocking'};
  }
  if (s.phase === 'threat') {
    let enemyZ = s.enemyZ, enemyX = s.enemyX;
    if (!input.observed) {
      // Route through the clear center lane while crossing the desk's Z interval.
      const crossesDesk = Math.min(enemyZ, input.playerZ) < 11.2 && Math.max(enemyZ, input.playerZ) > 8.8;
      const playerX = Math.max(-1.1, Math.min(1.1, input.playerX ?? 0));
      const targetX = crossesDesk ? Math.max(0, playerX) : playerX;
      const targetZ = crossesDesk && enemyX < -.3 ? enemyZ : input.playerZ;
      const dx = targetX - enemyX, dz = targetZ - enemyZ, length = Math.hypot(dx, dz);
      if (length > 0) {const step = Math.min(.7 * dt, length) / length; enemyX += dx * step; enemyZ += dz * step;}
    }
    const distance = Math.hypot(input.playerZ - enemyZ, (input.playerX ?? 0) - enemyX);
    return {...s, enemyX, enemyZ, phase: distance < .8 ? 'lost' : 'threat'};
  }
  return s;
}
