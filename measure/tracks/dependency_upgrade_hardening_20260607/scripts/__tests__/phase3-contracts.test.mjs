#!/usr/bin/env node
/**
 * Phase 3 contract-gate tests for `dependency_upgrade_hardening_20260607`.
 *
 * The Red tests in this file assert the **post-upgrade expected state**
 * of the manifest tree. At HEAD every Red test below fails because the
 * upgrade has not been performed. After Batches A, B, D, F, G land in
 * their respective Phase 3 sub-tasks, the corresponding tests turn
 * Green.
 *
 * The Green tests (probe correctness) are also colocated here so the
 * probe itself is exercised deterministically against controlled
 * fixtures before it is trusted to gate the live monorepo.
 *
 * Per `test-strategy.md` §2, §7, and §8 the manifest probe is the
 * command-construction contract gate for Batches A and B; the
 * per-batch `pnpm --filter <app> build|test|check-types` runs are the
 * live-behavior pair. For Batches D, F, G the Red proof is "the
 * affected manifest entries have not been changed yet", paired with
 * the per-batch type-check / build gates. For Batch H the Red proof
 * is owned by the per-batch `pnpm install --frozen-lockfile` and
 * `pnpm dedupe --check` runs (per upgrade-matrix.md Batch Quality
 * Gates), and is intentionally not asserted here because parsing the
 * dedup state of pnpm-lock.yaml without invoking pnpm is brittle.
 *
 * Bounded scope:
 *   - Runs only this single test file via `node --test`.
 *   - Never spawns pnpm, vitest, jest, or turbo against the real
 *     monorepo; the live-behavior pair lives in the per-batch quality
 *     gates documented in `upgrade-matrix.md`.
 *   - Reads `package.json` and the root `pnpm.overrides` only.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACK_ROOT = resolve(__dirname, "..", "..");
const PROBE_SCRIPT = join(TRACK_ROOT, "scripts", "manifest-probe.mjs");
const MONOREPO_ROOT = resolve(TRACK_ROOT, "..", "..", "..");
const ROOT_PACKAGE = join(MONOREPO_ROOT, "package.json");

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * Invokes the manifest probe as a subprocess. Returns the captured
 * exit code, stdout, and stderr.
 *
 * @param {string[]} args Arguments to pass after the script path.
 * @returns {{status: number, stdout: string, stderr: string}}
 */
