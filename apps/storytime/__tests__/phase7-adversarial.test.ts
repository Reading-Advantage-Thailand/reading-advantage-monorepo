// @vitest-environment node
/**
 * The Phase 7 adversarial cases (track storytime_app_rebuild_20261025; the adversarial gate of
 * Phase 7, run before acceptance).
 *
 * Every row names the defect it would catch. Each check is proven with a mutant of the production
 * code in a scratch copy: the mutant run must show the defect (the kill assertion). No production
 * file is edited; the scratch copies live under `apps/storytime/.adv-scratch/` and are removed in
 * afterAll. A row that pins the current behavior on purpose is marked "characterization".
 *
 * The surfaces:
 *   A. The classifier of `scripts/checks/printed-urls-live.ts`, run as a process against a local
 *      fake server on 127.0.0.1 only (never the live domain) and a fake content folder:
 *      a 3xx with no `Location`; a 301/302/303/307/308 each to the sign-in guard; an absolute
 *      `Location` to another host with a correct-looking `next`; a double-encoded `next`;
 *      an extra parameter on the sign-in location (characterization); the week marker inside an
 *      HTML comment or a script string of a non-week page (characterization); a 200 with an empty
 *      body; a 204; a slow answer (no timeout exists; characterization); zero published weeks
 *      (exit 1); a published week with only one home field.
 *   B. `scripts/review/submit-review-build.sh` in a temporary git repository with a stub gcloud
 *      first on PATH (never the real gcloud): a bad commit; a commit argument with spaces; a
 *      commit argument with a leading dash; a TMPDIR with spaces. A failing archive leaves no
 *      folder and never calls the stub.
 *   C. `scripts/review/live-traffic-guard.ts`: a switch of a second container (characterization:
 *      the guard reads the first container); a template that holds a switch while the revision
 *      does not. The empty-string and the valueFrom rows live in p7-r2-review-switches.test.ts.
 *   D. The teacher day buttons of `app/[locale]/teacher/[level]/[week]/week-view.tsx` and the
 *      `?day=` intake boundary: every button of the shipped weeks opens its own day; the week
 *      contract refuses a day of 0 or 6, so a bad day cannot reach the content; a week with a
 *      day of 6 renders `?day=6` (characterization: the view trusts the contract).
 *
 * Carried, not pinned here: B1002 (the check would send the cookie to an absolute printed URL on
 * another host; today the content holds only relative paths), B1000 (PM-accepted packages/ upload
 * scope), F4/C1003 (Primary page rows deferred:pm).
 *
 * A4: every failing row asserts its input set first and the labeled counts hold floors. A7 analog:
 * the marker rows prove the classifier reads the body, and the day rows prove the buttons read
 * `script.day`. A5: every exit-code claim comes from a run of this file.
 */
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { weekSchema } from "../lib/contracts/week";
import type { StorytimeWeek } from "../lib/contracts/week";

/** The app folder. */
const app = resolve(import.meta.dirname, "..");

/** The repository root. */
const repoRoot = resolve(app, "..", "..");

/** The tsx binary of the monorepo. */
const TSX = resolve(repoRoot, "node_modules/.bin/tsx");

/** The scratch folder that holds the mutant copies; removed in afterAll. */
const scratchDir = join(app, ".adv-scratch");

/** The labeled counts of the rows (A4). */
const counts = {
  checker_runs: 0,
  shell_runs: 0,
  guard_cases: 0,
  view_weeks: 0,
  mutants_killed: 0,
};

afterAll(() => {
  for (const [name, value] of Object.entries(counts)) console.log(`${name}=${value}`);
  rmSync(scratchDir, { recursive: true, force: true });
});

/**
 * Writes a mutant copy of a production file with one-anchor replacements.
 * @param sourcePath The production file to copy.
 * @param name The file name of the copy.
 * @param replacements The anchored replacements: the anchor must sit exactly `occurrences` times.
 * @returns The path of the mutant copy.
 */
function writeMutant(
  sourcePath: string,
  name: string,
  replacements: Array<[string, string]>,
  occurrences = 1,
): string {
  let text = readFileSync(sourcePath, "utf8");
  for (const [anchor, next] of replacements) {
    const found = text.split(anchor).length - 1;
    expect(
      found,
      `the anchor must sit ${occurrences} time(s) in ${sourcePath}, found ${found}: ${anchor.slice(0, 60)}`,
    ).toBe(occurrences);
    text = text.split(anchor).join(next);
  }
  mkdirSync(scratchDir, { recursive: true });
  const target = join(scratchDir, name);
  writeFileSync(target, text);
  return target;
}

// =============================================================================================
// A. The printed-URL classifier
// =============================================================================================

/** The AC-2.3 script under attack. */
const CHECKER = resolve(app, "scripts/checks/printed-urls-live.ts");

/** The week-page marker. */
const WEEK_MARKER = "data-level-week";

/** One recorded request of the fake server. */
interface RecordedRequest {
  /** The method of the request. */
  method: string;
  /** The path and the query of the request. */
  url: string;
}

/** The answer of the fake server for one request. */
interface FakeAnswer {
  /** The status of the answer. */
  status: number;
  /** The `Location` header of the answer, when it is a redirect. */
  location?: string;
  /** The body of the answer. */
  body?: string;
  /** The answer delay in milliseconds. */
  delayMs?: number;
}

/**
 * Starts the local fake server on 127.0.0.1.
 * @param answer The answer for each request.
 * @returns The base URL, the recorded requests, and the stop function.
 */
