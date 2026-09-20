import {chromium} from '@playwright/test';
const browser = await chromium.launch({args: ['--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 800, height: 600}});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.addInitScript(() => {
    window.__audioStarts = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {if (this.buffer && !this.loop) window.__audioStarts.push(this.buffer.duration); return start.apply(this, args);};
  });
  await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(() => window.__oddzial);
  await page.click('#desktop');
  await page.waitForFunction(() => window.__oddzial.state().phase === 'intro');
  await page.waitForTimeout(1800);
  // CDP's synthetic Escape does not release browser pointer lock; use its native API.
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForFunction(() => window.__oddzial.state().paused);
  const beforePause = await page.evaluate(() => window.__audioStarts.length);
  await page.waitForTimeout(1100);
  if (await page.evaluate(() => window.__audioStarts.length) !== beforePause) throw Error('Narration advanced while paused');
  await page.click('#desktop');
  await page.waitForFunction(() => !window.__oddzial.state().paused);
  await page.waitForFunction(() => window.__oddzial.state().phase === 'explore', null, {timeout: 120000});
  const durations = await page.evaluate(() => window.__audioStarts);
  const voices = durations.filter(d => d > 5);
  if (voices.length !== 5) throw Error(`Expected four intro voices and entry radio: ${JSON.stringify(durations)}`);
  if (durations.filter(d => d < .3).length !== 3) throw Error(`Missing intro knocks: ${JSON.stringify(durations)}`);
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({checks: 'full intro, pause/resume, four narration clips, three knocks, entry radio', voices, errors}));
} finally {await browser.close();}
