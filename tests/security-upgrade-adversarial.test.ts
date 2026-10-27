/**
 * Adversarial tests for track security_upgrade_20261026, Phase 1.
 *
 * The role of this file is to break the Phase 1 guarantee. The guarantee is
 * that every resolved copy of a guarded package sits at or above its floor.
 * The guard lives in tests/security-upgrade-version-guard.test.ts.
 *
 * Two kinds of checks live here.
 *
 * The first kind runs the real guard code. The code is loaded from the source
 * file of the guard test. The file is not copied and not edited. The load
 * fails loudly when the source moves.
 *
 * The second kind uses independent checkers. Each checker reads the real
 * repository and returns a list of failures. Each checker also runs on a
 * synthetic bad fixture. A checker that passes both inputs is vacuous.
 * The synthetic fixture is the proof that the checker can fail.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { GUARD_ENTRIES, NO_FIX_AVAILABLE, OPEN_MAJORS, type GuardEntry } from "./security-upgrade-guard-list";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GUARD_TEST_PATH = resolve(ROOT, "tests/security-upgrade-version-guard.test.ts");
const LOCKFILE_PATH = resolve(ROOT, "pnpm-lock.yaml");
const WORKSPACE_PATH = resolve(ROOT, "pnpm-workspace.yaml");
const AUDIT_PATH = resolve(ROOT, "measure/tracks/security_upgrade_20261026/audit-2026-10-26.md");

const PHASE_BASE_SHA = "24471e25ab76881b637e6caa36a15870a6894491";
const GREEN_GATE_BASE_SHA = "a64616a4d0a71497cfcdedfee1d55d21146833b4";
const AUDITED_HEAD_SHA = "7236ae2c7eacfb0ffe535700c2b8a965cc1615f1";

/** The four packages that the Phase 1 floors cover. */
const CORE_PACKAGES = ["next", "react", "react-dom", "sharp"];

/**
 * The override pins that the strategy names. The strategy fixes these values.
 * The values of `next`, `react`, `react-dom` and `vite` also sit in the guard
 * list. The rule in the guard list hygiene check compares both sources.
 */
const STRATEGY_REQUIRED_PINS: Record<string, string> = {
  "drizzle-orm": "0.45.2",
  next: "16.4.1",
  react: "19.2.9",
  "react-dom": "19.2.9",
  vitest: "4.1.8",
  vite: "8.1.6",
  typescript: "5.9.3",
  "@types/react": "19.2.2",
  "@types/react-dom": "19.2.2",
  "@vitejs/plugin-react": "6.0.3",
};

/** The packages that stay out of scope. The strategy names this list. */
const OUT_OF_SCOPE_MAJORS = [
  "nodemailer",
  "next-mdx-remote",
  "vinext",
  "@opentelemetry/propagator-jaeger",
  "@faker-js/faker",
  "basic-ftp",
];

/** The file patterns that the track must not change. */
const PROTECTED_FILE_PATTERNS = [/(^|\/)Dockerfile(\..*)?$/i, /(^|\/)cloudbuild.*\.ya?ml$/i];

/**
 * Compares two dotted versions as numeric segments. Returns -1, 0, or 1.
 * A segment that holds no digits counts as 0.
 */
function compareVersions(a: string, b: string): number {
  const as = a.split(".");
  const bs = b.split(".");
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const av = Number.parseInt(as[i] ?? "0", 10);
    const bv = Number.parseInt(bs[i] ?? "0", 10);
    const an = Number.isNaN(av) ? 0 : av;
    const bn = Number.isNaN(bv) ? 0 : bv;
    if (an !== bn) return an < bn ? -1 : 1;
  }
  return 0;
}

/** Returns the numeric segments of a version. Returns null for a dirty version. */
function parseCleanVersion(version: string): number[] | null {
  if (!/^\d+(\.\d+)*$/.test(version)) return null;
  return version.split(".").map((part) => Number.parseInt(part, 10));
}

/** Returns the floor rows of one package. */
function floorRows(packageName: string, entries: GuardEntry[] = GUARD_ENTRIES): GuardEntry[] {
  return entries.filter((entry) => entry.packageName === packageName);
}

/**
 * Returns the lowest version that a range admits. The range must start with a
 * number. Returns null when the range does not start with a number.
 */
function rangeMinimum(range: string): string | null {
  const cleaned = range.trim().replace(/^[\^~>=<\s]+/, "");
  const match = cleaned.match(/^\d+(\.\d+)*/);
  return match ? match[0] : null;
}

/**
 * Returns the `packages:` and `snapshots:` sections of a lockfile.
 * The two sections hold every resolved copy of a package.
 */
function extractResolvedSections(src: string): { packages: string[]; snapshots: string[] } {
  const lines = src.split(/\r?\n/);
  const take = (name: string): string[] => {
    let start = -1;
    let end = lines.length;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimEnd() === `${name}:`) {
        start = i + 1;
      } else if (start !== -1 && lines[i].trim() !== "" && !/^\s/.test(lines[i]) && lines[i].endsWith(":")) {
        end = i;
        break;
      }
    }
    return start === -1 ? [] : lines.slice(start, end);
  };
  return { packages: take("packages"), snapshots: take("snapshots") };
}

/**
 * Parses one package key of a lockfile section. Returns the package name and
 * the version. A peer suffix and an empty peer object are removed.
 * Returns null when the line holds no package key.
 */
function parsePackageKey(raw: string): { name: string; version: string } | null {
  if (!raw.startsWith("  ") || raw.startsWith("   ")) return null;
  let key = raw.slice(2).trimEnd();
  if (key.startsWith("'")) key = key.slice(1);
  if (key.endsWith("}")) key = key.replace(/:\s*\{\}$/, "");
  if (key.endsWith(":")) key = key.slice(0, -1);
  if (key.endsWith("'")) key = key.slice(0, -1);
  const paren = key.indexOf("(");
  if (paren !== -1) key = key.slice(0, paren);
  const at = key.lastIndexOf("@");
  if (at <= 0) return null;
  const version = key.slice(at + 1);
  if (!/^[0-9]/.test(version)) return null;
  return { name: key.slice(0, at), version };
}

