import { chromium } from '/home/daniebo/Desktop/advantage-forge/node_modules/playwright/index.mjs';
const BASE = 'http://localhost:3000';
const [questId, status] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.request.post(`${BASE}/api/auth/login`, { data: { username: 'qa-teacher-a', password: 'QaTest!2026x' } });
const r = await ctx.request.post(`${BASE}/api/v1/quest/${questId}/status`, { data: { status }, timeout: 180000 });
console.log('move', status, r.status(), (await r.text()).slice(0, 200));
await browser.close();
