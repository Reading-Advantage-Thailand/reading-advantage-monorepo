// Continuation: CSV upload gate re-test after roles reference data fix.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.dirname(new URL(import.meta.url).pathname);
const PASS = "QaTest!2026x";

const browser = await chromium.launch({ channel: "chrome" });

async function login(ctx, username) {
  const r = await ctx.request.post(`${BASE}/api/auth/login`, { data: { username, password: PASS } });
  console.log(`login ${username}: ${r.status()}`);
}

async function uploadCsv(ctx, filePath) {
  return ctx.request.post(`${BASE}/api/upload/csv`, {
    multipart: { file: { name: "students.csv", mimeType: "text/csv", buffer: fs.readFileSync(filePath) } },
  });
}
async function showJson(page, obj, shot) {
  await page.goto(`data:text/html,<pre>${encodeURIComponent(JSON.stringify(obj, null, 2))}</pre>`);
  await page.screenshot({ path: path.join(OUT, shot) });
  console.log(`screenshot: ${shot}`);
}

const csvPath = path.join(OUT, "fixtures", "students.csv");

// Admin session: first upload + re-upload.
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();
await login(ctx, "qa-admin-b");
let resp = await uploadCsv(ctx, csvPath);
let json = await resp.json();
console.log(`admin first upload: ${resp.status()} ${JSON.stringify(json)}`);
fs.writeFileSync(path.join(OUT, "api-upload-csv-first.json"), JSON.stringify({ status: resp.status(), body: json }, null, 2));
await showJson(page, json, "t1-11-api-upload-csv-first.png");

resp = await uploadCsv(ctx, csvPath);
json = await resp.json();
console.log(`admin re-upload: ${resp.status()} ${JSON.stringify(json)}`);
fs.writeFileSync(path.join(OUT, "api-upload-csv-reupload.json"), JSON.stringify({ status: resp.status(), body: json }, null, 2));
await showJson(page, json, "t1-12-api-upload-csv-reupload.png");
await ctx.close();

// Teacher session: same re-upload must be allowed by policy (no new users).
const ctx2 = await browser.newContext({ baseURL: BASE });
const page2 = await ctx2.newPage();
await login(ctx2, "qa-teacher-b");
resp = await uploadCsv(ctx2, csvPath);
json = await resp.json();
console.log(`teacher re-upload: ${resp.status()} ${JSON.stringify(json)}`);
fs.writeFileSync(path.join(OUT, "api-upload-csv-teacher.json"), JSON.stringify({ status: resp.status(), body: json }, null, 2));
await showJson(page2, json, "t1-12b-api-upload-csv-teacher.png");
await ctx2.close();

await browser.close();