/**
 * Collects every resolved copy of the four core packages. The scan covers the
 * `packages:` section and the `snapshots:` section. The `snapshots:` section
 * holds the peer suffixed copies.
 */
function collectResolvedCopies(lockfileText: string): { section: string; name: string; version: string }[] {
  const sections = extractResolvedSections(lockfileText);
  const out: { section: string; name: string; version: string }[] = [];
  for (const [section, lines] of [
    ["packages", sections.packages],
    ["snapshots", sections.snapshots],
  ] as [string, string[]][]) {
    for (const line of lines) {
      const parsed = parsePackageKey(line);
      if (!parsed) continue;
      if (!CORE_PACKAGES.includes(parsed.name)) continue;
      out.push({ section, name: parsed.name, version: parsed.version });
    }
  }
  return out;
}

/**
 * Checks every resolved copy of the four core packages against the guard
 * floors. The check reads the `packages:` section and the `snapshots:` section.
 * A copy that matches no floor row gives a missing line failure.
 */
function checkResolvedCopies(lockfileText: string, entries: GuardEntry[] = GUARD_ENTRIES): string[] {
  const failures: string[] = [];
  const copies = collectResolvedCopies(lockfileText);
  for (const name of CORE_PACKAGES) {
    const rows = floorRows(name, entries);
    if (rows.length === 0) {
      failures.push(`package=${name} has no floor row`);
      continue;
    }
    for (const row of rows) {
      const selected = copies.filter((copy) => copy.name === name && copy.version.startsWith(row.linePrefix));
      if (selected.length === 0) {
        failures.push(`advisory=${row.advisoryIds.join(" ")} missing_line=${name} ${row.linePrefix}`);
        continue;
      }
      for (const copy of selected) {
        const clean = parseCleanVersion(copy.version);
        if (clean === null) {
          failures.push(`advisory=${row.advisoryIds.join(" ")} package=${name} locked=${copy.version} fixed=${row.fixedVersion} version_is_not_clean`);
          continue;
        }
        if (compareVersions(copy.version, row.fixedVersion) < 0) {
          failures.push(
            `advisory=${row.advisoryIds.join(" ")} package=${name} locked=${copy.version} fixed=${row.fixedVersion} section=${copy.section}`,
          );
        }
      }
    }
  }
  return failures;
}

/**
 * Returns the resolved version of each importer for the four core packages.
 * The importers section holds the version that each workspace unit receives.
 */
