#!/usr/bin/env node
/**
 * Manifest probe for the dependency_upgrade_hardening_20260607 track.
 *
 * Reads every workspace `package.json` plus the root `package.json` overrides
 * and compares declared/resolved versions against an expectations map
 * supplied via `--expectations <path-to-json>`. Exits 0 when the live tree
 * matches the expectations and 1 when any drift is detected (or arguments
 * are invalid). Designed to be the command-construction contract gate for
 * Batches A (framework override) and B (Vitest family alignment) of
 * `test-strategy.md` §7.
 *
 * The expectations JSON is a flat `{ "<package>": "<expectedVersion>" }`
 * map, e.g.:
 *
 *   {
 *     "next": "16.2.9",
 *     "react": "19.2.7",
 *     "react-dom": "19.2.7",
 *     "vitest": "4.1.8",
 *     "@vitest/ui": "4.1.8",
 *     "@vitest/coverage-v8": "4.1.8"
 *   }
 *
 * Version matching normalises common specifier prefixes (`^`, `~`, `>=`,
 * `=`, `*`, bare) by stripping them and comparing the leading SemVer
 * major.minor.patch tuple. Range specifiers containing `||` or
 * comma-separated alternates are rejected as ambiguous (the probe only
 * supports single-target expectations).
 *
 * The probe intentionally does NOT execute `pnpm` or read the lockfile;
 * it is a pure manifest-reading tool so the test harness can drive it
 * against fake workspaces under `os.tmpdir()` without polluting the real
 * install graph.
 *
 * Usage:
 *   node manifest-probe.mjs --root <monorepo-root> --expectations <path-to-json>
 *
 * Exit codes:
 *   0 — every package in the expectations map matches a declared
 *       dependency/override at the expected version
 *   1 — drift detected, arguments invalid, or IO error
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parses CLI arguments. The first non-flag argument is treated as the
 * expectations file path. All other flags must use `--key value` form.
 *
 * @param {string[]} argv Process argv slice (without node binary/script).
 * @returns {{root: string, expectations: string}}
 */
function parseArgs(argv) {
  const args = argv.slice();
  let root = null;
  let expectations = null;

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--root") {
      root = args[i + 1];
      i += 1;
    } else if (a === "--expectations") {
      expectations = args[i + 1];
      i += 1;
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (!root) {
    throw new Error("--root <monorepo-root> is required");
  }
  if (!expectations) {
    throw new Error("--expectations <path-to-json> is required");
  }
  return { root: resolve(root), expectations: resolve(expectations) };
}

/** Prints CLI usage to stdout. */
function printHelp() {
  process.stdout.write(
    [
      "Usage: manifest-probe.mjs --root <monorepo-root> --expectations <path-to-json>",
      "",
      "Compares every workspace package.json + root overrides against the",
      "supplied expectations map. Exits 0 on full alignment, 1 on drift.",
      "",
    ].join("\n"),
  );
}

/**
 * Normalises a version specifier by stripping the leading `^`, `~`, `>=`,
 * `=`, `*`, or bare-v-prefix characters and returning the leading
 * major.minor.patch tuple. Rejects `||` / comma alternates.
 *
 * @param {string} spec Raw version specifier.
 * @returns {string} Normalised `major.minor.patch` string, or "" if invalid.
 */
export function normaliseVersion(spec) {
  if (typeof spec !== "string") return "";
  const trimmed = spec.trim();
  if (!trimmed) return "";
  if (trimmed.includes("||") || trimmed.includes(",")) return "";
  // Strip an optional leading range prefix: ^, ~, >=, =, v
  const m = trimmed.match(/^(?:[\^~>=v=]+\s*)?(\d+(?:\.\d+(?:\.\d+)?)?)/);
  if (!m) return "";
  return m[1];
}

/**
 * Reads a package.json file and returns its parsed body, or null on error.
 *
 * @param {string} path Absolute file path.
 * @returns {object|null}
 */
function readPackageJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Walks the monorepo root and returns every workspace package.json path
 * found under the apps and packages top-level directories. Paths are
 * absolute.
 *
 * @param {string} root Monorepo root directory.
 * @returns {string[]} Absolute paths to every workspace package.json.
 */
