#!/usr/bin/env tsx
/**
 * The AC-2.3 live check of the printed URLs (plan task 7.4; Review C C1001 and C1002).
 *
 * The script reads every received week file of the content folder and takes the two printed URLs
 * of the home of each PUBLISHED week: `home.songUrl` and `home.readAlongUrl`. A draft week answers
 * 404 on the live domain, so the script never requests a draft week. The default content folder is
 * `content/l2` under the app folder; the flag `--content-folder <path>` names another folder, so a
 * test can use a fake folder. The base URL is the live domain
 * `https://storytime.reading-advantage.com` by default; the flag `--base-url <url>` sets another
 * base URL. The flag `--revision <label>` labels the run.
 *
 * The script sends one GET per printed URL and never follows a redirect (`redirect: "manual"`), so
 * the server sees exactly one request per URL. It sends no body and no other request. The optional
 * environment variable `STORYTIME_CHECK_COOKIE` is sent as the `Cookie` header of every request;
 * the script never prints the value, and prints no error text that can hold it.
 *
 * The script classifies each answer:
 *   - `rendered`: status 200 and the body holds the week-page marker `data-level-week` (the
 *     `<p data-level-week>` of `app/[locale]/frame.tsx:67`; only the week pages render the Frame,
 *     so the sign-in page has no such marker).
 *   - `guarded`: a 3xx whose `Location` is the sign-in path of the locale of the requested path
 *     (`/<locale>/sign-in`) with `next` equal to the requested path and query after decoding.
 *   - `failed`: anything else (a 200 without the marker, a 404, a 5xx, a redirect elsewhere or
 *     with another `next`, a network error).
 *
 * It prints one line per URL: the URL, `status=<n>` (`000` on a network error), and
 * `class=<rendered|guarded|failed>`. It prints the time of the run and the revision label. The
 * last line is `urls_checked=<n> urls_rendered=<n> urls_guarded=<n> urls_failed=<n>`.
 *
 * Exit code: 0 when every URL is rendered; 3 when none failed and at least one is guarded (a
 * session is needed to prove the page); 1 when any URL failed, and 1 when no week is published.
 *
 * Usage (from the app folder):
 *   ../../node_modules/.bin/tsx scripts/checks/printed-urls-live.ts [--base-url <url>]
 *     [--revision <label>] [--content-folder <path>]
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The live domain of the at-home app, and the default base URL of the run. */
const LIVE_BASE_URL = "https://storytime.reading-advantage.com";

/** The default folder that holds the received week files, relative to the app folder. */
const DEFAULT_CONTENT_FOLDER = "content/l2";

/** The attribute that only the week pages render (the Frame header of the student page). */
const WEEK_PAGE_MARKER = "data-level-week";

/** One printed URL of the run. */
interface PrintedUrl {
  /** The name of the week file, for example `w01.json`. */
  week: string;
  /** The field of the week home, for example `songUrl`. */
  field: string;
  /** The printed path or URL of the field. */
  path: string;
}

/** The class of one printed URL of the run. */
type UrlClass = "rendered" | "guarded" | "failed";

/**
 * Reads one flag value of the command line.
 * @param argv The command line arguments.
 * @param name The flag name, for example `--base-url`.
 * @returns The value after the flag, or `undefined` when the flag is absent.
 */
function flagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/**
 * Builds the printed URLs of every published week file in the content folder. A draft week is
 * never requested, so it holds no printed URL of the run.
 * @param contentFolder The folder that holds the week files.
 * @returns One entry per home URL field of a published week, in week file order.
 */
export function printedUrls(contentFolder: string): PrintedUrl[] {
  const names = readdirSync(contentFolder)
    .filter((name) => /^w[0-9]{2}\.json$/.test(name))
    .sort();
  const urls: PrintedUrl[] = [];
  for (const name of names) {
    const week = JSON.parse(readFileSync(resolve(contentFolder, name), "utf-8")) as {
      meta: { status: string };
      home: { songUrl?: string; readAlongUrl?: string };
    };
    if (week.meta.status !== "published") continue;
    for (const field of ["songUrl", "readAlongUrl"] as const) {
      const path = week.home[field];
      if (path) urls.push({ week: name, field, path });
    }
  }
  return urls;
}

