/**
 * Captures the page pairs of one app (spec FR-8).
 *
 * Usage: npx tsx scripts/primary-parity/capture.ts --app legacy|new --base <url> --pairs <file> \
 *   --accounts <file> --out <folder> [--handout <csv>] [--state-dir <folder>]
 * For the new app, set NEW_DATABASE_URL when a pair path uses `{map:...}`. Run the legacy and the new app
 * one at a time (runbook). The script signs in once for each role, then saves for each pair, width, and scheme:
 * `<out>/<member>/<pair>/<app>-<width>-<scheme>.png` and `.txt`, plus `capture-<app>.json`.
 */
import { chmodSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { chromium, type BrowserContext, type Page } from "playwright";
import postgres from "postgres";
import { AccountsFile, requireRoles, type AccountsFileData } from "./accounts-file.js";
import { assertLocalBaseUrl, assertOutsideRepository } from "./guards.js";
import { PairList, resolvePlaceholders, type PairData } from "./pairs.js";
import {
  gotoRetry,
  readClassSheetPassword,
  signInLegacyStaff,
  signInLegacyStudent,
  signInNewStaff,
  signInNewStudent,
  temporaryPasswordOf,
} from "./sign-in.js";

/** Steps module of a pair: a behavior that needs clicks. */
interface StepsModule {
  legacy?: (page: Page) => Promise<void>;
  new?: (page: Page) => Promise<void>;
}

/**
 * Loads the id map for the `{map:...}` placeholders of the pair paths from the new clone.
 * @param paths The new paths of the pairs.
 * @param databaseUrl The URL of the new clone.
 * @returns A lookup of the new id for a legacy table and id.
 */
export async function loadIdMap(paths: string[], databaseUrl: string | undefined): Promise<(table: string, legacyId: string) => string | undefined> {
  const wanted = paths.flatMap((p) => [...p.matchAll(/\{map:([^:{}]+):([^{}:\s]+)\}/g)].map((m) => [m[1], m[2]] as const));
  if (!wanted.length) return () => undefined;
  if (!databaseUrl) throw new Error("Set NEW_DATABASE_URL: a pair path uses {map:...}.");
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const found = new Map<string, string>();
    for (const [table, legacyId] of wanted) {
      const rows = await sql`select new_id from primary_legacy_id_map where table_name = ${table} and legacy_id = ${legacyId}`;
      if (rows[0]) found.set(`${table}:${legacyId}`, rows[0].new_id as string);
    }
    return (table, legacyId) => found.get(`${table}:${legacyId}`);
  } finally {
    await sql.end();
  }
}

