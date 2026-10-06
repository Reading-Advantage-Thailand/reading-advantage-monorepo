// Shot 3: the armory right after "Buy": coins fly to the counter. node shot3.mjs <outdir> <username> <password>
import { chromium } from '/home/daniebo/Desktop/advantage-forge/node_modules/playwright/index.mjs';
const BASE = 'http://localhost:3000';
const [outdir, username, password] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
console.log('login', (await ctx.request.post(`${BASE}/api/auth/login`, { data: { username, password } })).status());
const page = await ctx.newPage();
await page.goto(`${BASE}/en/student/avatar/shop`, { waitUntil: 'load', timeout: 240000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outdir}/shot3-shop-before-phone.png` });
const item = page.locator('.cq-item:not(.cq-item--owned):not(.cq-item--locked)').first();
console.log('item', await item.innerText().catch(() => 'none'));
await item.click(); await page.waitForTimeout(900);
const buy = page.getByRole('button', { name: /Buy for/ }).first();
console.log('buy', await buy.innerText().catch(() => 'none'));
await buy.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await buy.click();
for (const [ms, tag] of [[350, 'a'], [450, 'b'], [900, 'c']]) { await page.waitForTimeout(ms); await page.screenshot({ path: `${outdir}/shot3-shop-${tag}-phone.png` }); }
console.log('balance text', (await page.locator('body').innerText()).match(/\d+\s*GP/g)?.slice(0, 3));
await browser.close();