function discoverWorkspaceManifests(root) {
  const dirs = ["apps", "packages"];
  const out = [];
  for (const top of dirs) {
    const base = join(root, top);
    let entries;
    try {
      entries = readdirSync(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = join(base, entry.name, "package.json");
      try {
        if (statSync(candidate).isFile()) {
          out.push(candidate);
        }
      } catch {
        // skip missing
      }
    }
  }
  return out;
}

/**
 * Returns every (workspace, package, declaredVersion) triple for the
 * supplied manifest path, with version specifiers normalised to leading
 * major.minor.patch. Direct and dev dependencies are both included.
 *
 * @param {string} manifestPath Absolute path to a workspace package.json.
 * @returns {Array<{workspace: string, package: string, version: string, raw: string, kind: "dependency"|"devDependency"|"override"|"missing"}>}
 */
export function collectDeclaredVersions(manifestPath) {
  const json = readPackageJson(manifestPath);
  if (!json) return [];
  const workspace = json.name || basename(dirname(manifestPath));
  const out = [];
  for (const kind of ["dependencies", "devDependencies"]) {
    const section = json[kind];
    if (!section) continue;
    for (const [pkg, raw] of Object.entries(section)) {
      out.push({
        workspace,
        package: pkg,
        raw: String(raw),
        version: normaliseVersion(String(raw)),
        kind: kind === "dependencies" ? "dependency" : "devDependency",
      });
    }
  }
  return out;
}

/**
 * Returns the override entries declared in the root `pnpm.overrides` block.
 * Resolved exactly like a workspace package: the override's version
 * specifier is normalised the same way.
 *
 * @param {string} root Monorepo root directory.
 * @returns {Array<{workspace: string, package: string, version: string, raw: string, kind: "override"}>}
 */
export function collectRootOverrides(root) {
  const rootManifest = readPackageJson(join(root, "package.json"));
  if (!rootManifest || !rootManifest.pnpm) return [];
  const overrides = rootManifest.pnpm.overrides;
  if (!overrides || typeof overrides !== "object") return [];
  const out = [];
  for (const [pkg, raw] of Object.entries(overrides)) {
    out.push({
      workspace: "<root-overrides>",
      package: pkg,
      raw: String(raw),
      version: normaliseVersion(String(raw)),
      kind: "override",
    });
  }
  return out;
}

/**
 * Runs the probe against the supplied root and expectations map. Returns a
 * structured report with both the drift entries and the alignment status.
 *
 * @param {string} root Monorepo root.
 * @param {Record<string, string>} expectations Flat package→version map.
 * @returns {{aligned: boolean, drift: Array<{package: string, expected: string, observed: Array<{workspace: string, version: string, kind: string}>}>}}
 */
export function runProbe(root, expectations) {
  const declared = [
    ...collectRootOverrides(root),
    ...discoverWorkspaceManifests(root).flatMap(collectDeclaredVersions),
  ];

  const drift = [];
  for (const [pkg, expectedRaw] of Object.entries(expectations)) {
    const expected = normaliseVersion(expectedRaw);
    const observed = declared
      .filter((d) => d.package === pkg)
      .map((d) => ({
        workspace: d.workspace,
        version: d.version,
        raw: d.raw,
        kind: d.kind,
      }));
    if (observed.length === 0) {
      drift.push({
        package: pkg,
        expected,
        observed: [],
        reason: "not-declared-anywhere",
      });
      continue;
    }
    const allMatch = observed.every((o) => o.version === expected && expected !== "");
    if (!allMatch) {
      drift.push({
        package: pkg,
        expected,
        observed,
        reason: "version-mismatch",
      });
    }
  }

  return { aligned: drift.length === 0, drift };
}

/**
 * Formats the drift report as a human-readable text block suitable for
 * stderr. Each drift entry lists the package, expected version, and every
 * observed declaration (workspace, kind, raw, normalised).
 *
 * @param {Array<{package: string, expected: string, observed: object[], reason: string}>} drift
 * @returns {string}
 */
export function formatDrift(drift) {
  if (drift.length === 0) return "All packages aligned with expectations.";
  const lines = ["Manifest drift detected:"];
  for (const d of drift) {
    lines.push(`  - ${d.package}: expected ${d.expected || "(unparseable)"} (${d.reason})`);
    if (d.observed.length === 0) {
      lines.push("      (no declarations found)");
    } else {
      for (const o of d.observed) {
        lines.push(
          `      ${o.workspace} (${o.kind}): ${o.raw} → ${o.version || "(unparseable)"}`,
        );
      }
    }
  }
  return lines.join("\n");
}

// ── CLI entry ────────────────────────────────────────────────────────────────

function basename(p) {
  const parts = p.split("/");
  return parts[parts.length - 1] || p;
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(__dirname, "manifest-probe.mjs");
}

if (isCliInvocation()) {
  try {
    const { root, expectations } = parseArgs(process.argv.slice(2));
    const expectationsJson = JSON.parse(readFileSync(expectations, "utf8"));
    const result = runProbe(root, expectationsJson);
    if (result.aligned) {
      process.stdout.write("Manifest probe: aligned.\n");
      process.exit(0);
    }
    process.stderr.write(formatDrift(result.drift) + "\n");
    process.exit(1);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}
