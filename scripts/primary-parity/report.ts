/**
 * Writes the side-by-side parity report (spec FR-9).
 *
 * Usage: npx tsx scripts/primary-parity/report.ts --pairs <acceptance-pairs.json> --out <folder> [--commit <sha>] [--legacy-db <name>] [--new-db <name>]
 * Reads `<out>/<member>/capture-legacy.json` and `capture-new.json`; writes `report.html` and `report.md`
 * in `<out>/<member>/`. The report holds only the pair list and the captures, never the accounts file.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { PairList, type PairData, type PairListData } from "./pairs.js";

/** One screenshot and its visible text. `png` is relative to the member folder. */
export interface Shot {
  png: string;
  text: string;
}

/** The capture of one pair in one app. Shot keys are `<width>-<scheme>`. */
export interface AppCapture {
  status: number;
  finalUrl: string;
  consoleErrors: number;
  shots: Record<string, Shot>;
}

/** Input of `renderReport`. */
export interface ReportInput {
  list: unknown;
  captures: Record<string, { legacy?: AppCapture; new?: AppCapture }>;
  meta?: { newCommit?: string; legacyDatabase?: string; newDatabase?: string };
}

/** The legacy revision that the kit compares against. */
export const LEGACY_REVISION = "bfea121";

const NOT_CAPTURED = "not captured";

const normalize = (line: string): string => line.replace(/\s+/g, " ").trim();
const lines = (text: string): string[] => text.split("\n").map(normalize).filter(Boolean);

/**
 * Finds the text lines that only one app shows. Spaces are normalized and empty lines are ignored.
 * @param legacy Visible text of the legacy page.
 * @param next Visible text of the new page.
 * @returns The lines only in legacy and the lines only in the new app, in page order.
 */
