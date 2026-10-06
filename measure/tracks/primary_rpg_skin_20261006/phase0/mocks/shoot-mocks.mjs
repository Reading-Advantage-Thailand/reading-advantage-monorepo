import { chromium } from '/home/daniebo/Desktop/advantage-forge/node_modules/playwright/index.mjs';
const M = '/home/daniebo/Desktop/rama-worktrees/lane-f/measure/tracks/primary_rpg_skin_20261006/phase0/mocks';
const C = '/home/daniebo/Desktop/rama-worktrees/lane-f/measure/tracks/primary_rpg_skin_20261006/phase0/captures';
const browser = await chromium.launch();
for (const [name, w, h] of [['phone', 375, 812], ['desktop', 1280, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  for (const mock of ['home', 'shop', 'battle']) {
    await page.goto(`file://${M}/${mock}.html`);
    await page.waitForTimeout(1200);
    const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src));
    if (broken.length) console.log('broken', mock, broken);
    await page.screenshot({ path: `${C}/${mock}-${name}.png` });
    await page.evaluate(() => document.documentElement.classList.add('capture'));
    await page.screenshot({ path: `${C}/${mock}-${name}-full.png`, fullPage: true });
    console.log('shot', mock, name);
  }
  await page.close();
}
await browser.close();
