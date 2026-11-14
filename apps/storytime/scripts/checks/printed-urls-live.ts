#!/usr/bin/env tsx
/**
 * The AC-2.3 live check of the printed URLs (plan task 7.4).
 *
 * The script reads every received week file under `apps/storytime/content/l2` and requests the
 * two printed URLs of the week home: `home.songUrl` and `home.readAlongUrl`. The base URL is the
 * live domain `https://storytime.reading-advantage.com` by default; the flag `--base-url <url>`
 * sets another base URL, so a test can use a local fake server. The flag `--revision <label>`
 * labels the run.
 *
 * The script sends one GET per printed URL and follows the redirects. It sends no other request
 * and writes nothing to the service. It prints one line per URL with the URL and the status after
 * the redirects, the time of the run, the revision label, and a last line
 * `urls_checked=<n> urls_ok=<n>`. It exits 0 only when every URL answers 200 after the redirects.
 *
 * Usage (from the app folder):
 *   ../../node_modules/.bin/tsx scripts/checks/printed-urls-live.ts [--base-url <url>] [--revision <label>]
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The live domain of the at-home app, and the default base URL of the run. */
const LIVE_BASE_URL = "https://storytime.reading-advantage.com";

/** The folder that holds the received week files, relative to the app folder. */
const CONTENT_FOLDER = "content/l2";

/** One printed URL of the run. */
interface PrintedUrl {
  /** The name of the week file, for example `w01.json`. */
  week: string;
  /** The status of the week in the content. */
  status: string;
  /** The field of the week home, for example `songUrl`. */
  field: string;
  /** The printed path or URL of the field. */
  path: string;
}

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
 * Builds the printed URLs of every week file in the content folder.
 * @param contentFolder The folder that holds the week files.
 * @returns One entry per home URL field, in week file order.
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
    for (const field of ["songUrl", "readAlongUrl"] as const) {
      const path = week.home[field];
      if (path) urls.push({ week: name, status: week.meta.status, field, path });
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

/** The main entry of the script. */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const baseUrl = flagValue(argv, "--base-url") ?? LIVE_BASE_URL;
  const revision = flagValue(argv, "--revision") ?? "none";
  const appFolder = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const urls = printedUrls(resolve(appFolder, CONTENT_FOLDER));

  console.log(`printed-urls-live base_url=${baseUrl} revision=${revision}`);
  console.log(`time=${new Date().toISOString()} weeks=${new Set(urls.map((u) => u.week)).size}`);

  let ok = 0;
  for (const url of urls) {
    const target = joinUrl(baseUrl, url.path);
    try {
      // fetch follows the redirects; the status is the status after them.
      const response = await fetch(target, { method: "GET", redirect: "follow" });
      console.log(`${target} status=${response.status}`);
      if (response.status === 200) ok += 1;
    } catch (error) {
      console.log(`${target} status=000 error=${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`urls_checked=${urls.length} urls_ok=${ok}`);
  if (ok !== urls.length) process.exitCode = 1;
}

main();
