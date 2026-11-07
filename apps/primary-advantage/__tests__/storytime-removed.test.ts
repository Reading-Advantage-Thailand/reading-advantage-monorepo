import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** The app folder. Every app path below is relative to it. */
const APP_DIR = path.resolve(__dirname, "..");

/** The repository root. The root runbook path below is relative to it. */
const REPO_ROOT = path.resolve(APP_DIR, "..", "..");

/** The 24 delete paths inside the app folder. */
const DELETE_APP_PATHS = [
  "app/[locale]/st/[level]/[week]/page.tsx",
  "app/[locale]/st/[level]/[week]/__tests__/page.test.tsx",
  "components/storytime/storytime-book.tsx",
  "components/storytime/storytime-song.tsx",
  "components/storytime/storytime-week.tsx",
  "components/storytime/__tests__/storytime-week.test.tsx",
  "content/storytime/l2/w01.json",
  "content/storytime/l2/w02.json",
  "content/storytime/l2/w03.json",
  "content/storytime/l2/w04.json",
  "content/storytime/l2/w05.json",
  "content/storytime/l2/w06.json",
  "content/storytime/l2/w07.json",
  "content/storytime/l2/w08.json",
  "content/storytime/weeks.ts",
  "content/storytime/media-list.txt",
  "lib/storytime/blend.ts",
  "lib/storytime/host.ts",
  "lib/storytime/speak.ts",
  "lib/storytime/week.ts",
  "lib/storytime/__tests__/blend.test.ts",
  "lib/storytime/__tests__/week.test.ts",
  "scripts/storytime/receive-weeks.ts",
  "lib/__tests__/proxy-storytime-host.test.ts",
];

/** The one delete path at the repository root. */
const DELETE_REPO_PATHS = ["docs/runbooks/storytime-week-sync.md"];

/** The 25 delete paths with their absolute location and their label. */
const DELETE_PATHS = [
  ...DELETE_APP_PATHS.map((relativePath) => ({
    label: `apps/primary-advantage/${relativePath}`,
    absolutePath: path.join(APP_DIR, relativePath),
  })),
  ...DELETE_REPO_PATHS.map((relativePath) => ({
    label: relativePath,
    absolutePath: path.join(REPO_ROOT, relativePath),
  })),
];

/** The file extensions the source scan reads. */
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts"];

/** The folders the source scan skips. */
const SCAN_SKIP_FOLDERS = new Set(["node_modules", ".next"]);

/** The one exact path the source scan excludes. This file names the removed code on purpose. */
const SELF_RELATIVE_PATH = "__tests__/storytime-removed.test.ts";

/** The three files the source scan must find. They stay after the removal. */
const SCAN_ANCHORS = [
  "proxy.ts",
  "components/pwa/service-worker-register.tsx",
  "lib/route-policies.ts",
];

/** The five locale files of the app. */
const LOCALE_NAMES = ["cn", "en", "th", "tw", "vi"];

