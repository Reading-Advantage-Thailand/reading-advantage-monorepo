import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runSyncPrintKit } from "../print/sync.js";

const STYLES = `import { ThemeColors } from './types';
export function getPrintStyles(theme: ThemeColors, opts: { pageSize?: string; cover?: boolean } = {}): string {
  const { pageSize = '210mm 285mm', cover = true } = opts;
  return \`@page { size: \${pageSize}; margin: 20mm; } h1 { color: \${theme.primary}; border: 1px solid \${theme.secondary}; background: \${theme.gradient}; } \${cover ? '.cover{}' : ''}\`;
}`;

let root: string;
let wb: string;
let app: string;
const git = (cwd: string, ...a: string[]) =>
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd, encoding: "utf8" }).trim();

function put(rel: string, text: string) {
  const f = join(wb, rel);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, text);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "kit-"));
  wb = join(root, "workbooks");
  app = join(root, "app");
  mkdirSync(wb);
  mkdirSync(app);
  git(wb, "init", "-q");
  git(app, "init", "-q");
  put("dashboard/templates/primary_template.html", "<div>{{title}}</div>");
  put("dashboard/lib/document-wrapper/icons.ts", "/* ISC License */\nexport const x = 1;");
  put("dashboard/lib/document-wrapper/styles.ts", STYLES);
  put("dashboard/lib/document-wrapper/utils.ts", "export const y = 2;");
  put("dashboard/assets/print-fonts/open-sans-latin-400-normal.woff2", "font");
  put("dashboard/assets/print-fonts/OFL-open-sans.txt", "OFL");
  put("dashboard/assets/print-fonts/README.md", "skip me");
  put("other.txt", "a");
  git(wb, "add", "-A");
  git(wb, "commit", "-qm", "c1");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const run = (...extra: string[]) => runSyncPrintKit(["--workbooks", wb, "--repo-root", app, ...extra]);

describe("sync-print-kit", () => {
  it("copies the allowlisted files and records the commit", async () => {
    expect(await run()).toBe(0);
    const kit = readFileSync(join(app, "packages/domain/src/primary-books/print/kit.generated.ts"), "utf8");
    expect(kit).toContain(git(wb, "rev-parse", "HEAD"));
    expect(kit).toContain("__THEME_PRIMARY__");
    expect(kit).toContain("210mm 297mm");
    expect(kit).not.toContain(".cover{}");
    expect(existsSync(join(app, "apps/primary-advantage/public/print-fonts/open-sans-latin-400-normal.woff2"))).toBe(true);
    expect(existsSync(join(app, "apps/primary-advantage/public/print-fonts/OFL-open-sans.txt"))).toBe(true);
    expect(existsSync(join(app, "apps/primary-advantage/public/print-fonts/README.md"))).toBe(false);
  });

  it("--check passes for the same commit and exits 1 for a newer kit commit", async () => {
    await run();
    git(app, "add", "-A");
    git(app, "commit", "-qm", "kit");
    expect(await run("--check")).toBe(0);
    put("other.txt", "b");
    git(wb, "commit", "-qam", "unrelated");
    expect(await run("--check")).toBe(0);
    put("dashboard/templates/primary_template.html", "<div>new</div>");
    git(wb, "commit", "-qam", "template");
    expect(await run("--check")).toBe(1);
  });

  it("stops when a kit path is dirty", async () => {
    await run();
    git(app, "add", "-A");
    git(app, "commit", "-qm", "kit");
    writeFileSync(join(app, "apps/primary-advantage/public/print-fonts/OFL-open-sans.txt"), "edited");
    expect(await run()).toBe(2);
  });

  it("stops when a kit path of the Workbooks checkout is dirty", async () => {
    put("dashboard/templates/primary_template.html", "<div>uncommitted</div>");
    expect(await run()).toBe(2);
    expect(existsSync(join(app, "packages/domain/src/primary-books/print/kit.generated.ts"))).toBe(false);
  });

  it("--fixture copies the print data and the golden body from a Workbooks commit", async () => {
    put("content/primary/b1/print/p05.json", JSON.stringify({ lessonNumber: 5 }));
    put("content/primary/b1/print/p06.json", JSON.stringify({ lessonNumber: 6 }));
    put("content/primary/b1/print/golden/lesson-05-no-key.html", "<html><head>HEAD</head>\n<body>\nBODY5\n</body></html>");
    git(wb, "add", "-A");
    git(wb, "commit", "-qm", "export");
    const commit = git(wb, "rev-parse", "--short", "HEAD");
    expect(await run("--fixture", "b1/5", "--commit", commit)).toBe(0);
    const dir = join(app, "packages/domain/src/primary-books/print/__fixtures__");
    expect(readFileSync(join(dir, `b1-5@${commit}.json`), "utf8")).toContain('"lessonNumber":5');
    expect(readFileSync(join(dir, `b1-5-no-key-body@${commit}.html`), "utf8").trim()).toBe("BODY5");
    expect(await run("--fixture", "b1/9", "--commit", commit)).toBe(2);
    expect(await run("--fixture", "b1/5")).toBe(2);
  });
});