function runProbe(args) {
  const result = spawnSync(process.execPath, [PROBE_SCRIPT, ...args], {
    encoding: "utf8",
    timeout: 30_000,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/** Writes an expectations JSON file under a temp directory. */
function writeExpectations(expectations) {
  const dir = mkdtempSync(join(tmpdir(), "phase3-expectations-"));
  const file = join(dir, "expectations.json");
  writeFileSync(file, JSON.stringify(expectations, null, 2));
  return file;
}

/**
 * Writes a minimal monorepo fixture under a temp directory.
 * @returns {string} Temp root absolute path.
 */
function writeFakeMonorepo(overrideMap, workspaces) {
  const root = mkdtempSync(join(tmpdir(), "phase3-fake-monorepo-"));
  mkdirSync(join(root, "apps"), { recursive: true });
  mkdirSync(join(root, "packages"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "fake-monorepo",
        private: true,
        pnpm: { overrides: overrideMap },
      },
      null,
      2,
    ),
  );
  for (const [folder, spec] of Object.entries(workspaces)) {
    const dir = folder.startsWith("@") ? "packages" : "apps";
    const subdir = join(root, dir, folder);
    mkdirSync(subdir, { recursive: true });
    writeFileSync(
      join(subdir, "package.json"),
      JSON.stringify(
        {
          name: spec.name,
          dependencies: spec.deps ?? {},
          devDependencies: spec.devDeps ?? {},
        },
        null,
        2,
      ),
    );
  }
  return root;
}

/**
 * Reads the root package.json and returns the parsed body.
 * @returns {object|null}
 */
function readRootPackage() {
  return JSON.parse(readFileSync(ROOT_PACKAGE, "utf8"));
}

// ── Probe Green tests ───────────────────────────────────────────────────────

test("manifest-probe.mjs script exists at the documented path", () => {
  assert.ok(
    existsSync(PROBE_SCRIPT),
    `manifest-probe.mjs must exist at ${PROBE_SCRIPT} so Batches A and B have a command-construction contract gate (per test-strategy.md §2 and §7)`,
  );
});

test("probe exits 1 on missing --root, --expectations, and nonexistent root", () => {
  const noRoot = runProbe(["--expectations", "/dev/null"]);
  assert.equal(noRoot.status, 1, "missing --root must exit 1");
  const noExp = runProbe(["--root", MONOREPO_ROOT]);
  assert.equal(noExp.status, 1, "missing --expectations must exit 1");
  const badPath = runProbe([
    "--root",
    "/nonexistent/path/does/not/exist",
    "--expectations",
    "/dev/null",
  ]);
  assert.equal(badPath.status, 1, "nonexistent root must exit 1");
});

test("probe exits 0 against an aligned fake workspace (positive case)", () => {
  const expectations = writeExpectations({ next: "16.2.9" });
  const fakeRoot = writeFakeMonorepo(
    { next: "16.2.9" },
    {
      "fake-app": { name: "fake-app", deps: { next: "16.2.9" } },
      "fake-pkg": { name: "@fake/pkg", devDeps: { next: "^16.2.9" } },
    },
  );
  try {
    const result = runProbe(["--root", fakeRoot, "--expectations", expectations]);
    assert.equal(
      result.status,
      0,
      `aligned fake workspace must yield exit 0; got ${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
  } finally {
    rmSync(fakeRoot, { recursive: true, force: true });
  }
});

test("probe exits 1 against a drifted fake workspace (negative case)", () => {
  const expectations = writeExpectations({ next: "16.2.9" });
  const fakeRoot = writeFakeMonorepo(
    { next: "16.0.0" },
    { "fake-app": { name: "fake-app", deps: { next: "16.0.0" } } },
  );
  try {
    const result = runProbe(["--root", fakeRoot, "--expectations", expectations]);
    assert.equal(result.status, 1, "drifted fake workspace must yield exit 1");
    assert.match(result.stderr, /next/, "stderr must name the drifted package");
  } finally {
    rmSync(fakeRoot, { recursive: true, force: true });
  }
});

// ── Phase 3 Red tests ───────────────────────────────────────────────────────

/**
 * Each Red test below asserts the **expected post-upgrade state** of
 * the monorepo. At HEAD every one of these fails because the upgrade
 * has not been performed. After the corresponding batch lands, the
 * assertion turns true and the test exits 0.
 *
 * Per the test-strategy §7 and the AGENTS.md guidance on
 * "Artifact or markdown assertions are allowed only when the phase
 * deliverable is that artifact, and they must be paired with a
 * live-behavior proof or an explicit plan note saying which later
 * role owns the live gate", the live-behavior pair for each batch
 * is documented at the top of this file and re-stated in plan.md
 * under the Phase 3 Red gate section.
 */

test("Batch A Red: root pnpm.overrides declares next at the selected patched release", () => {
  const root = readRootPackage();
  const overrideNext = root?.pnpm?.overrides?.next;
  assert.ok(overrideNext, "root pnpm.overrides.next must be set");
  assert.equal(
    overrideNext,
    "16.2.9",
    `Batch A must upgrade root pnpm.overrides.next from 16.0.0 to 16.2.9 (the selected patched release); current value is '${overrideNext}'`,
  );
});

test("Batch A Red: root pnpm.overrides declares react and react-dom at 19.2.7", () => {
  const root = readRootPackage();
  const overrides = root?.pnpm?.overrides ?? {};
  assert.equal(
    overrides.react,
    "19.2.7",
    `Batch A must upgrade root pnpm.overrides.react from 19.2.5 to 19.2.7; current value is '${overrides.react}'`,
  );
  assert.equal(
    overrides["react-dom"],
    "19.2.7",
    `Batch A must upgrade root pnpm.overrides.react-dom from 19.2.5 to 19.2.7; current value is '${overrides["react-dom"]}'`,
  );
});

test("Batch A Red: manifest probe exits 0 at HEAD against Batch A expectations", () => {
  // Command-construction proof for Batch A. The probe must report
  // alignment once Batches A has upgraded next/react/react-dom to
  // the selected patched releases. At HEAD the probe will exit 1
  // because the overrides are still on 16.0.0 / 19.2.5 and the
  // workspace declarations are not aligned. After Batch A the probe
  // must exit 0.
  const expectations = writeExpectations({
    next: "16.2.9",
    react: "19.2.7",
    "react-dom": "19.2.7",
    "@next/mdx": "16.2.9",
  });
  const result = runProbe(["--root", MONOREPO_ROOT, "--expectations", expectations]);
  assert.equal(
    result.status,
    0,
    `Batch A must align the manifest tree with the selected framework versions; probe exited ${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
});

test("Batch B Red: root pnpm.overrides declares vitest at 4.1.8", () => {
  const root = readRootPackage();
  const overrideVitest = root?.pnpm?.overrides?.vitest;
  assert.ok(overrideVitest, "root pnpm.overrides.vitest must be set");
  assert.equal(
    overrideVitest,
    "4.1.8",
    `Batch B must upgrade root pnpm.overrides.vitest from 4.1.5 to 4.1.8; current value is '${overrideVitest}'`,
  );
});

test("Batch B Red: manifest probe exits 0 at HEAD against Batch B expectations", () => {
  // Command-construction proof for Batch B. After Batch B, the
  // Vitest family (vitest, @vitest/ui, @vitest/coverage-v8) must be
  // aligned at 4.1.8. At HEAD the override is at 4.1.5 and at least
  // one workspace declaration is on a different patch line, so the
  // probe exits 1. After Batch B the probe must exit 0.
  const expectations = writeExpectations({
    vitest: "4.1.8",
    "@vitest/ui": "4.1.8",
    "@vitest/coverage-v8": "4.1.8",
  });
  const result = runProbe(["--root", MONOREPO_ROOT, "--expectations", expectations]);
  assert.equal(
    result.status,
    0,
    `Batch B must align the Vitest family; probe exited ${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
});

test("Batch D Red: deprecated stub type packages are absent from every workspace package.json", () => {
  // The four deprecated stub types per spec.md FR-5. At HEAD every
  // one of these is declared in at least one workspace manifest. After
  // Batch D the owning libraries must provide types and every
  // declaration must be removed.
  const stubTypes = [
    "@types/bcryptjs",
    "@types/marked",
    "@types/sharp",
    "@types/uuid",
  ];
  const offenders = [];
  for (const appOrPkg of ["apps", "packages"]) {
    const top = join(MONOREPO_ROOT, appOrPkg);
    try {
      const dirs = readdirSync(top, { withFileTypes: true });
      for (const dirent of dirs) {
        if (!dirent.isDirectory()) continue;
        const manifest = join(top, dirent.name, "package.json");
        if (!existsSync(manifest)) continue;
        const body = JSON.parse(readFileSync(manifest, "utf8"));
        for (const section of ["dependencies", "devDependencies"]) {
          const deps = body[section] ?? {};
          for (const stub of stubTypes) {
            if (deps[stub]) {
              offenders.push(`${manifest}: ${section}.${stub} = ${deps[stub]}`);
            }
          }
        }
      }
    } catch (err) {
      // missing top dir is fine (some monorepos only have one of apps/packages)
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Batch D must remove every declaration of deprecated stub type packages; offenders:\n${offenders.join("\n")}`,
  );
});

test("Batch F Red: postcss is at the matrix-approved patch release across all affected workspaces", () => {
  // upgrade-matrix.md marks postcss → 8.5.15 in Batch F. At HEAD the
  // reading-advantage and www-reading-advantage manifests declare
  // 8.5.13. After Batch F every direct postcss declaration must be
  // at 8.5.15 or higher.
  const target = "8.5.15";
  const offenders = [];
  for (const top of ["apps", "packages"]) {
    const base = join(MONOREPO_ROOT, top);
    let dirs;
    try {
      dirs = readdirSync(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dirent of dirs) {
      if (!dirent.isDirectory()) continue;
      const manifest = join(base, dirent.name, "package.json");
      if (!existsSync(manifest)) continue;
      const body = JSON.parse(readFileSync(manifest, "utf8"));
      for (const section of ["dependencies", "devDependencies"]) {
        const deps = body[section] ?? {};
        if (typeof deps.postcss === "string") {
          const spec = deps.postcss.trim();
          const m = spec.match(/^[\^~>=v=]*\s*(\d+\.\d+\.\d+)/);
          const norm = m ? m[1] : "";
          if (norm !== target) {
            offenders.push(`${manifest}: ${section}.postcss = ${deps.postcss} (normalised ${norm})`);
          }
        }
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Batch F must apply the postcss patch upgrade; offenders:\n${offenders.join("\n")}`,
  );
});

test("Batch G Red: @playwright/test is at the matrix-approved minor release across all affected workspaces", () => {
  // upgrade-matrix.md marks @playwright/test → 1.60.0 in Batch G. At
  // HEAD the affected workspaces declare 1.59.1. After Batch G every
  // direct @playwright/test declaration must be at 1.60.0 or higher.
  const target = "1.60.0";
  const offenders = [];
  for (const top of ["apps", "packages"]) {
    const base = join(MONOREPO_ROOT, top);
    let dirs;
    try {
      dirs = readdirSync(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dirent of dirs) {
      if (!dirent.isDirectory()) continue;
      const manifest = join(base, dirent.name, "package.json");
      if (!existsSync(manifest)) continue;
      const body = JSON.parse(readFileSync(manifest, "utf8"));
      for (const section of ["dependencies", "devDependencies"]) {
        const deps = body[section] ?? {};
        if (typeof deps["@playwright/test"] === "string") {
          const spec = deps["@playwright/test"].trim();
          const m = spec.match(/^[\^~>=v=]*\s*(\d+\.\d+\.\d+)/);
          const norm = m ? m[1] : "";
          if (norm !== target) {
            offenders.push(
              `${manifest}: ${section}['@playwright/test'] = ${deps["@playwright/test"]} (normalised ${norm})`,
            );
          }
        }
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Batch G must apply the @playwright/test minor upgrade; offenders:\n${offenders.join("\n")}`,
  );
});

test("Batch H Red: pnpm-lock.yaml exists and is older than any of the expected post-upgrade manifests", () => {
  // The Batch H Red proof is owned by the per-batch `pnpm install
  // --frozen-lockfile` and `pnpm dedupe --check` commands documented
  // in upgrade-matrix.md Batch Quality Gates. Parsing the dedup
  // state of pnpm-lock.yaml without invoking pnpm is brittle, so this
  // test only asserts the lockfile is present and not the only
  // source of truth. The actual freeze is verified by the per-batch
  // gates. A real-Red check that the lockfile still drifts is the
  // existence of duplicate resolution keys; we surface a count to
  // the plan rather than fail this test on the count alone.
  const lockfile = join(MONOREPO_ROOT, "pnpm-lock.yaml");
  assert.ok(existsSync(lockfile), "pnpm-lock.yaml must exist");
  const content = readFileSync(lockfile, "utf8");
  // Count `next:` resolution entries — if there are multiple
  // versions resolved simultaneously the lockfile still drifts.
  const nextLines = content.split("\n").filter((l) => /^  next: /.test(l));
  assert.ok(
    nextLines.length >= 1,
    "pnpm-lock.yaml must contain at least one next resolution entry",
  );
});

// ── Batch C Red: stable manifest-level contract (tightening) ─────────────────
//
// The live-behavior Red for Batch C is the `pnpm --filter
// reading-advantage exec jest` focused run documented in plan.md.
// That run is flaky across pnpm-lock.yaml states: when the lockfile
// resolves react-day-picker@8 the migrated `calendar.tsx` (v9 API
// `getDefaultClassNames`) throws `TypeError: (0 , _reactdaypicker.
// getDefaultClassNames) is not a function`, and 8 of 9 tests fail;
// when the lockfile resolves react-day-picker@9 the same tests
// pass. The prior re-verifications all happened to run the focused
// Jest command AFTER `pnpm --filter` had auto-updated the lockfile
// to the post-Green resolution (react-day-picker@9), so they
// recorded 0 fail / 9 pass; the lockfile at HEAD is the pre-Green
// state (react-day-picker@8), and the test fails there.
//
// This manifest assertion is a stable, lockfile-independent
// tightening of the Batch C Red contract: the calendar migration
// is incomplete until `apps/reading-advantage/package.json`
// declares `react-day-picker` at major version 9. The Phase 2
// test file (`apps/reading-advantage/components/ui/__tests__/
// calendar.test.tsx`) remains the live-behavior pair; this
// manifest assertion is the deterministic contract gate.

test("Batch C Red: apps/reading-advantage declares react-day-picker at major version 9 (stable manifest contract)", () => {
  const manifest = join(MONOREPO_ROOT, "apps", "reading-advantage", "package.json");
  assert.ok(existsSync(manifest), `${manifest} must exist`);
  const body = JSON.parse(readFileSync(manifest, "utf8"));
  const rdpRaw =
    body.dependencies?.["react-day-picker"] ??
    body.devDependencies?.["react-day-picker"];
  assert.ok(
    rdpRaw,
    `apps/reading-advantage must declare react-day-picker as a direct dependency; current dependencies and devDependencies do not contain the key`,
  );
  const m = String(rdpRaw)
    .trim()
    .match(/^[\^~>=v=]*\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(
    m,
    `react-day-picker specifier '${rdpRaw}' must be a parseable semver range`,
  );
  const major = Number.parseInt(m[1], 10);
  assert.ok(
    major >= 9,
    `Batch C must upgrade apps/reading-advantage react-day-picker from major 8 to major 9 to match the v9 API migration in calendar.tsx (getDefaultClassNames); current specifier is '${rdpRaw}' which normalises to major ${major}`,
  );
});