async function startServer(
  answer: (request: RecordedRequest) => FakeAnswer,
): Promise<{ baseUrl: string; requests: RecordedRequest[]; stop: () => Promise<void> }> {
  const requests: RecordedRequest[] = [];
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      requests.push({ method: request.method ?? "", url: request.url ?? "" });
      const result = answer({ method: request.method ?? "", url: request.url ?? "" });
      const send = () => {
        if (result.location !== undefined) {
          response.writeHead(result.status, { location: result.location });
          response.end();
          return;
        }
        response.writeHead(result.status, { "content-type": "text/html; charset=utf-8" });
        response.end(result.body ?? "");
      };
      if (result.delayMs && result.delayMs > 0) setTimeout(send, result.delayMs);
      else send();
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    stop: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}

/** The temp content folders of the rows; removed at the end. */
const contentFolders: string[] = [];

afterAll(() => {
  for (const folder of contentFolders) rmSync(folder, { recursive: true, force: true });
});

/**
 * Writes a fake content folder with the named weeks.
 * @param weeks The status and the home fields of each week.
 * @returns The absolute path of the folder.
 */
function writeContentFolder(weeks: Array<{ status: string; home: Record<string, string> }>): string {
  const folder = mkdtempSync(join(tmpdir(), "adv-p7-content-"));
  contentFolders.push(folder);
  weeks.forEach((entry, index) => {
    writeFileSync(
      join(folder, `w${String(index + 1).padStart(2, "0")}.json`),
      JSON.stringify({ meta: { status: entry.status, level: 2, week: index + 1 }, home: entry.home }),
    );
  });
  return folder;
}

/** The standard folder of the rows: one published week with two home fields. */
const twoUrlFolder = writeContentFolder([
  { status: "published", home: { songUrl: "/th/st/2/1?part=song", readAlongUrl: "/th/st/2/1?part=book" } },
  { status: "draft", home: { songUrl: "/th/st/2/2?part=song", readAlongUrl: "/th/st/2/2?part=book" } },
]);

/** The printed paths of the standard folder. */
const TWO_PATHS = ["/th/st/2/1?part=song", "/th/st/2/1?part=book"];

/**
 * Runs the checker script as a process against a local base URL.
 * @param scriptPath The script to run (the real one or a mutant copy).
 * @param baseUrl The local base URL of the fake server.
 * @param folder The absolute content folder of the run.
 * @returns The exit code and the printed text.
 */
async function runChecker(
  scriptPath: string,
  baseUrl: string,
  folder: string,
): Promise<{ code: number; output: string }> {
  expect(baseUrl.startsWith("http://127.0.0.1:"), "a row must use a local base URL").toBe(true);
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.STORYTIME_CHECK_COOKIE;
  counts.checker_runs += 1;
  return new Promise((done) => {
    const child = spawn(
      TSX,
      [scriptPath, "--base-url", baseUrl, "--revision", "adv-p7", "--content-folder", folder],
      { cwd: app, env },
    );
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += String(chunk);
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      done({ code: code ?? -1, output });
    });
  });
}

/** The four labeled counts of the last line of the checker. */
interface Summary {
  checked: number;
  rendered: number;
  guarded: number;
  failed: number;
}

/**
 * Reads the four labeled counts of the checker output.
 * @param output The printed text.
 * @returns The four counts.
 */
function summaryOf(output: string): Summary {
  const found = output.match(
    /urls_checked=([0-9]+)\s+urls_rendered=([0-9]+)\s+urls_guarded=([0-9]+)\s+urls_failed=([0-9]+)/,
  );
  expect(found, `no urls_checked line in:\n${output}`).not.toBeNull();
  return {
    checked: Number(found?.[1]),
    rendered: Number(found?.[2]),
    guarded: Number(found?.[3]),
    failed: Number(found?.[4]),
  };
}

/**
 * Builds the sign-in guard location of one requested path.
 * @param path The requested path and query.
 * @returns The location of the locale sign-in with the encoded next.
 */
function guardLocation(path: string): string {
  return `/th/sign-in?next=${encodeURIComponent(path)}`;
}