export function diffLines(legacy: string, next: string): { onlyLegacy: string[]; onlyNew: string[] } {
  const a = lines(legacy);
  const b = lines(next);
  const inB = new Set(b);
  const inA = new Set(a);
  return { onlyLegacy: a.filter((l) => !inB.has(l)), onlyNew: b.filter((l) => !inA.has(l)) };
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function shotKeys(pair: PairData): { key: string; width: number; scheme: string }[] {
  return pair.widths.flatMap((width) => pair.colorSchemes.map((scheme) => ({ key: `${width}-${scheme}`, width, scheme })));
}

/** Text for the diff: the widest shot that both apps have. */
function diffFor(pair: PairData, cap: { legacy?: AppCapture; new?: AppCapture }) {
  const key = shotKeys(pair)
    .sort((x, y) => y.width - x.width)
    .map((k) => k.key)
    .find((k) => cap.legacy?.shots[k] && cap.new?.shots[k]);
  return key ? diffLines(cap.legacy!.shots[key].text, cap.new!.shots[key].text) : undefined;
}

const appLine = (label: string, path: string, c?: AppCapture): string =>
  c ? `${label} path: ${path} (status ${c.status}, final URL ${c.finalUrl}, console errors ${c.consoleErrors})` : `${label} path: ${path} (${NOT_CAPTURED})`;

/**
 * Renders the report as markdown and as a self-contained HTML page.
 * @param input The pair list, the captures of each pair, and optional run data (commit, copy names).
 * @returns The markdown text and the HTML text. Image paths are relative; the HTML loads nothing from the network.
 */
export function renderReport(input: ReportInput): { markdown: string; html: string } {
  const list: PairListData = PairList.parse(input.list);
  const meta = input.meta ?? {};
  const head = `Legacy revision: ${LEGACY_REVISION} | New commit: ${meta.newCommit ?? "unknown"} | Copies: ${meta.legacyDatabase ?? "unknown"}, ${meta.newDatabase ?? "unknown"}`;
  const md: string[] = [`# Parity report: ${list.member}`, "", head];
  const html: string[] = [
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Parity report ${esc(list.member)}</title><style>${CSS}</style></head><body>`,
    `<h1>Parity report: ${esc(list.member)}</h1><p class="meta">${esc(head)}</p>`,
  ];

  for (const pair of list.pairs) {
    const cap = input.captures[pair.id] ?? {};
    const rows = pair.rows.join(", ");
    md.push("", `## ${pair.id}`, "", `Rows: ${rows} | Role: ${pair.role}`, "", appLine("Legacy", pair.legacyPath, cap.legacy), "", appLine("New", pair.newPath, cap.new));
    html.push(
      `<h2>${esc(pair.id)}</h2><p class="meta">Rows: ${esc(rows)} | Role: ${esc(pair.role)}<br>${esc(appLine("Legacy", pair.legacyPath, cap.legacy))}<br>${esc(appLine("New", pair.newPath, cap.new))}</p>`,
    );
    for (const { key, width, scheme } of shotKeys(pair)) {
      md.push("", `### ${width} px, ${scheme}`, "");
      html.push(`<h3>${width} px, ${esc(scheme)}</h3><div class="side">`);
      for (const [label, app] of [["Legacy", cap.legacy], ["New", cap.new]] as const) {
        const shot = app?.shots[key];
        md.push(shot ? `- ${label}: ![${label} ${key}](${shot.png})` : `- ${label}: ${NOT_CAPTURED}`);
        html.push(
          `<figure><figcaption>${label}</figcaption>${shot ? `<img src="${esc(shot.png)}" alt="${label} capture ${esc(key)}">` : `<span class="none">${NOT_CAPTURED}</span>`}</figure>`,
        );
      }
      html.push("</div>");
    }
    const diff = diffFor(pair, cap);
    md.push("", "### Text differences", "");
    html.push("<h3>Text differences</h3>");
    if (diff) {
      const block = (l: string[]) => (l.length ? l.join("\n") : "(none)");
      md.push("Only in legacy:", "", "```", block(diff.onlyLegacy), "```", "", "Only in new:", "", "```", block(diff.onlyNew), "```");
      html.push(`<div class="diff"><div><strong>Only in legacy</strong><pre>${esc(block(diff.onlyLegacy))}</pre></div><div><strong>Only in new</strong><pre>${esc(block(diff.onlyNew))}</pre></div></div>`);
    } else {
      md.push(NOT_CAPTURED);
      html.push(`<p class="none">${NOT_CAPTURED}</p>`);
    }
    md.push("", "### Checklist", "", "| Check | Behavior | Result | Note |", "| --- | --- | --- | --- |");
    html.push('<h3>Checklist</h3><table><tr><th>Check</th><th>Observable behavior</th><th>Result</th><th>Note</th></tr>');
    for (const c of pair.checks) {
      md.push(`| ${cell(c.id)} | ${cell(c.behavior)} |  |  |`);
      html.push(`<tr><td>${esc(c.id)}</td><td>${esc(c.behavior)}</td><td></td><td></td></tr>`);
    }
    html.push("</table>");
  }
  html.push("</body></html>");
  return { markdown: md.join("\n") + "\n", html: html.join("\n") + "\n" };
}

const CSS =
  "body{font:15px/1.5 system-ui,sans-serif;margin:0 auto;max-width:1100px;padding:24px;color:#1b1f24}h1{font-size:22px}h2{font-size:18px;margin-top:40px;border-top:2px solid #ccd;padding-top:16px}.meta{color:#555}.side,.diff{display:grid;grid-template-columns:1fr 1fr;gap:16px}.side figure{margin:0;border:1px solid #ccd;padding:8px;border-radius:4px}figcaption{font-weight:600;margin-bottom:6px}img{max-width:100%;height:auto;display:block}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#eef}pre{background:#f5f5f8;padding:8px;white-space:pre-wrap;margin:0}.none{color:#a00;font-style:italic}";

/** The shape of `capture-<app>.json` that `capture.ts` writes. */
interface CaptureFile {
  pairs: Record<string, { status: number; finalUrl: string; consoleErrors: number; shots: Record<string, { png: string; txt: string }> }>;
}

function loadApp(folder: string, app: "legacy" | "new"): Record<string, AppCapture> {
  const file = join(folder, `capture-${app}.json`);
  if (!existsSync(file)) return {};
  const data = JSON.parse(readFileSync(file, "utf8")) as CaptureFile;
  return Object.fromEntries(
    Object.entries(data.pairs).map(([id, p]) => [
      id,
      {
        ...p,
        shots: Object.fromEntries(
          Object.entries(p.shots).map(([k, s]) => [k, { png: s.png, text: existsSync(join(folder, s.txt)) ? readFileSync(join(folder, s.txt), "utf8") : "" }]),
        ),
      },
    ]),
  );
}

function main(): void {
  const { values } = parseArgs({ options: { pairs: { type: "string" }, out: { type: "string" }, commit: { type: "string" }, "legacy-db": { type: "string" }, "new-db": { type: "string" } } });
  if (!values.pairs || !values.out) throw new Error("Usage: report.ts --pairs <file> --out <folder> [--commit <sha>] [--legacy-db <name>] [--new-db <name>]");
  const list = PairList.parse(JSON.parse(readFileSync(values.pairs, "utf8")));
  const folder = join(values.out, list.member);
  const legacy = loadApp(folder, "legacy");
  const next = loadApp(folder, "new");
  const captures = Object.fromEntries(list.pairs.map((p) => [p.id, { legacy: legacy[p.id], new: next[p.id] }]));
  const { markdown, html } = renderReport({ list, captures, meta: { newCommit: values.commit, legacyDatabase: values["legacy-db"], newDatabase: values["new-db"] } });
  writeFileSync(join(folder, "report.md"), markdown);
  writeFileSync(join(folder, "report.html"), html);
  console.log(`Wrote ${join(folder, "report.html")} and report.md`);
}

if (typeof require !== "undefined" && require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(1);
  }
}
