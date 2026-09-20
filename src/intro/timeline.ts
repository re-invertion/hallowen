export const INTRO_DURATION = 38.5;
export const CHAPTERS = [
  {at: 0, title: 'TWORKI / 1944', code: 'AKTA 00 — POCHODZENIE', voice: 'intro-1', lines: ['Oddział, którego nie było na planach.', 'Pod jednym ze starych pawilonów', 'miała istnieć zamurowana piwnica.']},
  {at: 9.1, title: 'NACHTIGALL', code: 'AKTA 17 — PROGRAM', voice: 'intro-2', lines: ['Nie nazwiska. Numery.', 'Izolacja. Brak światła. Brak snu.', 'Cel eksperymentu: świadomość.']},
  {at: 18, title: 'TEN BEZ TWARZY', code: 'AKTA 31 — OBSERWACJA', voice: 'intro-3', lines: ['Różne cele. Ten sam opis.', 'Wysoki mężczyzna. Biały fartuch.', 'Twarz zupełnie gładka.']},
  {at: 26.8, title: 'PACJENT 47', code: 'AKTA 47 — OSTATNI ZAPIS', voice: 'intro-4', lines: ['Zanim przychodził: trzy uderzenia.', 'NIE POZWÓL MU ZOBACZYĆ', 'TWOJEJ TWARZY.']},
];
export function introFrame(time: number) {
  const chapter = CHAPTERS.reduce((current, c, index) => time >= c.at ? index : current, 0);
  const localTime = Math.max(0, time - CHAPTERS[chapter].at);
  return {chapter, localTime, progress: Math.min(1, Math.max(0, time / INTRO_DURATION)), done: time >= INTRO_DURATION};
}
export const introCues = (before: number, after: number) => CHAPTERS.filter(c => before < c.at && after >= c.at).map(c => c.voice);
export const introKnocks = (before: number, after: number) => [36.3, 37, 37.7].filter(t => before < t && after >= t);