function collectImporterVersions(lockfileText: string): { importer: string; name: string; version: string }[] {
  const lines = lockfileText.split(/\r?\n/);
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimEnd() === "importers:") {
      start = i + 1;
    } else if (start !== -1 && lines[i].trim() !== "" && !/^\s/.test(lines[i]) && lines[i].endsWith(":")) {
      end = i;
      break;
    }
  }
  if (start === -1) return [];
  const out: { importer: string; name: string; version: string }[] = [];
  let importer = "<root>";
  let dependency = "";
  for (const line of lines.slice(start, end)) {
    const importerMatch = line.match(/^  ([^ #].*):$/);
    if (importerMatch) {
      importer = importerMatch[1].trim();
      continue;
    }
    const dependencyMatch = line.match(/^      ([^ ].*):$/);
    if (dependencyMatch) {
      dependency = dependencyMatch[1].trim().replace(/^['"]|['"]$/g, "");
      continue;
    }
    const versionMatch = line.match(/^        version: (\S+)/);
    if (versionMatch && CORE_PACKAGES.includes(dependency)) {
      out.push({ importer, name: dependency, version: versionMatch[1].split("(")[0] });
    }
  }
  return out;
}

/**
 * Checks the resolved version of every importer against the guard floors.
 */
function checkImporterVersions(lockfileText: string, entries: GuardEntry[] = GUARD_ENTRIES): string[] {
  const failures: string[] = [];
  const resolved = collectImporterVersions(lockfileText);
  if (resolved.length === 0) {
    failures.push("importers: section holds no resolved version for the core packages");
    return failures;
  }
  for (const item of resolved) {
    const rows = floorRows(item.name, entries).filter((row) => item.version.startsWith(row.linePrefix));
    if (rows.length === 0) {
      failures.push(`package=${item.name} importer=${item.importer} locked=${item.version} has no floor row`);
      continue;
    }
    for (const row of rows) {
      if (compareVersions(item.version, row.fixedVersion) < 0) {
        failures.push(
          `advisory=${row.advisoryIds.join(" ")} package=${item.name} importer=${item.importer} locked=${item.version} fixed=${row.fixedVersion}`,
        );
      }
    }
  }
  return failures;
}

/**
 * Parses a flat `key: value` block of the workspace file. The `overrides` and
 * the `catalog` block use this form.
 */
function parseWorkspaceBlock(src: string, blockName: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = src.split(/\r?\n/);
  let inBlock = false;
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/, "");
    if (line === "") continue;
    if (!inBlock) {
      if (line === `${blockName}:`) inBlock = true;
      continue;
    }
    if (!line.startsWith(" ")) break;
    const match = line.match(/^ {2}(".*?"|'.*?'|[^:]+):\s*(.*)$/);
    if (!match) continue;
    let key = match[1];
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }
    out[key] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

/**
 * Checks the override block against the guard floors and the required pins.
 * A key of the guard list must hold an exact version at or above the floor.
 * A key of the required pin list must hold the exact required value.
 * A key outside both lists is a failure.
 * A key of the no fix list or of the open major list is a failure.
 */
function checkOverrides(
  overrides: Record<string, string>,
  entries: GuardEntry[] = GUARD_ENTRIES,
  required: Record<string, string> = STRATEGY_REQUIRED_PINS,
): string[] {
  const failures: string[] = [];
  if (Object.keys(overrides).length === 0) {
    failures.push("the overrides block holds no key");
    return failures;
  }
  for (const key of Object.keys(overrides)) {
    const value = overrides[key];
    if (NO_FIX_AVAILABLE.some((row) => row.packageName === key)) {
      failures.push(`key=${key} has no patched release and must not be an override`);
      continue;
    }
    if (OPEN_MAJORS.some((row) => row.packageName === key)) {
      failures.push(`key=${key} is an open major and must not be an override`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(required, key)) {
      if (value !== required[key]) {
        failures.push(`key=${key} expected=${required[key]} actual=${value}`);
      }
      continue;
    }
    const rows = floorRows(key, entries);
    if (rows.length === 0) {
      failures.push(`key=${key} is not in the guard floor list`);
      continue;
    }
    if (!/^\d+(\.\d+)+$/.test(value)) {
      failures.push(`key=${key} is not an exact version`);
      continue;
    }
    const onLine = rows.filter((row) => {
      if (row.fixedVersion.startsWith("0.")) return value.startsWith(row.fixedVersion.split(".").slice(0, 2).join("."));
      return value.split(".")[0] === row.fixedVersion.split(".")[0];
    });
    if (onLine.length === 0) {
      failures.push(`key=${key} crosses a major`);
      continue;
    }
    if (!onLine.some((row) => compareVersions(value, row.fixedVersion) >= 0)) {
      failures.push(`key=${key} is below the fixed version`);
    }
  }
  return failures;
}

/**
 * Checks the guard list against the no fix list, the open major list, and the
 * required pin list. A floor must not name a package without a patched release.
 * A required pin that names a guarded package must equal the floor.
 */
function checkGuardList(
  entries: GuardEntry[] = GUARD_ENTRIES,
  required: Record<string, string> = STRATEGY_REQUIRED_PINS,
): string[] {
  const failures: string[] = [];
  for (const entry of entries) {
    if (NO_FIX_AVAILABLE.some((row) => row.packageName === entry.packageName)) {
      failures.push(`package=${entry.packageName} has no patched release and must not be a floor`);
    }
    if (OPEN_MAJORS.some((row) => row.packageName === entry.packageName)) {
      failures.push(`package=${entry.packageName} is an open major and must not be a floor`);
    }
    if (OUT_OF_SCOPE_MAJORS.includes(entry.packageName)) {
      failures.push(`package=${entry.packageName} is an out of scope major and must not be a floor`);
    }
    if (!/^\d+(\.\d+)*$/.test(entry.fixedVersion)) {
      failures.push(`package=${entry.packageName} fixed=${entry.fixedVersion} is not a version`);
    }
    if (entry.advisoryIds.length === 0) {
      failures.push(`package=${entry.packageName} holds no advisory id`);
    }
    if (!entry.requirePresent) {
      failures.push(`package=${entry.packageName} must require presence`);
    }
    const pinned = required[entry.packageName];
    if (pinned !== undefined && pinned !== entry.fixedVersion) {
      failures.push(`package=${entry.packageName} pin=${pinned} floor=${entry.fixedVersion} the two sources differ`);
    }
  }
  for (const key of Object.keys(required)) {
    if (!floorRows(key, entries).length) continue;
    const rows = floorRows(key, entries);
    if (!rows.some((row) => row.fixedVersion === required[key])) {
      failures.push(`package=${key} pin=${required[key]} has no equal floor row`);
    }
  }
  return failures;
}

/**
 * Checks that the phase changed no Dockerfile and no Cloud Build file.
 */
function checkChangedFiles(files: string[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    if (PROTECTED_FILE_PATTERNS.some((pattern) => pattern.test(normalized))) {
      failures.push(`file=${normalized} must not change in this phase`);
    }
  }
  return failures;
}

/**
 * Returns the files that a git range changed. The paths come from git.
 */
function gitChangedFiles(from: string, to: string): string[] {
  const out = execFileSync("git", ["diff", "--name-only", `${from}..${to}`], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60000,
  });
  return out.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
}

/**
 * Finds every package.json file under the repository root.
 */
function findPackageJsonFiles(root: string): string[] {
  const out: string[] = [];
  const skip = new Set(["node_modules", ".git", ".turbo", ".next", "dist", "coverage"]);
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop() as string;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (skip.has(name) || name.startsWith(".")) continue;
      const path = join(dir, name);
      let stats;
      try {
        stats = statSync(path);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        stack.push(path);
      } else if (name === "package.json") {
        out.push(path);
      }
    }
  }
  return out;
}

/** One declared dependency of one manifest. */
interface ManifestEntry {
  file: string;
  section: string;
  name: string;
  value: string;
}

/**
 * Reads every declared dependency of the four core packages from every
 * manifest of the repository.
 */
function collectManifestEntries(): ManifestEntry[] {
  const out: ManifestEntry[] = [];
  const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const file of findPackageJsonFiles(ROOT)) {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }
    for (const section of sections) {
      const block = (pkg[section] ?? {}) as Record<string, string>;
      for (const name of CORE_PACKAGES) {
        const value = block[name];
        if (value === undefined) continue;
        out.push({ file: relative(ROOT, file), section, name, value });
      }
    }
  }
  return out;
}

/**
 * Checks the direct dependency entries of the manifests. A next, react, or
 * react-dom entry must equal the override value. A sharp entry must use the
 * catalog. A catalog entry must not admit a version below the floor.
 */
