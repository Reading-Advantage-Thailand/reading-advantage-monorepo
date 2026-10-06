// node capture.mjs <outdir> <role-user> <name=path> ... ; captures phone (375x812 viewport, plus a -2 frame one screen down) and desktop (1280) in light and night.
import { chromium } from '/home/daniebo/Desktop/advantage-forge/node_modules/playwright/index.mjs';
const BASE = 'http://localhost:3000';
const [outdir, username, ...specs] = process.argv.slice(2);
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const [name, w, h, full] of [['phone', 375, 812, true], ['desktop', 1280, 900, false]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await ctx.request.post(`${BASE}/api/auth/login`, { data: { username, password: process.env.CAP_PASSWORD ?? 'QaTest!2026x' } });
    await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    for (const spec of specs) {
      const i = spec.indexOf('='); const id = spec.slice(0, i); let path = spec.slice(i + 1);
      // `#click:Name` after the path clicks the button of that name before the shot; several `#click:` run in order.
      const clicks = path.split('#click:').slice(1); path = path.split('#click:')[0];
      // The first visit of a page compiles it; when the network never goes idle in time, wait for load instead.
      const res = await page.goto(`${BASE}/en${path}`, { waitUntil: 'networkidle', timeout: 240000 }).catch(async () => {
        const r = await page.goto(`${BASE}/en${path}`, { waitUntil: 'load', timeout: 240000 }); await page.waitForTimeout(4000); return r;
      });
      await page.waitForTimeout(1500);
      for (const name of clicks) { await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(900); }
      await page.waitForFunction(() => [...document.querySelectorAll('canvas[data-status]')].every((c) => c.dataset.status !== 'loading'), null, { timeout: 15000 }).catch(() => null);
      await page.waitForTimeout(300);
      const suffix = theme === 'dark' ? '-night' : '';
      const file = `${outdir}/${id}-${name}${suffix}.png`;
      await page.screenshot({ path: file });
      if (full) {
        const tall = await page.evaluate((vh) => document.documentElement.scrollHeight > vh * 1.2, h);
        if (tall) { await page.evaluate((vh) => window.scrollTo(0, vh * 0.9), h); await page.waitForTimeout(400); await page.screenshot({ path: `${outdir}/${id}-${name}-2${suffix}.png` }); }
      }
      console.log('shot', id, name, theme, res?.status(), page.url().replace(BASE, ''));
    }
    if (errors.length) console.log('errors', name, theme, errors.slice(0, 4));
    await ctx.close();
  }
}
await browser.close();
