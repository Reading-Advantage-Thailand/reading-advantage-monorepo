// @vitest-environment node
// Task 7.4 of Phase 7: the AC-2.3 live check of the printed URLs.
//
// The script is `apps/storytime/scripts/checks/printed-urls-live.ts`. This file is its contract.
// Task 7.13 (group r5, Review C findings C1001 and C1002) changed the contract: the rows that
// pinned the follow form and the all-week form are replaced (the plan lists them).
// Task 7.15 (group r6, Review B finding B1002) pins the same-host rule of the check cookie: the
// rows are listed in the plan under "Phase 7 remediation group r6".
//
// Contract of `printed-urls-live.ts`:
//   - The script reads the week content of the app: the week files under `apps/storytime/content/l2`
//     (the flag `--content-folder <path>` names another folder, so a test can use a fake folder)
//     and the `home.songUrl` and `home.readAlongUrl` fields of the PUBLISHED weeks only (AC-2.3,
//     spec.md:108). A draft week answers 404 on the live domain (spec.md:101), so the script never
//     requests a draft week. Today one week is published, so the run requests 2 URLs.
//   - The base URL is `https://storytime.reading-advantage.com` by default. The flag
//     `--base-url <url>` sets another base URL, so a test can use a local fake server. The flag
//     `--revision <label>` sets the revision label of the run.
//   - The script sends one GET per printed URL and never follows a redirect (`redirect: "manual"`):
//     the fake server sees exactly one request per URL. It sends no body and no other request.
//   - The script classifies each answer:
//       rendered: status 200 and the body holds the week-page marker `data-level-week` (the
//                 `<p data-level-week>` of `app/[locale]/frame.tsx:67`; only the week pages render
//                 the Frame, so the sign-in page has no such marker);
//       guarded:  a 3xx whose `Location` is the sign-in path of the locale of the requested path
//                 (`/<locale>/sign-in`) with `next` equal to the requested path and query;
//       failed:   anything else (a 200 without the marker such as the sign-in page, a 404, a 5xx,
//                 a redirect elsewhere or with another `next`, a network error).
//   - The optional environment variable `STORYTIME_CHECK_COOKIE` is sent as the `Cookie` header of
//     a request only when the host of the requested URL equals the host of the base URL (task 7.15,
//     Review B B1002; `URL.host` compares host and port, so an absolute printed URL on another
//     port of 127.0.0.1 is another host and gets no cookie). The script never prints the value.
//   - The script prints one line per URL: the URL, `status=<n>` (`000` for a network error), and
//     `class=<rendered|guarded|failed>`. It prints the time of the run and the revision label. The
//     last line is `urls_checked=<n> urls_rendered=<n> urls_guarded=<n> urls_failed=<n>`.
//   - Exit code: 0 when every URL is rendered; 3 when none failed and at least one is guarded (a
//     session is needed to prove the page); 1 when any URL failed.
//
// The test uses a local fake server and a fake content folder. It never calls the live domain.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/** The app folder. Every app path below is relative to it. */
const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The repository root. The runner path below is relative to it. */
const repoRoot = resolve(app, "../..");

/** The path of the AC-2.3 script. */
const scriptPath = resolve(app, "scripts/checks/printed-urls-live.ts");

/** The folder that holds the received week files. */
const contentFolder = resolve(app, "content/l2");

/** The live domain of the at-home app. */
const LIVE_DOMAIN = "https://storytime.reading-advantage.com";

/** The week-page marker: `<p data-level-week>` of `app/[locale]/frame.tsx:67`. */
const WEEK_MARKER = "data-level-week";

/** The fake cookie of the cookie rows. No part of it may reach the printed output. */
const FAKE_COOKIE = "storytime_session=FAKESECRETVALUE9f3a1c";

/** One week of the received content. */
interface WeekEntry {
  /** The status of the week. */
  status: string;
  /** The printed URL of the song. */
  songUrl: string;
  /** The printed URL of the read-along book. */
  readAlongUrl: string;
  /** The path of the week page. */
  weekPath: string;
}