describe("A. the printed-URL classifier holds at the edges", () => {
  it("A1 a 301/302/303/307/308 to the sign-in guard of the requested path is guarded, exit 3", async () => {
    for (const status of [301, 302, 303, 307, 308]) {
      const server = await startServer((request) => ({ status, location: guardLocation(request.url) }));
      try {
        const run = await runChecker(CHECKER, server.baseUrl, twoUrlFolder);
        expect(summaryOf(run.output), `status=${status}\n${run.output}`).toEqual({
          checked: 2,
          rendered: 0,
          guarded: 2,
          failed: 0,
        });
        expect(run.code, `status=${status} exit ${run.code}`).toBe(3);
      } finally {
        await server.stop();
      }
    }
  });

  it("A2 a 3xx with no Location is failed, exit 1", async () => {
    for (const status of [301, 302, 303, 307, 308]) {
      const server = await startServer(() => ({ status }));
      try {
        const run = await runChecker(CHECKER, server.baseUrl, twoUrlFolder);
        expect(summaryOf(run.output), `status=${status}\n${run.output}`).toEqual({
          checked: 2,
          rendered: 0,
          guarded: 0,
          failed: 2,
        });
        expect(run.code, `status=${status} exit ${run.code}`).toBe(1);
      } finally {
        await server.stop();
      }
    }
  });

  it("A3 an absolute Location to another host with a correct-looking next is failed, exit 1", async () => {
    const server = await startServer((request) => ({
      status: 302,
      location: `https://storytime.example.invalid/th/sign-in?next=${encodeURIComponent(request.url)}`,
    }));
    try {
      const run = await runChecker(CHECKER, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output), run.output).toEqual({ checked: 2, rendered: 0, guarded: 0, failed: 2 });
      expect(run.code, `exit ${run.code}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("A4a a double-encoded next is failed, and A4b an extra parameter on the sign-in location is still guarded", async () => {
    const doubleEncoded = await startServer(
      (request) => ({
        status: 307,
        location: `/th/sign-in?next=${encodeURIComponent(encodeURIComponent(request.url))}`,
      }),
    );
    const extraParam = await startServer((request) => ({
      status: 307,
      location: `${guardLocation(request.url)}&source=printed-qr`,
    }));
    try {
      const runA = await runChecker(CHECKER, doubleEncoded.baseUrl, twoUrlFolder);
      expect(summaryOf(runA.output), `double-encoded\n${runA.output}`).toEqual({
        checked: 2,
        rendered: 0,
        guarded: 0,
        failed: 2,
      });
      expect(runA.code, `double-encoded exit ${runA.code}`).toBe(1);
      const runB = await runChecker(CHECKER, extraParam.baseUrl, twoUrlFolder);
      expect(summaryOf(runB.output), `extra parameter\n${runB.output}`).toEqual({
        checked: 2,
        rendered: 0,
        guarded: 2,
        failed: 0,
      });
      expect(runB.code, `extra parameter exit ${runB.code}`).toBe(3);
    } finally {
      await doubleEncoded.stop();
      await extraParam.stop();
    }
  });

  it("A5 the marker inside an HTML comment or a script string of a non-week page is rendered (characterization)", async () => {
    const bodies = [
      `<html><body><!-- <p ${WEEK_MARKER}></p> --></body></html>`,
      `<html><body><script>window.marker = "${WEEK_MARKER}";</script></body></html>`,
    ];
    for (const body of bodies) {
      const server = await startServer(() => ({ status: 200, body }));
      try {
        const run = await runChecker(CHECKER, server.baseUrl, twoUrlFolder);
        expect(summaryOf(run.output), `body=${body}\n${run.output}`).toEqual({
          checked: 2,
          rendered: 2,
          guarded: 0,
          failed: 0,
        });
        expect(run.code, `exit ${run.code}`).toBe(0);
      } finally {
        await server.stop();
      }
    }
  });

  it("A6 a 200 with an empty body is failed, exit 1", async () => {
    const server = await startServer(() => ({ status: 200, body: "" }));
    try {
      const run = await runChecker(CHECKER, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output), run.output).toEqual({ checked: 2, rendered: 0, guarded: 0, failed: 2 });
      expect(run.code, `exit ${run.code}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("A7 a 204 is failed, exit 1", async () => {
    const server = await startServer(() => ({ status: 204 }));
    try {
      const run = await runChecker(CHECKER, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output), run.output).toEqual({ checked: 2, rendered: 0, guarded: 0, failed: 2 });
      expect(run.code, `exit ${run.code}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("A8 a slow answer still classifies (characterization: the checker has no request timeout)", async () => {
    const server = await startServer(() => ({ status: 200, body: `<p ${WEEK_MARKER}>L2 W1</p>`, delayMs: 800 }));
    try {
      const run = await runChecker(CHECKER, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output), run.output).toEqual({ checked: 2, rendered: 2, guarded: 0, failed: 0 });
      expect(run.code, `exit ${run.code}`).toBe(0);
    } finally {
      await server.stop();
    }
  });

  it("A9 zero published weeks give urls_checked=0 and exit 1", async () => {
    const folder = writeContentFolder([
      { status: "draft", home: { songUrl: "/th/st/2/1?part=song", readAlongUrl: "/th/st/2/1?part=book" } },
    ]);
    const server = await startServer(() => ({ status: 200 }));
    try {
      const run = await runChecker(CHECKER, server.baseUrl, folder);
      expect(summaryOf(run.output), run.output).toEqual({ checked: 0, rendered: 0, guarded: 0, failed: 0 });
      expect(run.code, `exit ${run.code}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("A10 a published week with only one home field checks exactly that URL", async () => {
    const folder = writeContentFolder([
      { status: "published", home: { songUrl: "/th/st/2/1?part=song" } },
    ]);
    const server = await startServer(() => ({ status: 200, body: `<p ${WEEK_MARKER}>L2 W1</p>` }));
    try {
      const run = await runChecker(CHECKER, server.baseUrl, folder);
      expect(server.requests.map((request) => request.url), run.output).toEqual(["/th/st/2/1?part=song"]);
      expect(summaryOf(run.output), run.output).toEqual({ checked: 1, rendered: 1, guarded: 0, failed: 0 });
      expect(run.code, `exit ${run.code}`).toBe(0);
    } finally {
      await server.stop();
    }
  });

  it("A11 control: the standard folder holds two printed URLs and one draft week (A4)", () => {
    expect(TWO_PATHS.length, "two printed URLs").toBe(2);
    const weeks = readdirSync(twoUrlFolder)
      .filter((name) => /^w[0-9]{2}\.json$/.test(name))
      .sort();
    expect(weeks.length, "week files").toBe(2);
  });
});

describe("A mutants: the classifier rows kill a weakened copy", () => {
  const absoluteHostServer = async () =>
    startServer((request) => ({
      status: 302,
      location: `https://storytime.example.invalid/th/sign-in?next=${encodeURIComponent(request.url)}`,
    }));
  const doubleEncodedServer = async () =>
    startServer((request) => ({
      status: 307,
      location: `/th/sign-in?next=${encodeURIComponent(encodeURIComponent(request.url))}`,
    }));
  const emptyBodyServer = async () => startServer(() => ({ status: 200, body: "" }));
  const oneFieldFolder = writeContentFolder([{ status: "published", home: { songUrl: "/th/st/2/1?part=song" } }]);
  const zeroPublishedFolder = writeContentFolder([
    { status: "draft", home: { songUrl: "/th/st/2/1?part=song", readAlongUrl: "/th/st/2/1?part=book" } },
  ]);

  it("M-A1 a mutant that guards any 3xx with a Location is killed by A3", async () => {
    const mutant = writeMutant(CHECKER, "printed-urls.m1.ts", [
      [" && isSignInGuard(location, requestedPath)", ""],
    ]);
    const server = await absoluteHostServer();
    try {
      const run = await runChecker(mutant, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output).guarded, `the mutant must misclassify\n${run.output}`).toBeGreaterThan(0);
      counts.mutants_killed += 1;
    } finally {
      await server.stop();
    }
  });

  it("M-A2 a mutant that accepts any path that ends with /sign-in is killed by A3", async () => {
    const mutant = writeMutant(CHECKER, "printed-urls.m2.ts", [
      ["if (locationPath !== `/${locale}/sign-in`) return false;", 'if (!locationPath.endsWith("/sign-in")) return false;'],
    ]);
    const server = await absoluteHostServer();
    try {
      const run = await runChecker(mutant, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output).guarded, `the mutant must misclassify\n${run.output}`).toBeGreaterThan(0);
      counts.mutants_killed += 1;
    } finally {
      await server.stop();
    }
  });

  it("M-A3 a mutant that decodes the next twice is killed by A4a", async () => {
    const mutant = writeMutant(CHECKER, "printed-urls.m3.ts", [
      [
        'return new URLSearchParams(locationQuery).get("next") === requestedPath;',
        'return decodeURIComponent(new URLSearchParams(locationQuery).get("next") ?? "") === requestedPath;',
      ],
    ]);
    const server = await doubleEncodedServer();
    try {
      const run = await runChecker(mutant, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output).guarded, `the mutant must misclassify\n${run.output}`).toBeGreaterThan(0);
      counts.mutants_killed += 1;
    } finally {
      await server.stop();
    }
  });

  it("M-A4 a mutant that exits 0 on zero checked URLs is killed by A9", async () => {
    const mutant = writeMutant(CHECKER, "printed-urls.m4.ts", [
      ["if (failed > 0 || urls.length === 0) process.exitCode = 1;", "if (failed > 0) process.exitCode = 1;"],
    ]);
    const server = await startServer(() => ({ status: 200 }));
    try {
      const run = await runChecker(mutant, server.baseUrl, zeroPublishedFolder);
      expect(run.code, `the mutant must exit 0 on zero URLs\n${run.output}`).toBe(0);
      counts.mutants_killed += 1;
    } finally {
      await server.stop();
    }
  });

  it("M-A5 a mutant that renders any 200 is killed by A6", async () => {
    const mutant = writeMutant(CHECKER, "printed-urls.m5.ts", [
      [
        'if (status === 200 && body !== undefined && body.includes(WEEK_PAGE_MARKER)) return "rendered";',
        'if (status === 200) return "rendered";',
      ],
    ]);
    const server = await emptyBodyServer();
    try {
      const run = await runChecker(mutant, server.baseUrl, twoUrlFolder);
      expect(summaryOf(run.output).rendered, `the mutant must misclassify\n${run.output}`).toBeGreaterThan(0);
      counts.mutants_killed += 1;
    } finally {
      await server.stop();
    }
  });

  it("M-A6 a mutant that falls back to the week path for a missing home field is killed by A10", async () => {
    const mutant = writeMutant(CHECKER, "printed-urls.m6.ts", [
      ["      if (path) urls.push({ week: name, field, path });", '      urls.push({ week: name, field, path: path ?? "/" });'],
    ]);
    const server = await startServer(() => ({ status: 200, body: `<p ${WEEK_MARKER}>L2 W1</p>` }));
    try {
      const run = await runChecker(mutant, server.baseUrl, oneFieldFolder);
      expect(summaryOf(run.output).checked, `the mutant must check two URLs\n${run.output}`).toBe(2);
      counts.mutants_killed += 1;
    } finally {
      await server.stop();
    }
  });
});

// =============================================================================================
// B. The review build submit script
// =============================================================================================

/** The submit script under attack. */
const SUBMIT_REL = "apps/storytime/scripts/review/submit-review-build.sh";
const SUBMIT_REAL = resolve(repoRoot, SUBMIT_REL);

/** The git environment of the temporary repository. */
const GIT_ENV = {
  NODE_ENV: "test" as const,
  GIT_AUTHOR_NAME: "adv",
  GIT_AUTHOR_EMAIL: "adv@example.invalid",
  GIT_COMMITTER_NAME: "adv",
  GIT_COMMITTER_EMAIL: "adv@example.invalid",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

/**
 * Runs git in a folder.
 * @param cwd The folder.
 * @param args The git arguments.
 * @returns The trimmed stdout.
 */
function git(cwd: string, args: string[]): string {
  const run = spawnSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd,
    env: { PATH: "/usr/bin:/bin", HOME: cwd, ...GIT_ENV },
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${run.stderr}`);
  return run.stdout.trim();
}

/** The fixture of one shell row. */
interface ShellFixture {
  /** The base temp folder. */
  base: string;
  /** The temporary git repository. */
  repoDir: string;
  /** The scratch TMPDIR of the run. */
  scratch: string;
  /** The stub gcloud folder. */
  bin: string;
  /** The stub log. */
  log: string;
  /** The tracked commit. */
  commit: string;
}

/** The shell fixtures of the rows; removed at the end. */
const shellFixtures: ShellFixture[] = [];

afterAll(() => {
  for (const fx of shellFixtures) rmSync(fx.base, { recursive: true, force: true });
});

/**
 * Builds a temporary git repository with a tracked copy of the submit script and a stub gcloud.
 * @returns The fixture.
 */
function makeShellFixture(): ShellFixture {
  const base = mkdtempSync(join(tmpdir(), "adv-p7-submit-"));
  const repoDir = join(base, "repo");
  const scratch = join(base, "tmp");
  const bin = join(base, "bin");
  mkdirSync(repoDir);
  mkdirSync(scratch);
  mkdirSync(bin);
  git(repoDir, ["init", "-q", "-b", "main"]);
  mkdirSync(dirname(join(repoDir, SUBMIT_REL)), { recursive: true });
  copyFileSync(SUBMIT_REAL, join(repoDir, SUBMIT_REL));
  writeFileSync(join(repoDir, "marker.txt"), "committed\n");
  git(repoDir, ["add", "-A"]);
  git(repoDir, ["commit", "-q", "-m", "first"]);
  const commit = git(repoDir, ["rev-parse", "HEAD"]);
  // A dirty working tree file must never reach the upload.
  writeFileSync(join(repoDir, "marker.txt"), "dirty\n");
  writeFileSync(join(repoDir, "untracked-secret.txt"), "secret\n");
  const log = join(base, "gcloud.log");
  writeFileSync(
    join(bin, "gcloud"),
    [
      "#!/bin/bash",
      "{",
      '  echo "CALL cwd=$(pwd -P)"',
      '  for a in "$@"; do echo "ARG=$a"; done',
      '  echo "MARKER=$(cat marker.txt 2>/dev/null)"',
      "} >> \"$FAKE_GCLOUD_LOG\"",
      'exit "${FAKE_GCLOUD_EXIT:-0}"',
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  const fx = { base, repoDir, scratch, bin, log, commit };
  shellFixtures.push(fx);
  return fx;
}

/** The result of one submit run. */
interface ShellRun {
  /** The exit status. */
  status: number | null;
  /** The stderr text. */
  stderr: string;
  /** The stub gcloud call count. */
  calls: number;
  /** The recorded cwd of the stub. */
  cwd: string;
  /** The recorded marker content (proves the committed text, not the dirty one). */
  marker: string;
}

/**
 * Runs the tracked copy of the submit script with the stub gcloud first on PATH.
 * @param fx The fixture.
 * @param options The commit argument, the script text override (a mutant), and the TMPDIR.
 * @returns The run facts.
 */
function runSubmit(
  fx: ShellFixture,
  options: { commit?: string; scriptText?: string; tmpdir?: string } = {},
): ShellRun {
  const scriptPath = join(fx.repoDir, SUBMIT_REL);
  if (options.scriptText !== undefined) writeFileSync(scriptPath, options.scriptText, { mode: 0o755 });
  counts.shell_runs += 1;
  const run = spawnSync("bash", [scriptPath, ...(options.commit !== undefined ? [options.commit] : [])], {
    cwd: fx.repoDir,
    env: {
      PATH: `${fx.bin}:/usr/bin:/bin`,
      HOME: fx.base,
      TMPDIR: options.tmpdir ?? fx.scratch,
      FAKE_GCLOUD_LOG: fx.log,
      ...GIT_ENV,
    },
    encoding: "utf8",
    timeout: 60_000,
  });
  const lines = existsSync(fx.log) ? readFileSync(fx.log, "utf8").split("\n").filter(Boolean) : [];
  return {
    status: run.status,
    stderr: run.stderr,
    calls: lines.filter((line) => line.startsWith("CALL")).length,
    cwd: lines.find((line) => line.startsWith("CALL"))?.match(/cwd=(.*)$/)?.[1] ?? "",
    marker: lines.find((line) => line.startsWith("MARKER="))?.slice(7) ?? "",
  };
}

/** Asserts the facts that a failed archive run must hold. */
function expectArchiveFailure(fx: ShellFixture, run: ShellRun): void {
  expect(run.status, `the script must fail\n${run.stderr}`).not.toBe(0);
  expect(run.calls, "the stub gcloud must never run").toBe(0);
  expect(readdirSync(fx.scratch).length, "no archive folder may survive the trap").toBe(0);
}

describe("B. the submit script holds at the edges", () => {
  it("B1 a bad commit fails, leaves no folder, and never calls gcloud", () => {
    const fx = makeShellFixture();
    const run = runSubmit(fx, { commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" });
    expectArchiveFailure(fx, run);
  });

  it("B2 a commit argument with spaces fails the same way", () => {
    const fx = makeShellFixture();
    const run = runSubmit(fx, { commit: "not a commit" });
    expectArchiveFailure(fx, run);
  });

  it("B3 a commit argument with a leading dash fails, never calls gcloud, and leaks no content", () => {
    const fx = makeShellFixture();
    const escapeTarget = join(fx.base, "escape.tar");
    const run = runSubmit(fx, { commit: `--output=${escapeTarget}` });
    expectArchiveFailure(fx, run);
    // git archive opens the output file before it rejects the usage, so a 0-byte file can sit at
    // the dashed path; the pin is that no repository content reaches it.
    if (existsSync(escapeTarget)) {
      expect(readFileSync(escapeTarget).length, "the dashed path holds no content").toBe(0);
    }
  });

  it("B4 a TMPDIR with spaces works end to end, uploads the committed text, and cleans up", () => {
    const fx = makeShellFixture();
    const spaced = join(fx.base, "tmp with spaces");
    mkdirSync(spaced);
    const run = runSubmit(fx, { tmpdir: spaced });
    expect(run.status, `the script must exit 0\n${run.stderr}`).toBe(0);
    expect(run.calls, "the stub gcloud runs exactly once").toBe(1);
    expect(run.cwd.startsWith(`${realpathSync(spaced)}/`), `cwd=${run.cwd}`).toBe(true);
    expect(run.marker, "the upload holds the committed text").toBe("committed");
    expect(readdirSync(spaced).length, "the archive folder is removed").toBe(0);
  });
});

describe("B mutants: the submit rows kill a weakened copy", () => {
  it("M-B1 a mutant without the cleanup trap is killed by B1 (the folder survives)", () => {
    const fx = makeShellFixture();
    const mutantText = readFileSync(SUBMIT_REAL, "utf8").split('trap \'rm -rf "$work"\' EXIT').join("");
    expect(mutantText, "the anchor must sit once").not.toBe(readFileSync(SUBMIT_REAL, "utf8"));
    const run = runSubmit(fx, { commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef", scriptText: mutantText });
    expect(run.status, `the mutant must still fail\n${run.stderr}`).not.toBe(0);
    expect(
      readdirSync(fx.scratch).length,
      "the defect: the mutant leaves the archive folder behind",
    ).toBeGreaterThan(0);
    counts.mutants_killed += 1;
  });

  it("M-B2 a mutant with an unquoted work path is killed by B4 (a spaced TMPDIR breaks it)", () => {
    const fx = makeShellFixture();
    const real = readFileSync(SUBMIT_REAL, "utf8");
    const anchor = 'git archive "$commit" | tar -x -C "$work"';
    expect(real.split(anchor).length - 1, "the anchor must sit once").toBe(1);
    const mutantText = real.split(anchor).join("git archive \"$commit\" | tar -x -C $work");
    const spaced = join(fx.base, "tmp with spaces");
    mkdirSync(spaced);
    const run = runSubmit(fx, { scriptText: mutantText, tmpdir: spaced });
    expect(run.status, `the defect: the mutant fails on a spaced TMPDIR\n${run.stderr}`).not.toBe(0);
    counts.mutants_killed += 1;
  });

  it("M-B3 a mutant that swallows the archive failure is killed by B1 (gcloud still runs)", () => {
    const fx = makeShellFixture();
    const real = readFileSync(SUBMIT_REAL, "utf8");
    const anchor = 'git archive "$commit" | tar -x -C "$work"';
    expect(real.split(anchor).length - 1, "the anchor must sit once").toBe(1);
    const mutantText = real
      .split(anchor)
      .join('{ git archive "$commit" || true; } | tar -x -C "$work" || true');
    const run = runSubmit(fx, {
      commit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      scriptText: mutantText,
    });
    expect(run.calls, "the defect: the mutant calls gcloud on a failed archive").toBeGreaterThan(0);
    counts.mutants_killed += 1;
  });
});

// =============================================================================================
// C. The live traffic guard
// =============================================================================================

/** The guard module under attack. */
const GUARD = resolve(app, "scripts/review/live-traffic-guard.ts");

const TEACHER_ROUTES = "STORYTIME_TEACHER_ROUTES";

/** One env entry of a describe document. */
interface EnvEntry {
  /** The name of the entry. */
  name: string;
  /** The value of the entry. */
  value?: string;
  /** A reference of the entry. */
  valueFrom?: unknown;
}

/** The input of the guard. */
interface GuardInput {
  /** The env of the revision. */
  revisionEnv: EnvEntry[];
  /** The env of the service template. */
  templateEnv: EnvEntry[];
}

/** The result of the guard. */
interface GuardResult {
  /** True on a pass. */
  ok: boolean;
  /** The message of the run. */
  message: string;
}

/** The shape of the guard module that the rows need. */
interface GuardModule {
  /** The check function. */
  checkLiveTrafficGuard: (input: GuardInput) => GuardResult;
}

/**
 * Imports a guard module (the real one or a mutant copy).
 * @param path The module path.
 * @returns The guard module.
 */
async function loadGuard(path: string): Promise<GuardModule> {
  const mod = (await import(/* @vite-ignore */ pathToFileURL(path).href)) as GuardModule;
  expect(typeof mod.checkLiveTrafficGuard, `checkLiveTrafficGuard missing in ${path}`).toBe("function");
  return mod;
}

/** The clean env of the fixtures. */
function cleanEnv(): EnvEntry[] {
  return [
    { name: "NODE_ENV", value: "production" },
    { name: "STORYTIME_MEDIA_BASE", value: "https://media.example/base" },
  ];
}

/**
 * Builds the revision describe document.
 * @param containers The env entries of each container.
 * @returns The document.
 */
function revisionDoc(containers: EnvEntry[][]): unknown {
  return { spec: { containers: containers.map((env) => ({ env })) } };
}

/**
 * Builds the service describe document.
 * @param templateContainers The env entries of each template container.
 * @returns The document.
 */
function serviceDoc(templateContainers: EnvEntry[][]): unknown {
  return { spec: { template: { spec: { containers: templateContainers.map((env) => ({ env })) } } } };
}

describe("C. the live traffic guard holds at the edges", () => {
  it("C1 a switch of a second container is not read (characterization: the guard reads the first container)", async () => {
    const mod = await loadGuard(GUARD);
    const { envOfRevision, envOfService, checkLiveTrafficGuard } = mod as unknown as GuardModule & {
      envOfRevision: (doc: unknown) => EnvEntry[];
      envOfService: (doc: unknown) => EnvEntry[];
    };
    // A switch in the second container of the revision and of the template: not read.
    const judged = checkLiveTrafficGuard({
      revisionEnv: envOfRevision(revisionDoc([cleanEnv(), [{ name: TEACHER_ROUTES, value: "1" }]])),
      templateEnv: envOfService(serviceDoc([cleanEnv(), [{ name: TEACHER_ROUTES, value: "1" }]])),
    });
    expect(judged.ok, `second-container switch: ${judged.message}`).toBe(true);
    // Control: a switch in the first container of the revision is a hit.
    const first = checkLiveTrafficGuard({
      revisionEnv: envOfRevision(revisionDoc([[...cleanEnv(), { name: TEACHER_ROUTES, value: "1" }]])),
      templateEnv: envOfService(serviceDoc([cleanEnv()])),
    });
    expect(first.ok, `first-container switch: ${first.message}`).toBe(false);
    expect(first.message, "the message names the switch").toContain(TEACHER_ROUTES);
    counts.guard_cases += 1;
  });

  it("C2 a template that holds a switch while the revision does not fails and names the switch", async () => {
    const guard = await loadGuard(GUARD);
    const judged = guard.checkLiveTrafficGuard({
      revisionEnv: cleanEnv(),
      templateEnv: [...cleanEnv(), { name: TEACHER_ROUTES, value: "" }],
    });
    expect(judged.ok, judged.message).toBe(false);
    expect(judged.message, "the message names the switch").toContain(TEACHER_ROUTES);
    expect(judged.message.toLowerCase(), "a template hit says service").toContain("service");
    expect(judged.message, "no value is printed").not.toContain('value');
    counts.guard_cases += 1;
  });

  it("C3 control: the fixtures hold a clean env and a switch name (A4)", () => {
    expect(cleanEnv().length, "clean env entries").toBeGreaterThan(0);
    expect(TEACHER_ROUTES.startsWith("STORYTIME_"), "the switch name").toBe(true);
  });
});

describe("C mutants: the guard rows kill a weakened copy", () => {
  it("M-C1 a mutant that scans every container is killed by C1", async () => {
    const mutant = writeMutant(GUARD, "live-traffic-guard.m1.ts", [
      ["  return envListOf(containers[0]);", "  return containers.flatMap((container) => envListOf(container));"],
    ]);
    const mod = await loadGuard(mutant);
    const { envOfRevision, envOfService } = mod as unknown as {
      envOfRevision: (doc: unknown) => EnvEntry[];
      envOfService: (doc: unknown) => EnvEntry[];
    };
    const judged = mod.checkLiveTrafficGuard({
      revisionEnv: envOfRevision(revisionDoc([cleanEnv(), [{ name: TEACHER_ROUTES, value: "1" }]])),
      templateEnv: envOfService(serviceDoc([cleanEnv(), [{ name: TEACHER_ROUTES, value: "1" }]])),
    });
    expect(judged.ok, "the defect: the mutant fails on a second-container switch").toBe(false);
    counts.mutants_killed += 1;
  });

  it("M-C2 a mutant that reads the template env from the wrong path is killed by C2", async () => {
    const mutant = writeMutant(GUARD, "live-traffic-guard.m2.ts", [
      ['at(doc, "spec", "template", "spec", "containers")', 'at(doc, "spec", "containers")'],
    ]);
    const mod = await loadGuard(mutant);
    const { envOfRevision, envOfService } = mod as unknown as {
      envOfRevision: (doc: unknown) => EnvEntry[];
      envOfService: (doc: unknown) => EnvEntry[];
    };
    const judged = mod.checkLiveTrafficGuard({
      revisionEnv: envOfRevision(revisionDoc([cleanEnv()])),
      templateEnv: envOfService(serviceDoc([[...cleanEnv(), { name: TEACHER_ROUTES, value: "1" }]])),
    });
    expect(judged.ok, "the defect: the mutant passes a template switch").toBe(true);
    counts.mutants_killed += 1;
  });
});

// =============================================================================================
// D. The teacher day buttons and the ?day= intake boundary
// =============================================================================================

/** The teacher week view under attack. */
const WEEK_VIEW = resolve(app, "app/[locale]/teacher/[level]/[week]/week-view.tsx");

/** The real content folder. */
const contentFolder = resolve(app, "content/l2");

/**
 * Renders the teacher week view to static markup.
 * @param week The week of the view.
 * @param label The child view label.
 * @returns The HTML text.
 */
async function renderWeekView(week: StorytimeWeek, label = "Open the child page"): Promise<string> {
  const { TeacherWeekView } = (await import(
    /* @vite-ignore */ pathToFileURL(WEEK_VIEW).href
  )) as typeof import("../app/[locale]/teacher/[level]/[week]/week-view");
  return renderToStaticMarkup(
    TeacherWeekView({ week, locale: "en", mediaUrls: {}, childViewLabel: label }) as ReactElement,
  );
}

/**
 * Lists the child day hrefs of one rendered view.
 * @param html The HTML text.
 * @returns The hrefs that hold a day query, in document order.
 */
function dayHrefsOf(html: string): string[] {
  return [...html.matchAll(/href="(\/en\/st\/[^"]*\?day=[^"]*)"/g)].map((match) => match[1] ?? "");
}

/**
 * Reads every shipped week file.
 * @returns One entry per week file.
 */
function shippedWeeks(): Array<{ name: string; week: StorytimeWeek }> {
  return readdirSync(contentFolder)
    .filter((name) => /^w[0-9]{2}\.json$/.test(name))
    .sort()
    .map((name) => ({
      name,
      week: JSON.parse(readFileSync(join(contentFolder, name), "utf8")) as StorytimeWeek,
    }));
}

describe("D. the teacher day buttons hold at the edges", () => {
  it("D1 every lesson row of every shipped week opens its own day", async () => {
    const weeks = shippedWeeks();
    expect(weeks.length, "week files").toBeGreaterThanOrEqual(8);
    for (const { name, week } of weeks) {
      const scripts = week.scripts;
      expect(scripts.length, `${name}: scripts`).toBeGreaterThan(0);
      for (const script of scripts) {
        expect(
          Number.isInteger(script.day) && script.day >= 1 && script.day <= 5,
          `${name}: script.day ${script.day} is inside 1..5`,
        ).toBe(true);
      }
      const html = await renderWeekView(week);
      const expected = scripts.map(
        (script) => `/en/st/${week.meta.level}/${week.meta.week}?day=${script.day}`,
      );
      expect(dayHrefsOf(html), `${name}: the child buttons`).toEqual(expected);
      counts.view_weeks += 1;
    }
  });

  it("D2 the week contract refuses a day of 0 and a day of 6 (a bad day cannot reach the content)", () => {
    const source = shippedWeeks()[0]!.week;
    const control = weekSchema.safeParse(JSON.parse(JSON.stringify(source)));
    expect(control.success, "the untouched week parses").toBe(true);
    for (const badDay of [0, 6]) {
      const copy = JSON.parse(JSON.stringify(source)) as StorytimeWeek;
      copy.scripts[0]!.day = badDay;
      const parsed = weekSchema.safeParse(copy);
      expect(parsed.success, `day ${badDay} must fail the contract`).toBe(false);
    }
  });

  it("D3 a week with a day of 6 renders ?day=6 (characterization: the view trusts the contract)", async () => {
    const copy = JSON.parse(JSON.stringify(shippedWeeks()[0]!.week)) as StorytimeWeek;
    copy.scripts[1]!.day = 6;
    const html = await renderWeekView(copy);
    const hrefs = dayHrefsOf(html);
    expect(
      hrefs.some((href) => href.endsWith("?day=6")),
      `the view renders the bad day: ${hrefs.join(", ")}`,
    ).toBe(true);
  });
});

describe("D mutants: the day rows kill a weakened copy", () => {
  it("M-D1 a mutant contract that allows a day of 6 is killed by D2", async () => {
    const mutant = writeMutant(resolve(app, "lib/contracts/week.ts"), "week.m1.ts", [
      ['from "../loops"', 'from "../lib/loops"'],
    ]);
    // The day anchor sits twice in the source (the lesson day and the review deck day); widen both.
    const widened = readFileSync(mutant, "utf8")
      .split("day: z.number().int().min(1).max(5),")
      .join("day: z.number().int().min(0).max(6),");
    expect(widened.split("min(0).max(6)").length - 1, "two day anchors widened").toBe(2);
    writeFileSync(mutant, widened);
    const mod = (await import(/* @vite-ignore */ pathToFileURL(mutant).href)) as {
      weekSchema: typeof weekSchema;
    };
    const copy = JSON.parse(JSON.stringify(shippedWeeks()[0]!.week)) as StorytimeWeek;
    copy.scripts[0]!.day = 6;
    expect(
      mod.weekSchema.safeParse(copy).success,
      "the defect: the mutant contract accepts day 6",
    ).toBe(true);
    counts.mutants_killed += 1;
  });

  it("M-D2 a mutant view that hard-codes day 1 is killed by D1 (the original fault)", async () => {
    const mutant = writeMutant(WEEK_VIEW, "week-view.m1.tsx", [
      [
        "href={`/${locale}/st/${level}/${weekNumber}?day=${script.day}`}",
        "href={`/${locale}/st/${level}/${weekNumber}?day=1`}",
      ],
    ]);
    const fixed = writeMutant(mutant, "week-view.m1.fixed.tsx", [
      ['from "../../../../../lib/media/url"', 'from "../lib/media/url"'],
      ['from "../../../../../lib/contracts/week"', 'from "../lib/contracts/week"'],
      ['from "../../../../../lib/teacher-lang"', 'from "../lib/teacher-lang"'],
      ['from "../../../../../lib/word-clip"', 'from "../lib/word-clip"'],
      ['from "../../../../../lib/word-clip-button"', 'from "../lib/word-clip-button"'],
    ]);
    const { TeacherWeekView } = (await import(/* @vite-ignore */ pathToFileURL(fixed).href)) as {
      TeacherWeekView: (props: {
        week: StorytimeWeek;
        locale: string;
        mediaUrls?: Record<string, string>;
        childViewLabel?: string;
      }) => ReactElement;
    };
    const week = shippedWeeks()[0]!.week;
    const html = renderToStaticMarkup(
      TeacherWeekView({ week, locale: "en", mediaUrls: {}, childViewLabel: "Open the child page" }),
    );
    const hrefs = dayHrefsOf(html);
    expect(
      hrefs.every((href) => href.endsWith("?day=1")),
      `the defect: the mutant hard-codes day 1: ${hrefs.join(", ")}`,
    ).toBe(true);
    expect(week.scripts.some((script) => script.day > 1), "the week holds a day above 1").toBe(true);
    counts.mutants_killed += 1;
  });
});
