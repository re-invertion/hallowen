import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser = await chromium.launch({headless: true, args: ['--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});
try {
  await page.goto('http://127.0.0.1:5173', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.__oddzial?.scene.isReady());
  await mkdir('test-results', {recursive: true});
  await page.screenshot({path: 'test-results/menu.png'});
  await page.click('#desktop');
  await page.waitForFunction(() => window.__oddzial.state().phase === 'intro');
  await page.waitForTimeout(1500);
  await page.screenshot({path: 'test-results/intro.png'});
  const cinemaContrast = await page.evaluate(async () => {
    const scene = window.__oddzial.scene, engine = scene.getEngine(); scene.render();
    const pixels = await engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
    let dark = 0, bright = 0;
    for (let i = 0; i < pixels.length; i += 400) {if (pixels[i] < 90) dark++; if (pixels[i] > 130) bright++;}
    return {dark, bright, samples: Math.ceil(pixels.length / 400)};
  });
  if (cinemaContrast.dark / cinemaContrast.samples < .15 || cinemaContrast.bright / cinemaContrast.samples < .03) throw Error(`Intro is blank or overexposed: ${JSON.stringify(cinemaContrast)}`);
  const filmFits = await page.evaluate(() => {
    const s = window.__oddzial.scene, film = s.getMeshByName('archive cinema');
    return film.getBoundingInfo().boundingBox.vectorsWorld.every(v => {
      const p = v.constructor.TransformCoordinates(v, s.getTransformMatrix());
      return Math.abs(p.x) <= .96 && Math.abs(p.y) <= .96;
    });
  });
  if (!filmFits) throw Error('Archive film text extends outside the viewport');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__oddzial.state().phase === 'explore');
  await page.screenshot({path: 'test-results/corridor.png'});
  // Move the real camera, then interact via the normal keyboard handler.
  async function pose(x, y, z, tx, ty, tz) {
    await page.evaluate(v => {
      const c = window.__oddzial.scene.activeCamera;
      c.position.set(v[0], v[1], v[2]); const target = c.position.clone(); target.set(v[3], v[4], v[5]); c.setTarget(target);
    }, [x,y,z,tx,ty,tz]);
    await page.waitForTimeout(100);
  }
  await pose(0, 1.65, 18, 0, 1.65, 19);
  await page.keyboard.press('KeyE');
  if (await page.evaluate(() => window.__oddzial.state().doorOpen)) throw Error('Door opened without a key');
  await pose(-.2, 1.65, 10, -.85, .94, 10);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__oddzial.state().hasKey);
  await pose(0, 1.65, 18, 0, 1.65, 19);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__oddzial.state().doorOpen);
  await pose(0, 1.65, 20.5, 0, 1.65, 24);
  if (await page.evaluate(() => window.__oddzial.state().phase === 'won')) throw Error('First door ended the run before the service passage');
  await page.screenshot({path: 'test-results/service-passage.png'});
  await pose(0, 1.65, 29.7, 0, 1.65, 30.5);
  await page.waitForFunction(() => window.__oddzial.state().phase === 'won');
  await page.waitForTimeout(500);
  await page.screenshot({path: 'test-results/win.png'});
  for (let i = 0; i < 5; i++) {
    await page.click('#restart');
    await page.waitForFunction(() => window.__oddzial.state().phase === 'explore');
    if (await page.evaluate(() => window.__oddzial.state().hasKey || window.__oddzial.state().doorOpen)) throw Error('Restart retained inventory');
    await pose(0, 1.65, 7.2, 0, 1.65, 10);
    await page.waitForFunction(() => window.__oddzial.state().phase === 'threat');
    const enemyZ = await page.evaluate(() => window.__oddzial.state().enemyZ);
    await pose(0, 1.65, enemyZ + .2, 0, 1.65, 0);
    await page.waitForFunction(() => window.__oddzial.state().phase === 'lost');
    await page.waitForTimeout(400);
  }
  console.log(JSON.stringify({checks: 'menu, key gate, key pickup, service passage, escape, death, five resets', errors}));
  if (errors.length) process.exitCode = 1;
} catch (error) {console.error('Browser errors:', errors); throw error;} finally {await browser.close();}
