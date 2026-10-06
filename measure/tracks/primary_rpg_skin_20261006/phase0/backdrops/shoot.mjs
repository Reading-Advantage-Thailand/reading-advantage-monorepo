// node shoot.mjs <outdir> <WxH> name=query ...
import { chromium } from '/home/daniebo/Desktop/advantage-forge/node_modules/playwright/index.mjs';
const base = process.env.FORGE_SHOT_BASE ?? 'http://127.0.0.1:5199/hamlet.html';
const [outdir, size, ...specs] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width, height } });
page.setDefaultTimeout(240000);
for (const spec of specs) {
  const i = spec.indexOf('='); const name = spec.slice(0, i), query = spec.slice(i + 1);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(`${base}?${query}`);
      await page.waitForFunction('window.__hamletReady === true', { timeout: 240000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${outdir}/${name}.png` });
      console.log('shot', name); break;
    } catch (e) { console.log('fail', name, attempt, String(e).slice(0, 160)); }
  }
}
await browser.close();