/**
 * Joins a base URL and a printed path into one URL.
 * @param baseUrl The base URL of the run.
 * @param path The printed path, for example `/th/st/2/1?part=song`.
 * @returns The URL to request.
 */
export function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Reports whether a redirect location is the sign-in guard of the requested path: the location
 * path is `/<locale>/sign-in` of the locale of the requested path, and its decoded `next` query
 * value equals the requested path and query.
 * @param location The `Location` header of the redirect answer.
 * @param requestedPath The requested path and query, for example `/th/st/2/1?part=song`.
 * @returns `true` when the location guards exactly the requested path.
 */
function isSignInGuard(location: string, requestedPath: string): boolean {
  const queryStart = location.indexOf("?");
  const locationPath = queryStart >= 0 ? location.slice(0, queryStart) : location;
  const locationQuery = queryStart >= 0 ? location.slice(queryStart + 1) : "";
  const locale = requestedPath.split("/")[1] ?? "";
  if (locationPath !== `/${locale}/sign-in`) return false;
  return new URLSearchParams(locationQuery).get("next") === requestedPath;
}

/**
 * Classifies one answer of the printed URL check.
 * @param status The status of the answer.
 * @param body The body of the answer, when the status is 200.
 * @param location The `Location` header of the answer, when the answer is a redirect.
 * @param requestedPath The requested path and query.
 * @returns The class of the answer.
 */
function classify(status: number, body: string | undefined, location: string | undefined, requestedPath: string): UrlClass {
  if (status === 200 && body !== undefined && body.includes(WEEK_PAGE_MARKER)) return "rendered";
  if (status >= 300 && status < 400 && location !== undefined && isSignInGuard(location, requestedPath)) return "guarded";
  return "failed";
}

/** The main entry of the script. */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const baseUrl = flagValue(argv, "--base-url") ?? LIVE_BASE_URL;
  const revision = flagValue(argv, "--revision") ?? "none";
  const contentFolder = flagValue(argv, "--content-folder") ?? DEFAULT_CONTENT_FOLDER;
  const appFolder = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const cookie = process.env.STORYTIME_CHECK_COOKIE;
  const urls = printedUrls(resolve(appFolder, contentFolder));

  console.log(`printed-urls-live base_url=${baseUrl} revision=${revision}`);
  console.log(`time=${new Date().toISOString()} weeks=${new Set(urls.map((u) => u.week)).size}`);

  let rendered = 0;
  let guarded = 0;
  let failed = 0;
  for (const url of urls) {
    const target = joinUrl(baseUrl, url.path);
    let status = 0;
    let urlClass: UrlClass = "failed";
    try {
      // One GET per URL; the redirect is never followed, so the server sees one request.
      const response = await fetch(target, {
        method: "GET",
        redirect: "manual",
        headers: cookie === undefined ? {} : { Cookie: cookie },
      });
      status = response.status;
      // The body is read only for a 200, where the week marker decides the class.
      const body = status === 200 ? await response.text() : undefined;
      urlClass = classify(status, body, response.headers.get("Location") ?? undefined, url.path);
    } catch {
      // The error text can hold the cookie value, so the script prints only status 000.
      status = 0;
      urlClass = "failed";
    }
    if (urlClass === "rendered") rendered += 1;
    else if (urlClass === "guarded") guarded += 1;
    else failed += 1;
    console.log(`${target} status=${String(status).padStart(3, "0")} class=${urlClass}`);
  }

  console.log(`urls_checked=${urls.length} urls_rendered=${rendered} urls_guarded=${guarded} urls_failed=${failed}`);
  if (failed > 0 || urls.length === 0) process.exitCode = 1;
  else if (guarded > 0) process.exitCode = 3;
}

main();