function writePrivate(file: string, data: string): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, data, { mode: 0o600 });
  chmodSync(file, 0o600);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      app: { type: "string" },
      base: { type: "string" },
      pairs: { type: "string" },
      accounts: { type: "string" },
      out: { type: "string" },
      handout: { type: "string" },
      "state-dir": { type: "string" },
    },
  });
  const { app, base, pairs: pairsFile, accounts: accountsFile, out } = values;
  if ((app !== "legacy" && app !== "new") || !base || !pairsFile || !accountsFile || !out) {
    throw new Error("Usage: capture.ts --app legacy|new --base <url> --pairs <file> --accounts <file> --out <folder>");
  }
  assertLocalBaseUrl(base);
  assertOutsideRepository([join(out, "x"), accountsFile]);

  const list = PairList.parse(JSON.parse(readFileSync(pairsFile, "utf8")));
  const accounts: AccountsFileData = AccountsFile.parse(JSON.parse(readFileSync(accountsFile, "utf8")));
  const entries = requireRoles(accounts, [...list.pairs.map((p) => p.role), ...(app === "new" && list.pairs.some((p) => p.role === "STUDENT") ? ["TEACHER"] : [])]);
  const folder = join(out, list.member);
  const stateDir = values["state-dir"] ?? join(out, "..", "state");

  const idMap = app === "new" ? await loadIdMap(list.pairs.map((p) => p.newPath), process.env.NEW_DATABASE_URL) : (_t: string, id: string) => id;
  const users = Object.fromEntries(Object.entries(entries).map(([role, e]) => [role, e!.userId]));

  const browser = await chromium.launch({
    executablePath: process.env.PARITY_CHROME ?? (existsSync("/opt/google/chrome/chrome") ? "/opt/google/chrome/chrome" : undefined),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  const newContext = () => browser.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 } });
  const contexts = new Map<string, BrowserContext>();

  /** Returns the signed-in context of a role, or a plain context for PUBLIC. */
  async function contextFor(role: PairData["role"]): Promise<BrowserContext> {
    const cached = contexts.get(role);
    if (cached) return cached;
    const ctx = await newContext();
    if (role !== "PUBLIC") {
      const entry = entries[role]!;
      if (app === "legacy") {
        await (role === "STUDENT" ? signInLegacyStudent : signInLegacyStaff)(ctx, base!, entry);
      } else if (role === "STUDENT") {
        if (!entries.TEACHER || !entry.new.classroomId) throw new Error("new STUDENT sign-in needs the TEACHER entry and a classroomId");
        const teacherCtx = await contextFor("TEACHER");
        const password = await readClassSheetPassword(teacherCtx, base!, entry.new.classroomId, entry.new.username);
        await signInNewStudent(ctx, base!, entry.new.username, password);
      } else {
        const handout = values.handout;
        const fresh = await signInNewStaff(ctx, base!, entry, handout ? () => temporaryPasswordOf(handout, entry.new.username) : undefined);
        if (fresh) {
          entry.new.password = fresh;
          writePrivate(accountsFile!, JSON.stringify(accounts, null, 2));
        }
      }
      writePrivate(join(stateDir, `${app}-${role}.json`), JSON.stringify(await ctx.storageState()));
    }
    contexts.set(role, ctx);
    return ctx;
  }

  const result: Record<string, { status: number; finalUrl: string; consoleErrors: number; shots: Record<string, { png: string; txt: string }> }> = {};
  try {
    // The TEACHER context must exist before a new STUDENT sign-in; the loop order does not matter.
    for (const pair of list.pairs) {
      const path = resolvePlaceholders(app === "legacy" ? pair.legacyPath : pair.newPath, { map: idMap, users });
      const ctx = await contextFor(pair.role);
      const page = await ctx.newPage();
      let consoleErrors = 0;
      page.on("console", (m) => m.type() === "error" && consoleErrors++);
      const record = { status: 0, finalUrl: "", consoleErrors: 0, shots: {} as Record<string, { png: string; txt: string }> };
      for (const width of pair.widths) {
        for (const scheme of pair.colorSchemes) {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: scheme });
          const response = await gotoRetry(page, `${base}${path}`);
          const selector = pair.waitFor?.[app];
          if (selector) await page.waitForSelector(selector, { timeout: 30000 }).catch(() => {});
          if (pair.steps) {
            const mod = (await import(pathToFileURL(resolve(dirname(pairsFile), pair.steps)).href)) as StepsModule;
            await mod[app]?.(page);
          }
          const png = `${pair.id}/${app}-${width}-${scheme}.png`;
          const txt = png.replace(/\.png$/, ".txt");
          mkdirSync(join(folder, pair.id), { recursive: true, mode: 0o700 });
          await page.screenshot({ path: join(folder, png), fullPage: true });
          const scope = (await page.locator("main").count()) ? page.locator("main").first() : page.locator("body");
          writePrivate(join(folder, txt), await scope.innerText().catch(() => ""));
          record.shots[`${width}-${scheme}`] = { png, txt };
          if (!record.finalUrl) {
            record.status = response?.status() ?? 0;
            record.finalUrl = page.url();
          }
        }
      }
      record.consoleErrors = consoleErrors;
      result[pair.id] = record;
      await page.close();
      console.log(`captured ${pair.id} (${app}): status ${record.status}`);
    }
  } finally {
    await browser.close();
  }
  writePrivate(join(folder, `capture-${app}.json`), JSON.stringify({ app, base, pairs: result }, null, 2));
}

if (typeof require !== "undefined" && require.main === module) {
  main().catch((err) => {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  });
}