/** One request that the fake server received. */
interface RecordedRequest {
  /** The method of the request. */
  method: string;
  /** The path and the query of the request. */
  url: string;
  /** The count of the bytes of the request body. */
  bodyBytes: number;
  /** The `Cookie` header of the request, when it sent one. */
  cookie: string | undefined;
}

/** The answer of the fake server for one request. */
interface FakeAnswer {
  /** The status of the answer. */
  status: number;
  /** The location of the answer, when the answer is a redirect. */
  location?: string;
  /** The body of the answer. The default is a week page with the marker. */
  body?: string;
}

/** The counts of the run. */
const counts = { script_runs: 0 };

afterAll(() => {
  for (const [name, value] of Object.entries(counts)) console.log(`${name}=${value}`);
});

/**
 * Reads the received week files.
 * @returns One entry per week file.
 */
function weekEntries(): WeekEntry[] {
  const names = readdirSync(contentFolder)
    .filter((name) => /^w[0-9]{2}\.json$/.test(name))
    .sort();
  return names.map((name) => {
    const week = JSON.parse(readFileSync(resolve(contentFolder, name), "utf-8")) as {
      meta: { status: string; level: number; week: number };
      home: { songUrl: string; readAlongUrl: string };
    };
    return {
      status: week.meta.status,
      songUrl: week.home.songUrl,
      readAlongUrl: week.home.readAlongUrl,
      weekPath: `/th/st/${week.meta.level}/${week.meta.week}`,
    };
  });
}

/**
 * Builds the body of a rendered week page: the Frame header with the marker.
 * @returns The HTML text.
 */
function weekPageBody(): string {
  return `<html><body><main><header data-hero="cover"><p data-level-week lang="th">Level 2 · Week 1</p><h1>Week</h1></header></main></body></html>`;
}

/**
 * Builds the body of the sign-in page: a form with no week marker.
 * @returns The HTML text.
 */
function signInBody(): string {
  return `<html><body><main><h1>Sign in</h1><form method="post" action="/api/auth/sign-in"><input name="username"></form></main></body></html>`;
}

/**
 * Builds the sign-in location that the proxy gives to a request without a session.
 * @param path The requested path and query, for example `/th/st/2/1?part=song`.
 * @returns The location, for example `/th/sign-in?next=%2Fth%2Fst%2F2%2F1%3Fpart%3Dsong`.
 */
function signInLocation(path: string): string {
  const locale = path.split("/")[1] ?? "th";
  return `/${locale}/sign-in?next=${encodeURIComponent(path)}`;
}

/**
 * Starts the local fake server.
 * @param answer The answer of the server for each request.
 * @returns The base URL of the server, the recorded requests, and the stop function.
 */