function checkManifestDirectEntries(
  entries: ManifestEntry[],
  overrides: Record<string, string>,
  catalog: Record<string, string>,
  floors: GuardEntry[] = GUARD_ENTRIES,
): string[] {
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.section !== "dependencies" && entry.section !== "devDependencies") continue;
    if (entry.name === "sharp") {
      if (entry.value !== "catalog:") {
        failures.push(`package=sharp file=${entry.file} section=${entry.section} declared=${entry.value} the catalog holds the only sharp range`);
      }
      continue;
    }
    const override = overrides[entry.name];
    if (override === undefined) {
      failures.push(`package=${entry.name} file=${entry.file} section=${entry.section} has no override`);
      continue;
    }
    if (entry.value === override) continue;
    if (entry.value === "catalog:") {
      const range = catalog[entry.name];
      const minimum = range === undefined ? null : rangeMinimum(range);
      const row = floors.find((item) => item.packageName === entry.name);
      if (minimum === null || row === undefined || compareVersions(minimum, row.fixedVersion) < 0) {
        failures.push(`package=${entry.name} file=${entry.file} section=${entry.section} catalog=${range ?? "missing"} fixed=${row?.fixedVersion ?? "missing"}`);
      }
      continue;
    }
    failures.push(`package=${entry.name} file=${entry.file} section=${entry.section} declared=${entry.value} override=${override}`);
  }
  return failures;
}

/**
 * Checks the peer ranges of the manifests. A peer range must not admit a
 * version below the floor. The packages that hold such a range are returned.
 */
function checkManifestPeerRanges(
  entries: ManifestEntry[],
  floors: GuardEntry[] = GUARD_ENTRIES,
): { file: string; name: string; value: string }[] {
  const out: { file: string; name: string; value: string }[] = [];
  for (const entry of entries) {
    if (entry.section !== "peerDependencies" && entry.section !== "optionalDependencies") continue;
    const row = floors.find((item) => item.packageName === entry.name);
    if (!row) continue;
    const minimum = rangeMinimum(entry.value);
    if (minimum === null) continue;
    if (compareVersions(minimum, row.fixedVersion) < 0) {
      out.push({ file: entry.file, name: entry.name, value: entry.value });
    }
  }
  return out;
}

/**
 * Compares the overrides block of the lockfile with the overrides block of
 * the workspace file. A difference means that the lockfile was built with
 * other overrides.
 */
function checkLockfileOverrides(lockfileText: string, workspaceOverrides: Record<string, string>): string[] {
  const lines = lockfileText.split(/\r?\n/);
  const lockOverrides: Record<string, string> = {};
  let inBlock = false;
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/, "");
    if (line === "") continue;
    if (!inBlock) {
      if (line === "overrides:") inBlock = true;
      continue;
    }
    if (!line.startsWith(" ")) break;
    const match = line.match(/^ {2}(".*?"|'.*?'|[^:]+):\s*(.*)$/);
    if (!match) continue;
    let key = match[1];
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }
    lockOverrides[key] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  const failures: string[] = [];
  for (const key of Object.keys(workspaceOverrides)) {
    if (lockOverrides[key] !== workspaceOverrides[key]) {
      failures.push(`key=${key} workspace=${workspaceOverrides[key]} lockfile=${lockOverrides[key] ?? "missing"}`);
    }
  }
  for (const key of Object.keys(lockOverrides)) {
    if (workspaceOverrides[key] === undefined) {
      failures.push(`key=${key} workspace=missing lockfile=${lockOverrides[key]}`);
    }
  }
  return failures;
}

/** One row of the advisory table of the audit file. */
interface AuditRow {
  packageName: string;
  severity: string;
  advisoryIds: string[];
  locked: string[];
  fixed: string[];
}

/**
 * Parses the advisory table of the audit file. The table names the locked
 * version, the fixed version, and the advisory ids of every package.
 */
function parseAuditRows(auditText: string): Map<string, AuditRow> {
  const rows = new Map<string, AuditRow>();
  const lines = auditText.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith("## 2."));
  const end = lines.findIndex((line, index) => index > start && line.startsWith("### 2.1"));
  if (start === -1) return rows;
  for (const line of lines.slice(start, end === -1 ? lines.length : end)) {
    if (!line.startsWith("| `")) continue;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    if (cells.length < 5) continue;
    const packageName = cells[0].replace(/`/g, "");
    const severity = cells[1];
    const advisoryIds = cells[2].split(/\s+/).filter((id) => id.startsWith("GHSA-"));
    const pairs = cells[3].match(/([0-9][0-9A-Za-z.\-]*)\s*→\s*([0-9][0-9A-Za-z.\-]*)/g) ?? [];
    const locked: string[] = [];
    const fixed: string[] = [];
    for (const pair of pairs) {
      const parts = pair.split("→");
      locked.push(parts[0].trim());
      fixed.push(parts[1].trim());
    }
    rows.set(packageName, { packageName, severity, advisoryIds, locked, fixed });
  }
  return rows;
}

/**
 * Parses the patched versions of the React advisories. The audit states them
 * in the table of section 3.
 */
function parseAuditReactPatched(auditText: string): string[] {
  const lines = auditText.split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith("## 3."));
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## 4."));
  if (start === -1) return [];
  const patched: string[] = [];
  for (const line of lines.slice(start, end === -1 ? lines.length : end)) {
    if (!line.startsWith("| GHSA-")) continue;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    const last = cells[cells.length - 1];
    for (const part of last.split(",")) {
      const value = part.trim().replace(/`/g, "");
      if (/^\d+(\.\d+)*$/.test(value)) patched.push(value);
    }
  }
  return patched;
}

/**
 * Parses the locked React version that the audit states in section 3.
 */
function parseAuditReactLocked(auditText: string): { name: string; version: string }[] {
  const out: { name: string; version: string }[] = [];
  const match = auditText.match(/`react@([0-9][0-9.]*)`\s+and\s+`react-dom@([0-9][0-9.]*)`/);
  if (!match) return out;
  out.push({ name: "react", version: match[1] });
  out.push({ name: "react-dom", version: match[2] });
  return out;
}

/**
 * Checks the sharp range of the catalog. The catalog holds the only sharp
 * range. The range must not admit a version below the floor.
 */
