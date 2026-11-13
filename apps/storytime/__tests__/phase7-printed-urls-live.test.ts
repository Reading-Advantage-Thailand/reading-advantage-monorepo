// @vitest-environment node
// Task 7.4 of Phase 7: the AC-2.3 live check of the printed URLs.
//
// The script is `apps/storytime/scripts/checks/printed-urls-live.ts`. This file is its contract.
//
// Contract of `printed-urls-live.ts`:
//   - The script reads the week content of the app. The source is the source of
//     `phase3-printed-urls.test.ts`: the week files under `apps/storytime/content/l2` and the
//     `home.songUrl` and `home.readAlongUrl` fields of every week.
//   - The script builds one printed URL per home URL field. The base URL is
//     `https://storytime.reading-advantage.com` by default. The flag `--base-url <url>` sets
//     another base URL, so a test can use a local fake server.
//   - The flag `--revision <label>` sets the revision label of the run.
//   - The script requests each printed URL with a GET request. It follows the redirects. It sends
//     no other request and writes nothing to the service.
//   - The script prints one line per URL. The line holds the URL and `status=<n>`.
//   - The script prints the time of the run and the revision label.
//   - The script prints a last line `urls_checked=<n> urls_ok=<n>`.
//   - The script exits 0 only when every URL answers 200 after the redirects. It exits with a
//     non-zero code when one URL answers another status.
//
// The test uses a local fake server. It never calls the live domain.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
}

/** The answer of the fake server for one request. */
interface FakeAnswer {
  /** The status of the answer. */
  status: number;
  /** The location of the answer, when the answer is a redirect. */
  location?: string;
}

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
 * Starts the local fake server.
 * @param answer The answer of the server for each request.
 * @returns The base URL of the server, the recorded requests, and the stop function.
 */