async function startFakeServer(
  answer: (request: RecordedRequest, count: number) => FakeAnswer,
): Promise<{ baseUrl: string; requests: RecordedRequest[]; stop: () => Promise<void> }> {
  const requests: RecordedRequest[] = [];
  let count = 0;
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      const recorded: RecordedRequest = {
        method: request.method ?? "",
        url: request.url ?? "",
        bodyBytes: body.length,
        cookie: request.headers.cookie,
      };
      requests.push(recorded);
      const result = answer(recorded, count);
      count += 1;
      if (result.location !== undefined) {
        response.writeHead(result.status, { location: result.location });
        response.end();
        return;
      }
      response.writeHead(result.status, { "content-type": "text/html; charset=utf-8" });
      response.end(result.body ?? weekPageBody());
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

/** The options of one script run. */
interface RunOptions {
  /** The value of `STORYTIME_CHECK_COOKIE`; absent means the variable is not set. */
  cookie?: string;
  /** The value of `--content-folder`; absent means the flag is not passed. */
  contentFolder?: string;
}

/**
 * Runs the AC-2.3 script against a base URL.
 *
 * The spawn is asynchronous. A synchronous spawn would block the event loop of this process, and
 * the fake server could not answer the requests of the script. The base URL must be a local
 * address: no row calls the live domain.
 * @param baseUrl The base URL of the fake server.
 * @param revision The revision label of the run.
 * @param options The cookie and the content folder of the run.
 * @returns The exit code and the printed text.
 */
async function runScript(
  baseUrl: string,
  revision: string,
  options: RunOptions = {},
): Promise<{ code: number; output: string }> {
  expect(baseUrl.startsWith("http://127.0.0.1:"), "a row must use a local base URL").toBe(true);
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.STORYTIME_CHECK_COOKIE;
  if (options.cookie !== undefined) env.STORYTIME_CHECK_COOKIE = options.cookie;
  const args = [scriptPath, "--base-url", baseUrl, "--revision", revision];
  if (options.contentFolder !== undefined) args.push("--content-folder", options.contentFolder);
  counts.script_runs += 1;
  return new Promise((done) => {
    const child = spawn(resolve(repoRoot, "node_modules/.bin/tsx"), args, { cwd: app, env });
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

/** The labeled counts of the last line of the script. */
interface Summary {
  checked: number;
  rendered: number;
  guarded: number;
  failed: number;
}

/**
 * Reads the four labeled counts of the last line of the script.
 * @param output The printed text.
 * @returns The four counts.
 */
function summaryCounts(output: string): Summary {
  const found = output.match(
    /urls_checked=([0-9]+)\s+urls_rendered=([0-9]+)\s+urls_guarded=([0-9]+)\s+urls_failed=([0-9]+)/,
  );
  expect(
    found,
    "the script prints no urls_checked=<n> urls_rendered=<n> urls_guarded=<n> urls_failed=<n> line",
  ).not.toBeNull();
  return {
    checked: Number(found?.[1]),
    rendered: Number(found?.[2]),
    guarded: Number(found?.[3]),
    failed: Number(found?.[4]),
  };
}

/**
 * Reads the class of the line of one URL.
 * @param output The printed text.
 * @param path The printed path of the URL.
 * @returns The class, or `undefined` when no line holds the path and a class.
 */
function classOf(output: string, path: string): string | undefined {
  const line = output.split("\n").find((entry) => entry.includes(path) && /class=/.test(entry));
  return line?.match(/class=([a-z]+)/)?.[1];
}

/**
 * Reports whether the printed text holds the time of the run.
 * @param output The printed text.
 * @returns `true` when the text holds a time.
 */
function hasTimeRecord(output: string): boolean {
  if (/[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}/.test(output)) return true;
  return /(?:^|\s)(?:time|at|checked_at|timestamp)=[^\s]+/i.test(output);
}

/**
 * Lists the printed URLs of the published weeks of the real content.
 * @returns The URLs in week file order.
 */
function publishedUrls(): string[] {
  return weekEntries()
    .filter((week) => week.status === "published")
    .flatMap((week) => [week.songUrl, week.readAlongUrl]);
}

/** The fake content folders of the rows; the test removes them at the end. */
const fakeFolders: string[] = [];

afterAll(() => {
  for (const folder of fakeFolders) rmSync(folder, { recursive: true, force: true });
});

/** One fake week of a fake content folder. */
interface FakeWeek {
  /** The status of the week. */
  status: string;
  /** The level of the week. */
  level: number;
  /** The week number. */
  week: number;
  /** The printed URL of the song; the default is the relative week path. */
  songUrl?: string;
  /** The printed URL of the read-along book; the default is the relative week path. */
  readAlongUrl?: string;
}

/**
 * Writes a fake content folder with the named weeks.
 * @param weeks The status, level, week, and optional home URLs of each fake week.
 * @returns The path of the folder.
 */
function fakeContent(weeks: FakeWeek[]): string {
  const folder = mkdtempSync(join(tmpdir(), "storytime-urls-content-"));
  fakeFolders.push(folder);
  weeks.forEach((entry, index) => {
    const name = `w${String(index + 1).padStart(2, "0")}.json`;
    const path = `/th/st/${entry.level}/${entry.week}`;
    writeFileSync(
      join(folder, name),
      JSON.stringify({
        meta: { status: entry.status, level: entry.level, week: entry.week },
        home: {
          songUrl: entry.songUrl ?? `${path}?part=song`,
          readAlongUrl: entry.readAlongUrl ?? `${path}?part=book`,
        },
      }),
    );
  });
  mkdirSync(join(folder, "keep"), { recursive: true });
  return folder;
}

describe("task 7.4 the AC-2.3 script of the printed URLs", () => {
  it("keeps the script at its path with the live domain as the default base URL", () => {
    expect(existsSync(scriptPath), `Missing ${scriptPath}`).toBe(true);
    const text = readFileSync(scriptPath, "utf-8");
    expect(text, "the script names no live domain").toContain(LIVE_DOMAIN);
  });

  it("uses a marker that only the week pages render (characterization)", () => {
    const frame = readFileSync(resolve(app, "app/[locale]/frame.tsx"), "utf-8");
    expect(frame, "the Frame must render the week marker").toContain(WEEK_MARKER);
    const signIn = readdirSync(resolve(app, "app/[locale]/sign-in"))
      .filter((name) => /\.(ts|tsx)$/.test(name))
      .map((name) => readFileSync(resolve(app, "app/[locale]/sign-in", name), "utf-8"));
    expect(signIn.length, "sign_in_files must be above 0 (A4)").toBeGreaterThan(0);
    for (const text of signIn) {
      expect(text, "the sign-in page must not hold the week marker").not.toContain(WEEK_MARKER);
    }
  });

  it("never follows a redirect: the script text names redirect manual and no follow", () => {
    const text = readFileSync(scriptPath, "utf-8");
    expect(text, "the script must set redirect: manual").toMatch(/redirect:\s*["']manual["']/);
    expect(text, "the script must not follow a redirect").not.toMatch(/redirect:\s*["']follow["']/);
  });

  it("requests only the printed URLs of the published weeks of the real content (C1001)", async () => {
    const weeks = weekEntries();
    expect(weeks.length, `week_files=${weeks.length}`).toBeGreaterThanOrEqual(8);
    const published = weeks.filter((week) => week.status === "published");
    const drafts = weeks.filter((week) => week.status !== "published");
    expect(published.length, "the content holds no published week").toBeGreaterThanOrEqual(1);
    expect(drafts.length, "the content holds no draft week (the row needs one)").toBeGreaterThanOrEqual(1);
    const withBoth = published.filter((week) => week.songUrl && week.readAlongUrl).length;
    const expected = publishedUrls();
    expect(expected.length, "two printed URLs for each published week").toBe(2 * withBoth);
    const server = await startFakeServer(() => ({ status: 200 }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      const urls = server.requests.map((request) => request.url).sort();
      expect(urls, `urls_requested=${urls.length}\n${run.output}`).toEqual([...expected].sort());
      for (const week of drafts) {
        for (const url of [week.songUrl, week.readAlongUrl]) {
          expect(urls, `the script requests the draft week URL ${url}`).not.toContain(url);
        }
      }
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
      const found = summaryCounts(run.output);
      expect(found.checked, `urls_checked=${found.checked}`).toBe(expected.length);
      for (const request of server.requests) {
        expect(request.method, `the script sends ${request.method} for ${request.url}`).toBe("GET");
        expect(request.bodyBytes, `the script sends a body for ${request.url}`).toBe(0);
      }
      expect(run.output, "the script records no revision").toContain("red-test-revision");
      expect(hasTimeRecord(run.output), "the script records no time").toBe(true);
    } finally {
      await server.stop();
    }
  });

  it("requests exactly the two URLs of the one published week of a fake content folder (C1001)", async () => {
    const folder = fakeContent([
      { status: "published", level: 9, week: 1 },
      { status: "draft", level: 9, week: 2 },
      { status: "draft", level: 9, week: 3 },
    ]);
    const server = await startFakeServer(() => ({ status: 200 }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision", { contentFolder: folder });
      const urls = server.requests.map((request) => request.url).sort();
      expect(urls, `urls_requested=${urls.length}\n${run.output}`).toEqual([
        "/th/st/9/1?part=book",
        "/th/st/9/1?part=song",
      ]);
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
      expect(summaryCounts(run.output).checked).toBe(2);
    } finally {
      await server.stop();
    }
  });

  it("classifies a 200 week page with the marker as rendered and exits 0", async () => {
    const server = await startFakeServer(() => ({ status: 200, body: weekPageBody() }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      const expected = publishedUrls();
      expect(summaryCounts(run.output), run.output).toEqual({
        checked: expected.length,
        rendered: expected.length,
        guarded: 0,
        failed: 0,
      });
      for (const path of expected) expect(classOf(run.output, path), `class of ${path}`).toBe("rendered");
      expect(run.output).toMatch(/status=200/);
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
    } finally {
      await server.stop();
    }
  });

  it("classifies the sign-in redirect of a sessionless request as guarded, follows nothing, and exits 3", async () => {
    const server = await startFakeServer((request) => ({ status: 307, location: signInLocation(request.url) }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      const expected = publishedUrls();
      expect(
        server.requests.map((request) => request.url).sort(),
        "the script must send exactly one request per URL and follow no redirect",
      ).toEqual([...expected].sort());
      expect(summaryCounts(run.output), run.output).toEqual({
        checked: expected.length,
        rendered: 0,
        guarded: expected.length,
        failed: 0,
      });
      for (const path of expected) expect(classOf(run.output, path), `class of ${path}`).toBe("guarded");
      expect(run.output).toMatch(/status=307/);
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(3);
    } finally {
      await server.stop();
    }
  });

  it("sends the cookie of STORYTIME_CHECK_COOKIE, proves the page, exits 0, and prints no part of the value", async () => {
    const server = await startFakeServer((request) =>
      request.cookie === FAKE_COOKIE
        ? { status: 200, body: weekPageBody() }
        : { status: 307, location: signInLocation(request.url) },
    );
    try {
      const run = await runScript(server.baseUrl, "red-test-revision", { cookie: FAKE_COOKIE });
      const expected = publishedUrls();
      expect(server.requests.length, "one request per URL").toBe(expected.length);
      for (const request of server.requests) {
        expect(request.cookie, `the script sends no cookie for ${request.url}`).toBe(FAKE_COOKIE);
      }
      expect(summaryCounts(run.output), run.output).toEqual({
        checked: expected.length,
        rendered: expected.length,
        guarded: 0,
        failed: 0,
      });
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
      for (const part of [FAKE_COOKIE, "FAKESECRETVALUE", "9f3a1c", "storytime_session="]) {
        expect(run.output, `the output holds a part of the cookie value: ${part}`).not.toContain(part);
      }
    } finally {
      await server.stop();
    }
  });

  it("sends no cookie to an absolute printed URL on another host and sends it to a relative URL of the same run (B1002)", async () => {
    // URL.host compares host and port, so two fake servers on 127.0.0.1 with different ports
    // are two hosts.
    const other = await startFakeServer(() => ({ status: 200, body: weekPageBody() }));
    const folder = fakeContent([
      {
        status: "published",
        level: 9,
        week: 1,
        songUrl: "/th/st/9/1?part=song",
        readAlongUrl: `${other.baseUrl}/th/st/9/1?part=book`,
      },
    ]);
    const base = await startFakeServer(() => ({ status: 200, body: weekPageBody() }));
    try {
      const run = await runScript(base.baseUrl, "red-test-revision", {
        cookie: FAKE_COOKIE,
        contentFolder: folder,
      });
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
      expect(summaryCounts(run.output), run.output).toEqual({ checked: 2, rendered: 2, guarded: 0, failed: 0 });
      expect(base.requests.length, "the base host gets one request (the relative URL)").toBe(1);
      expect(base.requests[0].cookie, "the relative URL must carry the cookie").toBe(FAKE_COOKIE);
      expect(other.requests.length, "the other host gets one request (the absolute URL)").toBe(1);
      expect(
        other.requests[0].cookie,
        `the cross-host request must carry no cookie, got ${other.requests[0].cookie}`,
      ).toBeUndefined();
    } finally {
      await base.stop();
      await other.stop();
    }
  });

  it("sends the cookie to an absolute printed URL on the same host as the base URL (B1002, characterization)", async () => {
    const base = await startFakeServer(() => ({ status: 200, body: weekPageBody() }));
    const folder = fakeContent([
      {
        status: "published",
        level: 9,
        week: 1,
        songUrl: `${base.baseUrl}/th/st/9/1?part=song`,
        readAlongUrl: "/th/st/9/1?part=book",
      },
    ]);
    try {
      const run = await runScript(base.baseUrl, "red-test-revision", {
        cookie: FAKE_COOKIE,
        contentFolder: folder,
      });
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
      expect(base.requests.length, "the base host gets both requests").toBe(2);
      for (const request of base.requests) {
        expect(request.cookie, `the same-host request ${request.url} must carry the cookie`).toBe(FAKE_COOKIE);
      }
    } finally {
      await base.stop();
    }
  });

  it("decides the cookie by a host comparison and prints no part of the cookie value in either case (B1002)", async () => {
    const text = readFileSync(scriptPath, "utf-8");
    expect(
      text,
      "the script must compare the host of the requested URL with the host of the base URL",
    ).toMatch(/\.host\s*===/);
    const other = await startFakeServer(() => ({ status: 200, body: weekPageBody() }));
    const crossFolder = fakeContent([
      {
        status: "published",
        level: 9,
        week: 1,
        songUrl: "/th/st/9/1?part=song",
        readAlongUrl: `${other.baseUrl}/th/st/9/1?part=book`,
      },
    ]);
    const sameFolder = fakeContent([
      {
        status: "published",
        level: 9,
        week: 1,
        songUrl: "/th/st/9/1?part=song",
        readAlongUrl: "/th/st/9/1?part=book",
      },
    ]);
    const base = await startFakeServer(() => ({ status: 200, body: weekPageBody() }));
    try {
      const crossRun = await runScript(base.baseUrl, "red-test-revision", {
        cookie: FAKE_COOKIE,
        contentFolder: crossFolder,
      });
      const sameRun = await runScript(base.baseUrl, "red-test-revision", {
        cookie: FAKE_COOKIE,
        contentFolder: sameFolder,
      });
      for (const output of [crossRun.output, sameRun.output]) {
        for (const part of [FAKE_COOKIE, "FAKESECRETVALUE", "9f3a1c", "storytime_session="]) {
          expect(output, `the output holds a part of the cookie value: ${part}`).not.toContain(part);
        }
      }
    } finally {
      await base.stop();
      await other.stop();
    }
  });

  it("classifies a 200 sign-in page for a week URL as failed and exits 1 (the C1002 regression)", async () => {
    const server = await startFakeServer(() => ({ status: 200, body: signInBody() }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      const expected = publishedUrls();
      expect(summaryCounts(run.output), run.output).toEqual({
        checked: expected.length,
        rendered: 0,
        guarded: 0,
        failed: expected.length,
      });
      for (const path of expected) expect(classOf(run.output, path), `class of ${path}`).toBe("failed");
      expect(run.code, `the script exits ${run.code} on a 200 sign-in page\n${run.output}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("classifies a 404 as failed and exits 1", async () => {
    const server = await startFakeServer(() => ({ status: 404, body: "not found" }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      const found = summaryCounts(run.output);
      expect(found.checked, run.output).toBeGreaterThanOrEqual(2);
      expect(found.failed, run.output).toBe(found.checked);
      expect(run.output).toMatch(/status=404/);
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("classifies a 500 as failed and exits 1", async () => {
    const server = await startFakeServer(() => ({ status: 500, body: weekPageBody() }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      const found = summaryCounts(run.output);
      expect(found.failed, run.output).toBe(found.checked);
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("classifies a redirect to another path as failed, follows nothing, and exits 1", async () => {
    const server = await startFakeServer(() => ({ status: 302, location: "/redirect-target" }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      expect(
        server.requests.some((request) => request.url === "/redirect-target"),
        "the script follows a redirect",
      ).toBe(false);
      const found = summaryCounts(run.output);
      expect(found, run.output).toEqual({ checked: found.checked, rendered: 0, guarded: 0, failed: found.checked });
      expect(found.checked).toBeGreaterThanOrEqual(2);
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(1);
    } finally {
      await server.stop();
    }
  });

  it("classifies a sign-in redirect with another next or another locale as failed", async () => {
    const wrongNext = await startFakeServer(() => ({ status: 307, location: "/th/sign-in?next=%2Fother" }));
    const wrongLocale = await startFakeServer((request) => ({
      status: 307,
      location: `/en/sign-in?next=${encodeURIComponent(request.url)}`,
    }));
    try {
      for (const server of [wrongNext, wrongLocale]) {
        const run = await runScript(server.baseUrl, "red-test-revision");
        const found = summaryCounts(run.output);
        expect(found.guarded, run.output).toBe(0);
        expect(found.failed, run.output).toBe(found.checked);
        expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(1);
      }
    } finally {
      await wrongNext.stop();
      await wrongLocale.stop();
    }
  });

  it("classifies a network error as failed with status 000 and exits 1", async () => {
    const server = await startFakeServer(() => ({ status: 200 }));
    const closed = server.baseUrl;
    await server.stop();
    const run = await runScript(closed, "red-test-revision");
    const found = summaryCounts(run.output);
    expect(found.failed, run.output).toBe(found.checked);
    expect(found.checked).toBeGreaterThanOrEqual(2);
    expect(run.output).toMatch(/status=000/);
    expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(1);
  });

  it("exits 3 for one rendered and one guarded URL, and exits 1 when one URL failed and one is guarded", async () => {
    const expected = publishedUrls();
    expect(expected.length).toBe(2);
    const [first, second] = expected;
    const mixed = await startFakeServer((request) =>
      request.url === first ? { status: 200, body: weekPageBody() } : { status: 307, location: signInLocation(request.url) },
    );
    const broken = await startFakeServer((request) =>
      request.url === first ? { status: 404, body: "not found" } : { status: 307, location: signInLocation(request.url) },
    );
    try {
      const mixedRun = await runScript(mixed.baseUrl, "red-test-revision");
      expect(summaryCounts(mixedRun.output), mixedRun.output).toEqual({ checked: 2, rendered: 1, guarded: 1, failed: 0 });
      expect(classOf(mixedRun.output, first)).toBe("rendered");
      expect(classOf(mixedRun.output, second)).toBe("guarded");
      expect(mixedRun.code, `exit ${mixedRun.code}\n${mixedRun.output}`).toBe(3);
      const brokenRun = await runScript(broken.baseUrl, "red-test-revision");
      expect(summaryCounts(brokenRun.output), brokenRun.output).toEqual({ checked: 2, rendered: 0, guarded: 1, failed: 1 });
      expect(brokenRun.code, `exit ${brokenRun.code}\n${brokenRun.output}`).toBe(1);
    } finally {
      await mixed.stop();
      await broken.stop();
    }
  });

  it("c1 control: the helpers tell a week page from the sign-in page, and the real content has published and draft weeks", () => {
    expect(weekPageBody()).toContain(WEEK_MARKER);
    expect(signInBody()).not.toContain(WEEK_MARKER);
    expect(signInLocation("/th/st/2/1?part=song")).toBe("/th/sign-in?next=%2Fth%2Fst%2F2%2F1%3Fpart%3Dsong");
    const statuses = new Set(weekEntries().map((week) => week.status));
    expect(statuses.has("published") && statuses.has("draft"), `statuses=${[...statuses].join(",")}`).toBe(true);
    expect(classOf("http://x/th/st/2/1 status=200 class=rendered", "/th/st/2/1")).toBe("rendered");
  });

  it("c2 floor: the rows made real script runs (A4)", () => {
    // Sixteen rows run the script once or more; three rows run it twice when they pass (18 runs).
    expect(counts.script_runs, "the number of script runs in this file").toBeGreaterThanOrEqual(16);
  });
});