function checkCatalogSharp(catalog: Record<string, string>, entries: GuardEntry[] = GUARD_ENTRIES): string[] {
  const failures: string[] = [];
  const range = catalog.sharp;
  if (range === undefined) {
    failures.push("the catalog holds no sharp range");
    return failures;
  }
  const minimum = rangeMinimum(range);
  const row = floorRows("sharp", entries)[0];
  if (minimum === null) {
    failures.push(`catalog sharp=${range} holds no number`);
    return failures;
  }
  if (row && compareVersions(minimum, row.fixedVersion) < 0) {
    failures.push(`catalog sharp=${range} admits a version below ${row.fixedVersion}`);
  }
  return failures;
}

/**
 * Checks the guard floors against the audit file. The audit holds the source
 * of every version. A floor must equal the fixed version of the audit.
 * An audited package must sit in the guard list, in the no fix list, in the
 * open major list, or in the out of scope major list.
 */
function checkAuditAgainstGuard(auditText: string, entries: GuardEntry[] = GUARD_ENTRIES): string[] {
  const failures: string[] = [];
  const auditRows = parseAuditRows(auditText);
  if (auditRows.size === 0) {
    failures.push("the audit table holds no row");
    return failures;
  }
  const reactPatched = parseAuditReactPatched(auditText);
  const reactLocked = parseAuditReactLocked(auditText);
  for (const row of auditRows.values()) {
    const inGuard = floorRows(row.packageName, entries).length > 0;
    const inNoFix = NO_FIX_AVAILABLE.some((item) => item.packageName === row.packageName);
    const inOpenMajor = OPEN_MAJORS.some((item) => item.packageName === row.packageName);
    const outOfScope = OUT_OF_SCOPE_MAJORS.includes(row.packageName);
    if (!inGuard && !inNoFix && !inOpenMajor && !outOfScope) {
      failures.push(`package=${row.packageName} is audited but holds no register`);
      continue;
    }
    if (!inGuard) continue;
    const floors = floorRows(row.packageName, entries);
    for (const floor of floors) {
      if (row.fixed.length > 0 && !row.fixed.includes(floor.fixedVersion)) {
        failures.push(`package=${row.packageName} floor=${floor.fixedVersion} audit_fixed=${row.fixed.join(",")}`);
      }
      for (const advisoryId of floor.advisoryIds) {
        if (row.advisoryIds.length > 0 && !row.advisoryIds.includes(advisoryId)) {
          failures.push(`package=${row.packageName} advisory=${advisoryId} is not in the audit row`);
        }
      }
      if (floor.linePrefix === "") continue;
      const matchingLocked = row.locked.filter((version) => version.startsWith(floor.linePrefix));
      if (matchingLocked.length === 0) {
        failures.push(`package=${row.packageName} floor=${floor.fixedVersion} prefix=${floor.linePrefix} matches no audited locked version`);
      }
    }
  }
  for (const item of reactLocked) {
    const floors = floorRows(item.name, entries);
    if (floors.length === 0) {
      failures.push(`package=${item.name} has no floor row`);
      continue;
    }
    for (const floor of floors) {
      if (!item.version.startsWith(floor.linePrefix)) {
        failures.push(`package=${item.name} audited_locked=${item.version} prefix=${floor.linePrefix}`);
        continue;
      }
      const patched = reactPatched.filter((version) => version.startsWith(floor.linePrefix));
      if (patched.length > 0 && !patched.includes(floor.fixedVersion)) {
        failures.push(`package=${item.name} floor=${floor.fixedVersion} audit_patched=${patched.join(",")}`);
      }
    }
  }
  return failures;
}

/**
 * Extracts a top level block from the source of the guard test. The block
 * starts at the header. The block ends at the closing brace.
 */
function extractBlock(src: string, header: string): string {
  const at = src.indexOf(header);
  if (at === -1) throw new Error(`the guard source holds no block ${header}`);
  const lineStart = src.lastIndexOf("\n", at) + 1;
  let braceStart = -1;
  const parenAt = src.indexOf("(", at);
  const equalsAt = src.indexOf("=", at);
  if (parenAt !== -1 && (equalsAt === -1 || parenAt < equalsAt)) {
    let depth = 0;
    for (let i = parenAt; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") {
        depth--;
        if (depth === 0) {
          braceStart = src.indexOf("{", i);
          break;
        }
      }
    }
  } else if (equalsAt !== -1) {
    braceStart = src.indexOf("{", equalsAt);
  }
  if (braceStart === -1) throw new Error(`the guard source holds no body for ${header}`);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(lineStart, i + 1);
    }
  }
  throw new Error(`the guard source holds no end for ${header}`);
}

/** The names of the guard functions that the harness loads. */
const GUARD_FUNCTION_NAMES = [
  "compareVersions",
  "extractPackagesSection",
  "parseLockedVersions",
  "evaluateGuard",
  "parseFlatBlock",
  "evaluateOverrideContract",
  "inventedFixFailures",
];

/**
 * Loads the real guard code from the source file of the guard test. The code
 * is not copied and not edited. The TypeScript compiler removes the type
 * marks. The function bodies stay the same as the ones that the guard test
 * runs.
 */
function loadGuardImplementation(): Record<string, unknown> {
  const src = readFileSync(GUARD_TEST_PATH, "utf8");
  const parts = GUARD_FUNCTION_NAMES.map((name) => extractBlock(src, `function ${name}(`));
  parts.push(extractBlock(src, "const REQUIRED_OVERRIDE_PINS"));
  const code = parts.join("\n\n");
  const require = createRequire(import.meta.url);
  const ts = require("typescript") as typeof import("typescript");
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/^\s*export\s*\{\s*\}\s*;?\s*$/m, "");
  const factory = new Function(
    `${transpiled}\nreturn { ${GUARD_FUNCTION_NAMES.join(", ")}, REQUIRED_OVERRIDE_PINS };`,
  ) as () => Record<string, unknown>;
  return factory();
}

