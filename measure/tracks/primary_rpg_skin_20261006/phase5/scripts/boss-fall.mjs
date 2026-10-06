// Brings the boss of a quest down with real completions: each QA student starts a challenge run
// and posts one completion through the normal API path, until the committed damage reaches the
// target. Then the quest moves to `result`, where the projector shows the fall.
// node boss-fall.mjs <questId> [correctPerStudent]
import { chromium } from '/home/daniebo/Desktop/advantage-forge/node_modules/playwright/index.mjs';
const BASE = 'http://localhost:3000';
const PASSWORD = 'QaTest!2026x';
const STUDENTS = ['qa-student-a1', 'qa-student-a2', 'qa-student-a3'];
const [questId, perStudentArg] = process.argv.slice(2);
if (!questId) { console.log('usage: node boss-fall.mjs <questId> [correctPerStudent]'); process.exit(1); }
const T = { timeout: 180000 };
const browser = await chromium.launch();
const teacher = await browser.newContext();
console.log('teacher login', (await teacher.request.post(`${BASE}/api/auth/login`, { data: { username: 'qa-teacher-a', password: PASSWORD } })).status());
const read = async () => (await teacher.request.get(`${BASE}/api/v1/quest/${questId}/state`, T)).json();
let state = await read();
console.log('quest', state.quest?.status, 'challenge', state.quest?.challengeId, 'target', state.target, 'committed', state.committed);
const order = ['open', 'rally', 'play', 'result', 'done'];
for (const next of order.slice(order.indexOf(state.quest.status) + 1, order.indexOf('play') + 1)) {
  console.log('move', next, (await teacher.request.post(`${BASE}/api/v1/quest/${questId}/status`, { data: { status: next }, ...T })).status());
}
// Enough correct answers per student to pass the target: 2 damage per correct answer (3 with a sharp blade).
const perStudent = Number(perStudentArg) || Math.ceil(state.target / (2 * STUDENTS.length));
for (const username of STUDENTS) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { origin: BASE } }); // the apk routes accept same-origin POSTs only
  await ctx.request.post(`${BASE}/api/auth/login`, { data: { username, password: PASSWORD } });
  const run = await ctx.request.post(`${BASE}/api/v1/apk/challenges/runs`, { data: { challengeId: state.quest.challengeId }, ...T });
  const launch = await run.json().catch(() => ({}));
  console.log('run', username, run.status(), launch.runId ?? JSON.stringify(launch).slice(0, 200));
  if (!launch.runId) { await ctx.close(); continue; }
  const beat = await ctx.request.post(`${BASE}/api/v1/quest/heartbeat`, { data: { questId, runId: launch.runId, answered: perStudent + 1, correct: perStudent, hp: 4, damage: perStudent * 2, powerUpsUsed: [] }, ...T });
  const done = await ctx.request.post(`${BASE}/api/v1/apk/complete`, {
    data: {
      gameType: 'wizard-vs-zombie', difficulty: 'medium', score: perStudent * 100, accuracy: perStudent / (perStudent + 1),
      correctAnswers: perStudent, totalAttempts: perStudent + 1, duration: 90, victory: true,
      idempotencyKey: crypto.randomUUID(), challengeRunId: launch.runId, clientTimestamp: Date.now(),
    },
    ...T,
  });
  console.log('beat', beat.status(), 'complete', username, done.status(), JSON.stringify(await done.json().catch(() => ({}))).slice(0, 160));
  await ctx.close();
}
state = await read();
console.log('committed', state.committed, 'target', state.target, state.committed >= state.target ? 'BOSS DOWN' : 'boss still up');
if (state.committed >= state.target) console.log('move result', (await teacher.request.post(`${BASE}/api/v1/quest/${questId}/status`, { data: { status: 'result' }, ...T })).status());
state = await read();
console.log('QUEST', questId, 'status', state.quest.status, 'committed', state.committed);
await browser.close();
