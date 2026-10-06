// Stages a goblin-raid quest for QA Class A in the given status, with heartbeats from the three students.
// node quest-stage.mjs <play|result|done>
import { chromium } from '/home/daniebo/Desktop/advantage-forge/node_modules/playwright/index.mjs';
const BASE = 'http://localhost:3000';
const PASSWORD = 'QaTest!2026x';
const target = process.argv[2] ?? 'play';
const T = { timeout: 180000 };
const browser = await chromium.launch();
const teacher = await browser.newContext();
console.log('teacher login', (await teacher.request.post(`${BASE}/api/auth/login`, { data: { username: 'qa-teacher-a', password: PASSWORD } })).status());
const page = await teacher.newPage();
await page.goto(`${BASE}/en/teacher/quest`, { waitUntil: 'networkidle', timeout: 180000 });
const options = await page.evaluate(() => [...document.querySelectorAll('select option')].map((o) => [o.value, o.textContent]));
const classA = options.find(([, label]) => /QA Class A/.test(label ?? ''))?.[0];
console.log('classes', JSON.stringify(options), 'classA', classA);
let questId = null;
const existing = await page.evaluate(() => document.body.innerText);
const liveLink = await page.evaluate(() => [...document.querySelectorAll('a[href*="/teacher/quest/"]')].map((a) => a.getAttribute('href')));
console.log('live links', liveLink, 'text', existing.slice(0, 200).replace(/\n/g, ' | '));
const fromLink = liveLink.map((h) => h.match(/quest\/([0-9a-f-]{36})/)?.[1]).find(Boolean);
if (fromLink) questId = fromLink;
if (!questId && classA) {
  const battleAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  const res = await teacher.request.post(`${BASE}/api/v1/quest`, { data: { templateId: 'goblin-raid', classId: classA, battleAt }, ...T });
  const body = await res.json().catch(() => ({}));
  console.log('assign', res.status(), JSON.stringify(body).slice(0, 300));
  questId = body.id ?? body.quest?.id ?? null;
}
if (!questId) { console.log('no quest'); await browser.close(); process.exit(1); }
const stateRes = await teacher.request.get(`${BASE}/api/v1/quest/${questId}/state`, T);
let state = await stateRes.json();
console.log('status now', state.quest?.status, 'target', state.target);
const order = ['open', 'rally', 'play', 'result', 'done'];
for (const next of order.slice(order.indexOf(state.quest.status) + 1, order.indexOf(target) + 1)) {
  const r = await teacher.request.post(`${BASE}/api/v1/quest/${questId}/status`, { data: { status: next }, ...T });
  console.log('move', next, r.status());
  if (next === 'play') {
    const beats = { 'qa-student-a1': { answered: 10, correct: 8, hp: 4, damage: 12 }, 'qa-student-a2': { answered: 7, correct: 5, hp: 3, damage: 8 }, 'qa-student-a3': { answered: 4, correct: 4, hp: 5, damage: 6 } };
    for (const [username, beat] of Object.entries(beats)) {
      const ctx = await browser.newContext();
      await ctx.request.post(`${BASE}/api/auth/login`, { data: { username, password: PASSWORD } });
      const b = await ctx.request.post(`${BASE}/api/v1/quest/heartbeat`, { data: { questId, runId: null, ...beat, powerUpsUsed: [] }, ...T });
      console.log('beat', username, b.status());
      await ctx.close();
    }
  }
}
state = await (await teacher.request.get(`${BASE}/api/v1/quest/${questId}/state`, T)).json();
console.log('QUEST', questId, 'status', state.quest.status, 'committed', state.committed, 'pending', state.pending, 'present', state.students.filter((s) => s.present).length);
await browser.close();