type GuardImplementation = {
  extractPackagesSection: (src: string) => string;
  parseLockedVersions: (section: string) => Map<string, string[]>;
  evaluateGuard: (locked: Map<string, string[]>, entries: GuardEntry[]) => string[];
  parseFlatBlock: (src: string, blockName: string) => Record<string, string>;
  evaluateOverrideContract: (
    actual: Record<string, string>,
    required: Record<string, string>,
    entries: GuardEntry[],
  ) => string[];
  inventedFixFailures: (entry: { packageName: string; fixedVersion: string | null }) => string[];
  REQUIRED_OVERRIDE_PINS: Record<string, string>;
};

const LOCKFILE_TEXT = readFileSync(LOCKFILE_PATH, "utf8");
const WORKSPACE_TEXT = readFileSync(WORKSPACE_PATH, "utf8");
const AUDIT_TEXT = readFileSync(AUDIT_PATH, "utf8");
const WORKSPACE_OVERRIDES = parseWorkspaceBlock(WORKSPACE_TEXT, "overrides");
const WORKSPACE_CATALOG = parseWorkspaceBlock(WORKSPACE_TEXT, "catalog");

/** A synthetic lockfile that holds one bad copy of sharp. */
const BAD_SHARP_LOCKFILE = [
  "lockfileVersion: '9.0'",
  "",
  "overrides:",
  "  next: 16.4.1",
  "",
  "packages:",
  "",
  "  next@16.4.1:",
  "    resolution: {integrity: sha512-next}",
  "",
  "  sharp@0.34.5:",
  "    resolution: {integrity: sha512-sharp}",
  "",
  "snapshots:",
  "",
  "  next@16.4.1:",
  "    dependencies:",
  "      sharp: 0.34.5",
  "",
].join("\n");

describe("the real guard implementation runs on a synthetic bad fixture", () => {
  let guard: GuardImplementation;

  beforeAll(() => {
    const loaded = loadGuardImplementation();
    for (const name of [...GUARD_FUNCTION_NAMES, "REQUIRED_OVERRIDE_PINS"]) {
      if (loaded[name] === undefined) throw new Error(`the guard source holds no ${name}`);
    }
    guard = loaded as unknown as GuardImplementation;
  });

  it("loads the guard code from the source file of the guard test", () => {
    expect(typeof guard.evaluateGuard).toBe("function");
    expect(typeof guard.evaluateOverrideContract).toBe("function");
    expect(Object.keys(guard.REQUIRED_OVERRIDE_PINS).length).toBe(10);
  });

  it("fails a sharp copy of 0.34.5 that sits under next", () => {
    const section = guard.extractPackagesSection(BAD_SHARP_LOCKFILE);
    const locked = guard.parseLockedVersions(section);
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "sharp");
    const message = guard.evaluateGuard(locked, entries).join("\n");
    expect(message).toContain("package=sharp");
    expect(message).toContain("locked=0.34.5");
    expect(message).toContain("fixed=0.35.5");
  });

  it("fails a next copy of 16.2.9 with every required label", () => {
    const section = guard.extractPackagesSection("packages:\n\n  next@16.2.9:\n    resolution: {integrity: sha512-x}\n");
    const locked = guard.parseLockedVersions(section);
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "next");
    const message = guard.evaluateGuard(locked, entries).join("\n");
    expect(message).toContain("advisory=");
    expect(message).toContain("package=next");
    expect(message).toContain("locked=16.2.9");
    expect(message).toContain("fixed=16.4.1");
  });

  it("fails a scoped package that sits below its floor", () => {
    const section = guard.extractPackagesSection(
      "packages:\n\n  '@sentry/nextjs@10.59.0':\n    resolution: {integrity: sha512-x}\n",
    );
    const locked = guard.parseLockedVersions(section);
    const entries = GUARD_ENTRIES.filter((entry) => entry.packageName === "@sentry/nextjs");
    const message = guard.evaluateGuard(locked, entries).join("\n");
    expect(message).toContain("package=@sentry/nextjs");
    expect(message).toContain("locked=10.59.0");
  });

  it("fails an empty packages section", () => {
    const section = guard.extractPackagesSection("packages:\n");
    const locked = guard.parseLockedVersions(section);
    expect(guard.evaluateGuard(locked, GUARD_ENTRIES).length).toBeGreaterThan(0);
  });

  it("fails an empty guard list", () => {
    const section = guard.extractPackagesSection("packages:\n\n  next@16.4.1:\n    resolution: {integrity: sha512-x}\n");
    const locked = guard.parseLockedVersions(section);
    expect(guard.evaluateGuard(locked, []).length).toBeGreaterThan(0);
  });

  it("passes the real lockfile of the repository", () => {
    const section = guard.extractPackagesSection(LOCKFILE_TEXT);
    const locked = guard.parseLockedVersions(section);
    const failures = guard.evaluateGuard(locked, GUARD_ENTRIES);
    expect(failures).toEqual([]);
  });

  it("fails an override that sits below a floor", () => {
    const actual = { ...guard.REQUIRED_OVERRIDE_PINS, sharp: "0.34.5" };
    const message = guard.evaluateOverrideContract(actual, guard.REQUIRED_OVERRIDE_PINS, GUARD_ENTRIES).join("\n");
    expect(message).toContain("key=sharp");
  });

  it("fails an override that names a package without a patched release", () => {
    const actual = { ...guard.REQUIRED_OVERRIDE_PINS, "extract-zip": "2.0.2" };
    const message = guard.evaluateOverrideContract(actual, guard.REQUIRED_OVERRIDE_PINS, GUARD_ENTRIES).join("\n");
    expect(message).toContain("key=extract-zip");
  });

  it("passes the real override block of the repository", () => {
    const overrides = guard.parseFlatBlock(WORKSPACE_TEXT, "overrides");
    const failures = guard.evaluateOverrideContract(overrides, guard.REQUIRED_OVERRIDE_PINS, GUARD_ENTRIES);
    expect(failures).toEqual([]);
  });

  it("keeps the required pins of the source equal to the strategy pins", () => {
    expect(guard.REQUIRED_OVERRIDE_PINS).toEqual(STRATEGY_REQUIRED_PINS);
  });
});

