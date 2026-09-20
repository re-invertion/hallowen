import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const browser = await chromium.launch({headless: true, args: ['--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {if (m.type() === 'error') errors.push(m.text());});

try {
  await page.goto('http://127.0.0.1:5173', {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.getElementById('status')?.textContent !== 'Ładowanie doświadczenia…', {timeout: 3000});
  if (await page.locator('#desktop').isDisabled()) throw Error('Desktop preview is disabled during VR capability detection');
  await page.waitForFunction(() => window.__oddzial?.scene.isReady());
  const doctorVisual = await page.evaluate(() => {
    const names = window.__oddzial.scene.meshes.map(m => m.name);
    return {
      detailed: names.filter(name => name.startsWith('doctor ')).length,
      hasFeaturelessHead: names.includes('doctor featureless head'),
      hasBlur: names.includes('doctor face blur shell a') && names.includes('doctor face blur shell b'),
      hasFacialFeatures: names.some(name => /doctor .*?(eye|nose|mouth)/i.test(name)),
    };
  });
  if (doctorVisual.detailed < 40 || !doctorVisual.hasFeaturelessHead || !doctorVisual.hasBlur || doctorVisual.hasFacialFeatures) throw Error(`Doctor visual regression: ${JSON.stringify(doctorVisual)}`);
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

  async function pose(x, y, z, tx, ty, tz) {
    await page.evaluate(v => {
      const c = window.__oddzial.scene.activeCamera;
      c.position.set(v[0], v[1], v[2]);
      const target = c.position.clone();
      target.set(v[3], v[4], v[5]);
      c.setTarget(target);
    }, [x, y, z, tx, ty, tz]);
    await page.waitForTimeout(120);
  }

  const keyPlacement = await page.evaluate(() => {
    const key = window.__oddzial.scene.getMeshByName('key');
    const p = key.getAbsolutePosition();
    return {x: p.x, y: p.y, z: p.z};
  });
  if (Math.hypot(keyPlacement.x + .85, keyPlacement.z - 10) < 2) throw Error(`Key still appears near the old corridor desk: ${JSON.stringify(keyPlacement)}`);
  if (keyPlacement.x > -2.5 || keyPlacement.z < 4.7 || keyPlacement.z > 7.3) throw Error(`Key is not inside the open side cell: ${JSON.stringify(keyPlacement)}`);

  await pose(0, 1.65, 18, 0, 1.65, 19);
  await page.keyboard.press('KeyE');
  if (await page.evaluate(() => window.__oddzial.state().doorOpen)) throw Error('Door opened without a key');

  await pose(-2.42, 1.65, 6.3, keyPlacement.x, keyPlacement.y, keyPlacement.z);
  await page.waitForFunction(() => window.__oddzial.state().keyCellVisited);
  await page.screenshot({path: 'test-results/key-cell.png'});
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__oddzial.state().hasKey);

  await pose(0, 1.65, 18, 0, 1.65, 19);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__oddzial.state().doorOpen);

  await pose(0, 1.65, 20.5, 0, 1.65, 24);
  if (await page.evaluate(() => window.__oddzial.state().phase === 'won')) throw Error('First door ended the run before the service passage');
  await page.screenshot({path: 'test-results/service-passage.png'});

  await pose(0, 1.65, 33, 0, 1.65, 38);
  if (await page.evaluate(() => window.__oddzial.state().phase === 'won')) throw Error('Treatment ward ended the run before the second gate');
  await page.screenshot({path: 'test-results/treatment-ward.png'});

  await pose(0, 1.65, 46.4, 0, 1.65, 47.5);
  await page.keyboard.press('KeyE');
  if (await page.evaluate(() => window.__oddzial.state().wardDoorOpen)) throw Error('Ward door opened without the fuse');

  await pose(-.15, 1.65, 38.7, -1.0, 1.02, 38.68);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__oddzial.state().hasFuse);

  await pose(0, 1.65, 46.4, 0, 1.65, 47.5);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__oddzial.state().wardDoorOpen);

  await pose(0, 1.65, 52.4, 0, 1.65, 53.5);
  await page.waitForFunction(() => window.__oddzial.state().phase === 'won');
  await page.waitForTimeout(500);
  await page.screenshot({path: 'test-results/win.png'});

  for (let i = 0; i < 5; i++) {
    await page.click('#restart');
    await page.waitForFunction(() => window.__oddzial.state().phase === 'explore');
    if (await page.evaluate(() => {
      const s = window.__oddzial.state();
      return s.keyCellVisited || s.hasKey || s.doorOpen || s.hasFuse || s.wardDoorOpen;
    })) throw Error('Restart retained side-cell or inventory progress');

    await pose(0, 1.65, 7.2, 0, 1.65, 10);
    await page.waitForFunction(() => window.__oddzial.state().phase === 'threat');
    const enemyZ = await page.evaluate(() => window.__oddzial.state().enemyZ);
    await pose(0, 1.65, enemyZ + .2, 0, 1.65, 0);
    await page.waitForFunction(() => window.__oddzial.state().phase === 'lost');
    await page.waitForTimeout(400);
  }

  console.log(JSON.stringify({
    checks: 'startup readiness, detailed faceless doctor, menu, old key location absent, open-cell visit, normal key pickup, key gate, service passage, treatment ward, fuse gate, escape, death, five resets',
    errors,
  }));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error('Browser errors:', errors);
  throw error;
} finally {
  await browser.close();
}