/** Matches a module specifier with a storytime segment in an import, a require, or a mock. */
const IMPORT_SOURCE_PATTERN =
  /(?:from|import|require|vi\.mock)\s*\(?\s*["'][^"']*\/storytime[^"']*["']/;

/** Matches the two removed host rule names. */
const REMOVED_NAME_PATTERN = /storytimeHostRedirect|isStorytimeHost/;

/** Matches a call to the removed message namespace and a quoted full key under it. */
const NAMESPACE_PATTERN =
  /(?:useTranslations|getTranslations)\s*\(\s*["']Storytime["']|namespace:\s*["']Storytime["']|["'`]Storytime\.[a-z][A-Za-z]*["'`]/g;

/** One scanned source file. */
type ScannedFile = { relativePath: string; text: string };

/**
 * Collects the source files of the app folder.
 * @returns The relative path and the text of each file.
 */
function collectScannedFiles(): ScannedFile[] {
  const files: ScannedFile[] = [];
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const fullPath = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        if (!SCAN_SKIP_FOLDERS.has(entry.name)) walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = path.relative(APP_DIR, fullPath);
      if (relativePath === SELF_RELATIVE_PATH) continue;
      if (!SCAN_EXTENSIONS.includes(path.extname(entry.name))) continue;
      files.push({ relativePath, text: readFileSync(fullPath, "utf-8") });
    }
  };
  walk(APP_DIR);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

let scanCache: ScannedFile[] | undefined;

/**
 * Returns the scanned files. The walk runs once per test file.
 * @returns The relative path and the text of each scanned file.
 */
function scannedFiles(): ScannedFile[] {
  if (!scanCache) scanCache = collectScannedFiles();
  return scanCache;
}

/**
 * Lists the files that import a removed module or name a removed host rule.
 * @param files The files to read.
 * @returns The relative path of each offending file.
 */
function findOffendingFiles(files: ScannedFile[]): string[] {
  return files
    .filter(
      (file) =>
        IMPORT_SOURCE_PATTERN.test(file.text) || REMOVED_NAME_PATTERN.test(file.text),
    )
    .map((file) => file.relativePath);
}

/**
 * Lists the calls to the removed message namespace.
 * @param files The files to read.
 * @returns The relative path and the matched text of each call.
 */
function findNamespaceCallers(files: ScannedFile[]): { relativePath: string; match: string }[] {
  const hits: { relativePath: string; match: string }[] = [];
  for (const file of files) {
    for (const match of file.text.matchAll(NAMESPACE_PATTERN)) {
      hits.push({ relativePath: file.relativePath, match: match[0] });
    }
  }
  return hits;
}

/**
 * Writes a scratch file under the system temp folder.
 * @param name The file name.
 * @param text The file text.
 * @returns The scratch folder and the scratch file path.
 */
function writeScratchFile(name: string, text: string): { folder: string; file: string } {
  const folder = mkdtempSync(path.join(tmpdir(), "storytime-removed-"));
  const file = path.join(folder, name);
  writeFileSync(file, text, "utf-8");
  return { folder, file };
}

describe("the void Storytime code is out of Primary", () => {
  it("holds 25 delete paths, 24 in the app and 1 at the repository root", () => {
    expect(DELETE_PATHS.length, "the delete path list holds 25 entries").toBe(25);
    expect(DELETE_APP_PATHS.length, "the app delete paths hold 24 entries").toBe(24);
    expect(DELETE_REPO_PATHS.length, "the root delete paths hold 1 entry").toBe(1);
  });

  it("removes every delete path", () => {
    expect(DELETE_PATHS.length, "the delete path list is not empty").toBe(25);
    const stillPresent = DELETE_PATHS.filter((entry) => existsSync(entry.absolutePath)).map(
      (entry) => entry.label,
    );
    const removed = DELETE_PATHS.length - stillPresent.length;
    expect(
      removed,
      `storytime_removed_paths=${removed} still_present=${stillPresent.join(",")}`,
    ).toBe(25);
  });

  it("scans at least 900 source files and finds the three anchor files", () => {
    const files = scannedFiles();
    expect(files.length, `scan_files=${files.length}`).toBeGreaterThanOrEqual(900);
    const scannedPaths = new Set(files.map((file) => file.relativePath));
    const missingAnchors = SCAN_ANCHORS.filter((anchor) => !scannedPaths.has(anchor));
    expect(
      missingAnchors,
      `scan_files=${files.length} missing_anchors=${missingAnchors.join(",")}`,
    ).toEqual([]);
  });

  it("leaves no file that imports a removed module or names a removed host rule", () => {
    const files = scannedFiles();
    expect(files.length, `scan_files=${files.length}`).toBeGreaterThanOrEqual(900);
    const scratch = writeScratchFile(
      "scratch.ts",
      'import { isStorytimeHost } from "@/lib/storytime/host";\n',
    );
    try {
      const scratchText = readFileSync(scratch.file, "utf-8");
      const planted = findOffendingFiles([{ relativePath: scratch.file, text: scratchText }]);
      expect(planted.length, "the detector flags a planted removed import").toBeGreaterThan(0);
      const scannedPaths = files.map((file) => file.relativePath);
      expect(scannedPaths.includes(scratch.file), "the scratch file stays outside the scan").toBe(
        false,
      );
    } finally {
      rmSync(scratch.folder, { recursive: true, force: true });
    }
    const offendingFiles = findOffendingFiles(files);
    expect(
      offendingFiles,
      `offending_files=${offendingFiles.length} files=${offendingFiles.join(",")}`,
    ).toEqual([]);
  });

  it("keeps the other routing names in the proxy", () => {
    const proxyPath = path.join(APP_DIR, "proxy.ts");
    expect(existsSync(proxyPath), "proxy.ts exists").toBe(true);
    const proxyText = readFileSync(proxyPath, "utf-8");
    expect(proxyText.length, "proxy.ts is not empty").toBeGreaterThan(0);
    for (const name of ["intlMiddleware", "safeCallbackPath", "protectedRoutes", "roleDefaultRedirects"]) {
      expect(proxyText, `proxy.ts holds ${name}`).toContain(name);
    }
  });

  it("leaves no Storytime line in the proxy", () => {
    const proxyText = readFileSync(path.join(APP_DIR, "proxy.ts"), "utf-8");
    expect(proxyText.length, "proxy.ts is not empty").toBeGreaterThan(0);
    const storytimeLines = proxyText
      .split("\n")
      .filter((line) => /storytime/i.test(line))
      .map((line) => line.trim());
    expect(
      storytimeLines.length,
      `proxy_storytime_lines=${storytimeLines.length} lines=${storytimeLines.join(" | ")}`,
    ).toBe(0);
  });

  it("holds the five locale files with at least 50 top-level keys each", () => {
    const messagesDir = path.join(APP_DIR, "messages");
    const localeFiles = readdirSync(messagesDir)
      .filter((name) => name.endsWith(".json"))
      .sort();
    expect(
      localeFiles,
      `locales_checked=${localeFiles.length} files=${localeFiles.join(",")}`,
    ).toEqual(LOCALE_NAMES.map((name) => `${name}.json`));
    for (const name of localeFiles) {
      const parsed = JSON.parse(readFileSync(path.join(messagesDir, name), "utf-8")) as Record<
        string,
        unknown
      >;
      expect(
        Object.keys(parsed).length,
        `locales_checked=${localeFiles.length} ${name} holds at least 50 top-level keys`,
      ).toBeGreaterThanOrEqual(50);
    }
  });

  it("leaves no Storytime top-level key in any locale file", () => {
    const messagesDir = path.join(APP_DIR, "messages");
    expect(LOCALE_NAMES.length, "the locale list is not empty").toBe(5);
    const offenders: string[] = [];
    for (const name of LOCALE_NAMES) {
      const parsed = JSON.parse(readFileSync(path.join(messagesDir, `${name}.json`), "utf-8")) as Record<
        string,
        unknown
      >;
      const hasKey = Object.keys(parsed).some((key) => key.toLowerCase() === "storytime");
      if (hasKey) offenders.push(name);
    }
    expect(
      offenders,
      `locales_with_storytime_key=${offenders.length} locales=${offenders.join(",")}`,
    ).toEqual([]);
  });

  it("leaves no caller of the Storytime message namespace", () => {
    const files = scannedFiles();
    expect(files.length, `scan_files=${files.length}`).toBeGreaterThanOrEqual(900);
    const plantedCaller = writeScratchFile(
      "caller.ts",
      'const t = useTranslations("Storytime");\n',
    );
    const plantedHost = writeScratchFile(
      "host.ts",
      'const host = "Storytime.Reading-Advantage.com:443";\n',
    );
    try {
      const callerText = readFileSync(plantedCaller.file, "utf-8");
      expect(
        findNamespaceCallers([{ relativePath: plantedCaller.file, text: callerText }]).length,
        "the detector flags a planted namespace call",
      ).toBeGreaterThan(0);
      const hostText = readFileSync(plantedHost.file, "utf-8");
      expect(
        findNamespaceCallers([{ relativePath: plantedHost.file, text: hostText }]).length,
        "a mixed-case host string does not trip the key pattern",
      ).toBe(0);
    } finally {
      rmSync(plantedCaller.folder, { recursive: true, force: true });
      rmSync(plantedHost.folder, { recursive: true, force: true });
    }
    const callers = findNamespaceCallers(files);
    expect(
      callers.length,
      `namespace_callers=${callers.length} sites=${callers
        .map((caller) => `${caller.relativePath}:${caller.match}`)
        .join(",")}`,
    ).toBe(0);
  });
});