describe("every resolved copy sits at or above its floor", () => {
  it("fails a synthetic lockfile that holds a bad sharp copy", () => {
    const failures = checkResolvedCopies(BAD_SHARP_LOCKFILE);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("locked=0.34.5");
  });

  it("fails a synthetic lockfile that holds a bad copy in the snapshots section", () => {
    const text = [
      "packages:",
      "",
      "  next@16.4.1:",
      "    resolution: {integrity: sha512-x}",
      "",
      "snapshots:",
      "",
      "  sharp@0.34.5(@types/node@20.19.43):",
      "    dependencies:",
      "      '@types/node': 20.19.43",
      "",
    ].join("\n");
    const failures = checkResolvedCopies(text);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("locked=0.34.5");
  });

  it("fails a synthetic lockfile that holds a prerelease of the floor version", () => {
    const text = [
      "packages:",
      "",
      "  react@19.2.9-rc.0:",
      "    resolution: {integrity: sha512-x}",
      "",
    ].join("\n");
    const failures = checkResolvedCopies(text);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("version_is_not_clean");
  });

  it("passes the real lockfile of the repository", () => {
    expect(checkResolvedCopies(LOCKFILE_TEXT)).toEqual([]);
  });

  it("finds at least one resolved copy of every core package", () => {
    const copies = collectResolvedCopies(LOCKFILE_TEXT);
    for (const name of CORE_PACKAGES) {
      expect(copies.filter((copy) => copy.name === name).length).toBeGreaterThan(0);
    }
  });

  it("finds a peer suffixed copy in the snapshots section", () => {
    const copies = collectResolvedCopies(LOCKFILE_TEXT);
    const peers = copies.filter((copy) => copy.section === "snapshots");
    expect(peers.length).toBeGreaterThan(0);
  });
});

describe("every importer resolves a version at or above its floor", () => {
  it("fails a synthetic lockfile that resolves next below its floor", () => {
    const text = [
      "importers:",
      "",
      "  apps/one:",
      "    dependencies:",
      "      next:",
      "        specifier: 16.2.9",
      "        version: 16.2.9",
      "",
      "packages:",
      "",
      "  next@16.4.1:",
      "    resolution: {integrity: sha512-x}",
      "",
    ].join("\n");
    const failures = checkImporterVersions(text);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("locked=16.2.9");
  });

  it("passes the real lockfile of the repository", () => {
    expect(checkImporterVersions(LOCKFILE_TEXT)).toEqual([]);
  });

  it("resolves a version for every core package", () => {
    const resolved = collectImporterVersions(LOCKFILE_TEXT);
    for (const name of CORE_PACKAGES) {
      expect(resolved.filter((item) => item.name === name).length).toBeGreaterThan(0);
    }
  });
});

describe("every override holds an exact pin at or above its floor", () => {
  it("fails a synthetic override that sits below a floor", () => {
    const failures = checkOverrides({ ...WORKSPACE_OVERRIDES, sharp: "0.34.5" });
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("key=sharp");
  });

  it("fails a synthetic override that names a package without a patched release", () => {
    const failures = checkOverrides({ ...WORKSPACE_OVERRIDES, "extract-zip": "2.0.2" });
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("key=extract-zip");
  });

  it("fails a synthetic override that names an open major", () => {
    const failures = checkOverrides({ ...WORKSPACE_OVERRIDES, "@opentelemetry/sdk-node": "0.217.0" });
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("key=@opentelemetry/sdk-node");
  });

  it("fails a synthetic override that holds a range", () => {
    const failures = checkOverrides({ ...WORKSPACE_OVERRIDES, compression: "^1.8.2" });
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("key=compression");
  });

  it("passes the real override block of the repository", () => {
    expect(checkOverrides(WORKSPACE_OVERRIDES)).toEqual([]);
  });

  it("fails a synthetic override block that holds no key", () => {
    const failures = checkOverrides({});
    expect(failures.length).toBe(1);
    expect(failures.join("\n")).toContain("the overrides block holds no key");
  });

  it("fails a synthetic catalog that admits a sharp version below the floor", () => {
    const failures = checkCatalogSharp({ ...WORKSPACE_CATALOG, sharp: "^0.34.5" });
    expect(failures.length).toBe(1);
    expect(failures.join("\n")).toContain("admits a version below 0.35.5");
  });

  it("passes the real catalog of the repository", () => {
    expect(checkCatalogSharp(WORKSPACE_CATALOG)).toEqual([]);
  });

  it("holds one override for each required pin", () => {
    for (const key of Object.keys(STRATEGY_REQUIRED_PINS)) {
      expect(WORKSPACE_OVERRIDES[key]).toBe(STRATEGY_REQUIRED_PINS[key]);
    }
  });
});

describe("the guard list holds only floors with a patched release", () => {
  it("fails a synthetic guard list that floors a package without a patched release", () => {
    const synthetic: GuardEntry[] = [
      ...GUARD_ENTRIES,
      { advisoryIds: ["GHSA-7pqw-9j4j-h8q3"], packageName: "extract-zip", linePrefix: "2.", fixedVersion: "2.0.2", requirePresent: true },
    ];
    const failures = checkGuardList(synthetic);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("package=extract-zip");
  });

  it("fails a synthetic guard list that floors an open major", () => {
    const synthetic: GuardEntry[] = [
      ...GUARD_ENTRIES,
      {
        advisoryIds: ["GHSA-q7rr-3cgh-j5r3"],
        packageName: "@opentelemetry/sdk-node",
        linePrefix: "0.",
        fixedVersion: "0.217.0",
        requirePresent: true,
      },
    ];
    const failures = checkGuardList(synthetic);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("package=@opentelemetry/sdk-node");
  });

  it("fails a synthetic pin that differs from the floor of the guard list", () => {
    const synthetic = { ...STRATEGY_REQUIRED_PINS, next: "16.2.9" };
    const failures = checkGuardList(GUARD_ENTRIES, synthetic);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("package=next");
  });

  it("passes the real guard list of the repository", () => {
    expect(checkGuardList()).toEqual([]);
  });

  it("names no package of the no fix list and of the open major list", () => {
    for (const row of NO_FIX_AVAILABLE) {
      expect(floorRows(row.packageName)).toEqual([]);
    }
    for (const row of OPEN_MAJORS) {
      expect(floorRows(row.packageName)).toEqual([]);
    }
  });
});