async function startFakeServer(
  answer: (url: string, count: number) => FakeAnswer,
): Promise<{ baseUrl: string; requests: RecordedRequest[]; stop: () => Promise<void> }> {
  const requests: RecordedRequest[] = [];
  let count = 0;
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      requests.push({
        method: request.method ?? "",
        url: request.url ?? "",
        bodyBytes: body.length,
      });
      const result = answer(request.url ?? "", count);
      count += 1;
      if (result.location !== undefined) {
        response.writeHead(result.status, { location: result.location });
        response.end();
        return;
      }
      response.writeHead(result.status, { "content-type": "text/html; charset=utf-8" });
      response.end("<html><body>week page</body></html>");
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

/**
 * Runs the AC-2.3 script against a base URL.
 *
 * The spawn is asynchronous. A synchronous spawn would block the event loop of this process, and
 * the fake server could not answer the requests of the script.
 * @param baseUrl The base URL of the fake server.
 * @param revision The revision label of the run.
 * @returns The exit code and the printed text.
 */
async function runScript(
  baseUrl: string,
  revision: string,
): Promise<{ code: number; output: string }> {
  return new Promise((done) => {
    const child = spawn(
      resolve(repoRoot, "node_modules/.bin/tsx"),
      [scriptPath, "--base-url", baseUrl, "--revision", revision],
      { cwd: app },
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

/**
 * Reads the two labeled counts of the last line of the script.
 * @param output The printed text.
 * @returns The count of the checked URLs and the count of the URLs that answered 200.
 */
function summaryCounts(output: string): { checked: number; ok: number } {
  const found = output.match(/urls_checked=([0-9]+)\s+urls_ok=([0-9]+)/);
  expect(found, "the script prints no urls_checked=<n> urls_ok=<n> line").not.toBeNull();
  return { checked: Number(found?.[1]), ok: Number(found?.[2]) };
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

describe("task 7.4 the AC-2.3 script of the printed URLs", () => {
  it("keeps the script at its path with the live domain as the default base URL", () => {
    expect(existsSync(scriptPath), `Missing ${scriptPath}`).toBe(true);
    const text = readFileSync(scriptPath, "utf-8");
    expect(text, "the script names no live domain").toContain(LIVE_DOMAIN);
  });

  it("requests every printed URL of the week content and prints the labeled count", async () => {
    expect(existsSync(scriptPath), `Missing ${scriptPath}`).toBe(true);
    const weeks = weekEntries();
    expect(weeks.length, `week_files=${weeks.length}`).toBeGreaterThanOrEqual(8);
    const allowed = new Set<string>();
    for (const week of weeks) {
      allowed.add(week.songUrl);
      allowed.add(week.readAlongUrl);
      allowed.add(week.weekPath);
    }
    const server = await startFakeServer(() => ({ status: 200 }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
      const requests = server.requests;
      expect(requests.length, "the script requests no URL").toBeGreaterThanOrEqual(2);
      for (const request of requests) {
        expect(request.method, `the script sends ${request.method} for ${request.url}`).toBe("GET");
        expect(request.bodyBytes, `the script sends a body for ${request.url}`).toBe(0);
        expect(
          allowed.has(request.url),
          `the script requests a URL outside the week content: ${request.url}`,
        ).toBe(true);
      }
      const published = weeks.filter((week) => week.status === "published");
      expect(published.length, "the content holds no published week").toBeGreaterThanOrEqual(1);
      for (const week of published) {
        for (const url of [week.songUrl, week.readAlongUrl]) {
          expect(
            requests.some((request) => request.url === url),
            `the script requests no ${url}`,
          ).toBe(true);
        }
      }
      const counts = summaryCounts(run.output);
      expect(counts.checked, `urls_checked=${counts.checked} urls_ok=${counts.ok}`).toBe(
        requests.length,
      );
      expect(counts.ok, `urls_checked=${counts.checked} urls_ok=${counts.ok}`).toBe(counts.checked);
      const statusLines = run.output.split("\n").filter((line) => /status=[0-9]{3}/.test(line));
      expect(
        statusLines.length,
        `status_lines=${statusLines.length} urls_checked=${counts.checked}`,
      ).toBe(counts.checked);
      for (const request of requests) {
        expect(
          statusLines.some((line) => line.includes(request.url)),
          `no status line holds ${request.url}`,
        ).toBe(true);
      }
      expect(run.output, "the script records no revision").toContain("red-test-revision");
      expect(hasTimeRecord(run.output), "the script records no time").toBe(true);
    } finally {
      await server.stop();
    }
  });

  it("exits with a non-zero code when a printed URL answers another status", async () => {
    expect(existsSync(scriptPath), `Missing ${scriptPath}`).toBe(true);
    const server = await startFakeServer(() => ({ status: 404 }));
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      expect(run.code, `the script exits 0 on a 404\n${run.output}`).not.toBe(0);
      const counts = summaryCounts(run.output);
      expect(counts.checked, `urls_checked=${counts.checked} urls_ok=${counts.ok}`).toBeGreaterThanOrEqual(
        1,
      );
      expect(counts.ok, `urls_checked=${counts.checked} urls_ok=${counts.ok}`).toBe(0);
    } finally {
      await server.stop();
    }
  });

  it("follows a redirect and reports the status after the redirect", async () => {
    expect(existsSync(scriptPath), `Missing ${scriptPath}`).toBe(true);
    const server = await startFakeServer((_url, count) =>
      count === 0 ? { status: 302, location: "/redirect-target" } : { status: 200 },
    );
    try {
      const run = await runScript(server.baseUrl, "red-test-revision");
      expect(run.code, `the script exits ${run.code}\n${run.output}`).toBe(0);
      expect(
        server.requests.some((request) => request.url === "/redirect-target"),
        "the script follows no redirect",
      ).toBe(true);
      const counts = summaryCounts(run.output);
      expect(counts.ok, `urls_checked=${counts.checked} urls_ok=${counts.ok}`).toBe(counts.checked);
    } finally {
      await server.stop();
    }
  });
});