describe("the phase changes no Dockerfile and no Cloud Build file", () => {
  it("fails a synthetic list of changed files", () => {
    const failures = checkChangedFiles(["apps/reading-advantage/Dockerfile", "packages/api/src/index.ts"]);
    expect(failures.length).toBe(1);
    expect(failures.join("\n")).toContain("apps/reading-advantage/Dockerfile");
  });

  it("fails a synthetic list that holds a Cloud Build file", () => {
    const failures = checkChangedFiles(["apps/web/cloudbuild.yaml"]);
    expect(failures.length).toBe(1);
  });

  it("changes no protected file between the phase base and the reviewed head", () => {
    expect(checkChangedFiles(gitChangedFiles(PHASE_BASE_SHA, AUDITED_HEAD_SHA))).toEqual([]);
  });

  it("changes no protected file between the Green gate base and the reviewed head", () => {
    expect(checkChangedFiles(gitChangedFiles(GREEN_GATE_BASE_SHA, AUDITED_HEAD_SHA))).toEqual([]);
  });

  it("keeps the reviewed head inside the branch of the phase base", () => {
    execFileSync("git", ["merge-base", "--is-ancestor", PHASE_BASE_SHA, "HEAD"], { cwd: ROOT, timeout: 60000 });
  });
});

describe("every manifest states the version of the override or of the catalog", () => {
  it("fails a synthetic manifest entry that differs from the override", () => {
    const entries: ManifestEntry[] = [
      { file: "apps/one/package.json", section: "dependencies", name: "react", value: "19.2.7" },
    ];
    const failures = checkManifestDirectEntries(entries, WORKSPACE_OVERRIDES, WORKSPACE_CATALOG);
    expect(failures.length).toBe(1);
    expect(failures.join("\n")).toContain("declared=19.2.7");
  });

  it("fails a synthetic manifest entry that states a sharp range outside the catalog", () => {
    const entries: ManifestEntry[] = [
      { file: "apps/one/package.json", section: "dependencies", name: "sharp", value: "^0.34.5" },
    ];
    const failures = checkManifestDirectEntries(entries, WORKSPACE_OVERRIDES, WORKSPACE_CATALOG);
    expect(failures.length).toBe(1);
    expect(failures.join("\n")).toContain("the catalog holds the only sharp range");
  });

  it("passes the real manifests of the repository", () => {
    expect(checkManifestDirectEntries(collectManifestEntries(), WORKSPACE_OVERRIDES, WORKSPACE_CATALOG)).toEqual([]);
  });

  it("finds at least one direct entry for next, react, and react-dom", () => {
    const entries = collectManifestEntries().filter((entry) => entry.section === "dependencies" || entry.section === "devDependencies");
    for (const name of ["next", "react", "react-dom"]) {
      expect(entries.filter((entry) => entry.name === name).length).toBeGreaterThan(0);
    }
  });

  it("holds the peer range that admits a version below a floor in one package only", () => {
    const peers = checkManifestPeerRanges(collectManifestEntries());
    for (const peer of peers) {
      expect(peer.file).toBe("packages/api/package.json");
      expect(peer.name).toBe("next");
    }
  });

  it("finds a synthetic peer range that admits a version below a floor", () => {
    const entries: ManifestEntry[] = [
      { file: "packages/one/package.json", section: "peerDependencies", name: "react", value: ">=18.0.0" },
    ];
    const peers = checkManifestPeerRanges(entries);
    expect(peers.length).toBe(1);
    expect(peers[0].name).toBe("react");
  });
});

describe("the lockfile holds the overrides of the workspace file", () => {
  it("fails a synthetic pair that holds other overrides", () => {
    const failures = checkLockfileOverrides(LOCKFILE_TEXT, { ...WORKSPACE_OVERRIDES, next: "16.5.0" });
    expect(failures.length).toBe(1);
    expect(failures.join("\n")).toContain("key=next");
  });

  it("passes the real lockfile and the real workspace file", () => {
    expect(checkLockfileOverrides(LOCKFILE_TEXT, WORKSPACE_OVERRIDES)).toEqual([]);
  });
});

describe("the guard floors agree with the audit file", () => {
  it("fails a synthetic audit row that holds another fixed version", () => {
    const synthetic = AUDIT_TEXT.replace("| `next` | critical |", "| `next` | critical |")
      .replace("16.2.9→16.4.1 MINOR", "16.2.9→16.9.9 MINOR");
    const failures = checkAuditAgainstGuard(synthetic);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("package=next");
  });

  it("fails a synthetic audit row that holds another advisory id", () => {
    const synthetic = AUDIT_TEXT.replace("GHSA-2464-fhr4-w9xw", "GHSA-0000-0000-0000");
    const failures = checkAuditAgainstGuard(synthetic);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join("\n")).toContain("GHSA-2464-fhr4-w9xw");
  });

  it("passes the real audit file of the repository", () => {
    expect(checkAuditAgainstGuard(AUDIT_TEXT)).toEqual([]);
  });

  it("holds at least one audited package in the guard list", () => {
    const rows = parseAuditRows(AUDIT_TEXT);
    expect(rows.size).toBeGreaterThan(20);
    expect(rows.get("next")?.fixed).toEqual(["16.4.1"]);
  });
});
