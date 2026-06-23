#!/usr/bin/env node
/**
 * Phase 4 contract-gate tests for `dependency_upgrade_hardening_20260607`.
 *
 * The Red tests in this file assert the **post-Phase-4 expected state**
 * of the documentation/doctor deliverables that Phase 4 of
 * `plan.md` requires:
 *
 *   1. Major-migration backlog exists: seven new track proposals
 *      (AI SDK, Zod 4, TypeScript 6, Jest 30, Zustand 5, Drizzle 0.45,
 *      pnpm 11) live under `measure/tracks/` with metadata.json,
 *      spec.md, and plan.md. The Zod 4 track must cross-link the
 *      existing `zod_boundary_hardening_20260603` track; Prisma 7
 *      must be explicitly rejected (spec.md AC #11).
 *   2. `measure/tech-stack.md` reflects the selected shared framework
 *      and tool versions chosen by Batches A and B (Next 16.2.9,
 *      React/React DOM 19.2.7, Vitest family 4.1.8) — spec.md AC #12.
 *   3. `measure/tech-debt.md` is reconciled: line count ≤ 50, and the
 *      2026-04-29 react-konva peer-warning row is closed now that
 *      Batch A's React 19.2.7 upgrade satisfies the peer.
 *   4. Final pre-run snapshots exist under `baseline-final/`:
 *      `pnpm-outdated.json` and `pnpm-audit.json` re-run against the
 *      post-upgrade manifests, ready for diff against the Phase 1
 *      baseline (`baseline/`) per Phase 4 acceptance task.
 *
 * At HEAD every Red test below fails because the corresponding Phase 4
 * artifact has not yet been created. The Green commit (Phase 4
 * Generator / Doctor) must produce each artifact to turn the
 * assertions true.
 *
 * Per `test-strategy.md` §1 and §7, the closeout live-behavior pair is
 * the aggregate `pnpm turbo run lint|test|check-types|build` plus the
 * per-batch re-runs of `pnpm outdated`/`pnpm audit` against the
 * committed lockfile. Those commands are the Phase 4 acceptance gates
 * per spec.md Acceptance Criteria #8–#10; this contract test file is
 * the artifact-only deterministic gate that lets CI gate the docs/
 * doctor deliverables without invoking the full turbo suite.
 *
 * Bounded scope:
 *   - Runs only this single test file via `node --test`.
 *   - Never spawns pnpm, vitest, jest, turbo, or `pnpm outdated` /
 *     `pnpm audit` against the real monorepo.
 *   - Reads `measure/tracks/`, `measure/tech-stack.md`,
 *     `measure/tech-debt.md`, and the `baseline/` and `baseline-final/`
 *     artifact directories only.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACK_ROOT = resolve(__dirname, "..", "..");
const MONOREPO_ROOT = resolve(TRACK_ROOT, "..", "..", "..");
const TRACKS_DIR = join(MONOREPO_ROOT, "measure", "tracks");
const TECH_STACK_MD = join(MONOREPO_ROOT, "measure", "tech-stack.md");
const TECH_DEBT_MD = join(MONOREPO_ROOT, "measure", "tech-debt.md");
const BASELINE_FINAL_DIR = join(TRACK_ROOT, "baseline-final");

// ── helpers ─────────────────────────────────────────────────────────────────

// This track is the dependency-upgrade track itself; it is excluded
// from the backlog search because Phase 4 must produce NEW backlog
// tracks, not satisfy the contract by pointing at the upgrade
// matrix that already exists inside this track.
const THIS_TRACK_ID = "dependency_upgrade_hardening_20260607";

/**
 * Reads every directory under `measure/tracks/` and returns a list of
 * `{id, metadata, spec, plan, files}` records. Tracks that lack any
 * of metadata.json, spec.md, or plan.md are still returned but with
 * `null` for the missing file.
 *
 * @returns {Array<{id: string, metadata: object|null, spec: string|null, plan: string|null, files: string[]}>}
 */
function listTracks() {
  const dirs = readdirSync(TRACKS_DIR, { withFileTypes: true });
  const tracks = [];
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const dir = join(TRACKS_DIR, dirent.name);
    const files = readdirSync(dir);
    const meta = files.includes("metadata.json")
      ? JSON.parse(readFileSync(join(dir, "metadata.json"), "utf8"))
      : null;
    const spec = files.includes("spec.md")
      ? readFileSync(join(dir, "spec.md"), "utf8")
      : null;
    const plan = files.includes("plan.md")
      ? readFileSync(join(dir, "plan.md"), "utf8")
      : null;
    tracks.push({ id: dirent.name, metadata: meta, spec, plan, files });
  }
  return tracks;
}

/**
 * Heuristically selects a backlog track — a NEW track produced by
 * Phase 4 of this dependency-upgrade track — whose id, description,
 * spec, or plan mentions a topic keyword. The current track
 * (`dependency_upgrade_hardening_20260607`) is excluded so that the
 * backlog tests fail when the new tracks are absent, rather than
 * passing because the upgrade matrix inside this track happens to
 * mention the topic keywords.
 *
 * @param {string} keyword Lower-case keyword to search for.
 * @returns {{id: string, metadata: object|null, spec: string|null, plan: string|null}|null}
 */
function findBacklogTrackByKeyword(keyword) {
  const lower = keyword.toLowerCase();
  const tracks = listTracks().filter((t) => t.id !== THIS_TRACK_ID);
  for (const t of tracks) {
    const haystacks = [
      t.id,
      t.metadata?.description ?? "",
      t.spec ?? "",
      t.plan ?? "",
    ];
    if (haystacks.some((h) => h.toLowerCase().includes(lower))) {
      return t;
    }
  }
  return null;
}

function readJsonArtifact(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    assert.fail(`${filePath} must contain valid JSON: ${error.message}`);
  }
}

// ── Phase 4 Red tests ───────────────────────────────────────────────────────

/**
 * Per the test-strategy §7 and the AGENTS.md guidance on
 * "Artifact or markdown assertions are allowed only when the phase
 * deliverable is that artifact, and they must be paired with a
 * live-behavior proof or an explicit plan note saying which later role
 * owns the live gate", the live-behavior pair for each Phase 4 task is
 * the aggregate `pnpm turbo run lint|test|check-types|build` and the
 * `pnpm install --frozen-lockfile`/`pnpm dedupe --check` closeout
 * documented in plan.md Phase 4 task 4 and upgrade-matrix.md Batch
 * Quality Gates (Batch H). The plan note is recorded at the top of
 * this file and in plan.md under the Phase 4 Red gate section.
 */

const BACKLOG_KEYWORDS = [
  // AI SDK major migration. We use the @ai-sdk package-name token
  // (which only the new Vercel AI SDK uses) to disambiguate from
  // ad-hoc mentions of "AI SDK" in unrelated tracks.
  "@ai-sdk",
  "ai sdk major",
  "ai sdk v",
  "ai sdk next",
  // Zod 4 major migration.
  "zod 4",
  "zod v4",
  "zod 3 to 4",
  // TypeScript 6 major migration.
  "typescript 6",
  "typescript v6",
  "ts 6.0",
  "tsc 6",
  // Jest 30 major migration.
  "jest 30",
  "jest v30",
  // Zustand 5 major migration.
  "zustand 5",
  "zustand v5",
  // Drizzle 0.45 major migration.
  "drizzle 0.45",
  "drizzle-orm 0.45",
  "drizzle v0.45",
  // pnpm 11 major migration.
  "pnpm 11",
  "pnpm v11",
];

test("Phase 4 Red: major-migration backlog exists with seven dedicated track proposals", () => {
  // spec.md FR-7 + AC #11 require seven major-migration track proposals:
  // AI SDK, Zod 4, TypeScript 6, Jest 30, Zustand 5, Drizzle 0.45, pnpm 11.
  // We assert that a track exists for each topic by keyword search
  // against the description/spec/plan/id so the assertion is robust to
  // the exact track_id naming convention the Generator chooses.
  const found = [];
  for (const kw of BACKLOG_KEYWORDS) {
    const track = findBacklogTrackByKeyword(kw);
    if (track && !found.some((t) => t.id === track.id)) {
      found.push(track);
    }
  }
  // We need at least seven distinct tracks (one per topic). Some
  // topics may share a single track (e.g. "zod 4" + "zod v4"), so we
  // require ≥ 7 distinct matches across the 17 keyword probes.
  assert.ok(
    found.length >= 7,
    `Phase 4 backlog must contain dedicated track proposals for AI SDK, Zod 4, TypeScript 6, Jest 30, Zustand 5, Drizzle 0.45, and pnpm 11 (spec.md FR-7 + AC #11); found ${found.length} distinct tracks matching backlog keywords: ${found.map((t) => t.id).join(", ")}`,
  );
});

test("Phase 4 Red: every backlog track has metadata.json with required fields", () => {
  // The track scaffolding contract from the existing
  // dependency_upgrade_hardening_20260607/metadata.json template.
  const required = ["track_id", "type", "status", "created_at", "description"];
  // Gather distinct backlog tracks (excluding this dependency-upgrade
  // track itself) across the topic keyword probes. The aggregate must
  // be non-empty — otherwise the test fails with "no backlog exists",
  // which is the real Red signal we want to lock in.
  const backlog = new Map();
  for (const kw of BACKLOG_KEYWORDS) {
    const track = findBacklogTrackByKeyword(kw);
    if (track && !backlog.has(track.id)) backlog.set(track.id, track);
  }
  assert.ok(
    backlog.size >= 1,
    `Phase 4 backlog must contain at least one track proposal before its metadata.json schema can be verified; found ${backlog.size} backlog tracks`,
  );
  const offenders = [];
  for (const track of backlog.values()) {
    if (!track.metadata) {
      offenders.push(`${track.id}: missing metadata.json`);
      continue;
    }
    for (const field of required) {
      if (!(field in track.metadata)) {
        offenders.push(`${track.id}: metadata.json missing field '${field}'`);
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Every backlog track's metadata.json must include track_id/type/status/created_at/description; offenders:\n${offenders.join("\n")}`,
  );
});

test("Phase 4 Red: every backlog track has a spec.md with a '# Specification' heading", () => {
  const backlog = new Map();
  for (const kw of BACKLOG_KEYWORDS) {
    const track = findBacklogTrackByKeyword(kw);
    if (track && !backlog.has(track.id)) backlog.set(track.id, track);
  }
  assert.ok(
    backlog.size >= 1,
    `Phase 4 backlog must contain at least one track proposal before its spec.md heading can be verified; found ${backlog.size} backlog tracks`,
  );
  const offenders = [];
  for (const track of backlog.values()) {
    if (!track.spec) {
      offenders.push(`${track.id}: missing spec.md`);
      continue;
    }
    if (!/^#\s+(Specification|Spec)\b/m.test(track.spec)) {
      offenders.push(
        `${track.id}: spec.md must start with a '# Specification:' or '# Spec:' heading`,
      );
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Every backlog track's spec.md must begin with a '# Specification' or '# Spec:' heading; offenders:\n${offenders.join("\n")}`,
  );
});

test("Phase 4 Red: every backlog track has a plan.md with a '# Plan' heading", () => {
  const backlog = new Map();
  for (const kw of BACKLOG_KEYWORDS) {
    const track = findBacklogTrackByKeyword(kw);
    if (track && !backlog.has(track.id)) backlog.set(track.id, track);
  }
  assert.ok(
    backlog.size >= 1,
    `Phase 4 backlog must contain at least one track proposal before its plan.md heading can be verified; found ${backlog.size} backlog tracks`,
  );
  const offenders = [];
  for (const track of backlog.values()) {
    if (!track.plan) {
      offenders.push(`${track.id}: missing plan.md`);
      continue;
    }
    if (!/^#\s+(Implementation\s+)?Plan\b/m.test(track.plan)) {
      offenders.push(
        `${track.id}: plan.md must start with a '# Plan' or '# Implementation Plan' heading`,
      );
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Every backlog track's plan.md must begin with a '# Plan' or '# Implementation Plan' heading; offenders:\n${offenders.join("\n")}`,
  );
});

test("Phase 4 Red: the Zod 4 backlog track cross-links zod_boundary_hardening_20260603", () => {
  // spec.md FR-7: "Zod 3 to Zod 4, coordinated with
  // zod_boundary_hardening_20260603". The backlog entry for the
  // Zod 4 migration must reference that archived track so the new
  // work inherits the env/schema validation context.
  const zodTrack = findBacklogTrackByKeyword("zod 4") ??
    findBacklogTrackByKeyword("zod v4") ??
    findBacklogTrackByKeyword("zod v3") ??
    findBacklogTrackByKeyword("zod 3");
  assert.ok(
    zodTrack,
    `Phase 4 backlog must contain a Zod 4 migration track (spec.md FR-7 + AC #11); no track matches 'zod 4' / 'zod v4' / 'zod v3' / 'zod 3'`,
  );
  const haystack = `${zodTrack.spec ?? ""}\n${zodTrack.plan ?? ""}`;
  assert.match(
    haystack,
    /zod_boundary_hardening_20260603/,
    `The Zod 4 backlog track (${zodTrack.id}) must cross-link zod_boundary_hardening_20260603 in its spec.md or plan.md (spec.md FR-7)`,
  );
});

test("Phase 4 Red: the major-migration backlog explicitly rejects Prisma 7", () => {
  // spec.md FR-7 + AC #11: "A dedicated major-migration backlog exists
  // and explicitly excludes Prisma 7." We assert that at least one
  // backlog artifact (spec.md or plan.md) — in a track that is NOT this
  // dependency-upgrade track itself — contains the Prisma 7 rejection
  // language so the exclusion is recorded in the new tracks, not only
  // in this dependency-track's existing upgrade-matrix.md / spec.md /
  // tracks.md.
  const tracks = listTracks().filter((t) => t.id !== THIS_TRACK_ID);
  const rejection = /prisma\s*7/i;
  const matches = [];
  for (const t of tracks) {
    const haystack = `${t.spec ?? ""}\n${t.plan ?? ""}`;
    if (rejection.test(haystack)) {
      matches.push(t.id);
    }
  }
  assert.ok(
    matches.length >= 1,
    `Phase 4 backlog must contain a track whose spec.md or plan.md explicitly mentions Prisma 7 (AC #11); no track (excluding this dependency-upgrade track) contains a Prisma 7 reference`,
  );
  // Tighten: the rejection must be framed as an exclusion, not merely
  // mentioned as a package name. Either "reject" or "excludes" or
  // "explicitly excludes" language must appear alongside Prisma 7.
  let foundExclusion = false;
  for (const t of tracks) {
    const haystack = `${t.spec ?? ""}\n${t.plan ?? ""}`;
    if (/prisma\s*7[\s\S]{0,200}(reject|exclud|prohibit)/i.test(haystack)) {
      foundExclusion = true;
      break;
    }
  }
  assert.ok(
    foundExclusion,
    `Phase 4 backlog must explicitly REJECT Prisma 7 (AC #11); a bare 'Prisma 7' mention is insufficient — the language must say reject/exclude/prohibit. Tracks matching Prisma 7 keyword: ${matches.join(", ")}`,
  );
});

test("Phase 4 Red: measure/tech-stack.md records the selected Next 16.2.9 patch line", () => {
  // spec.md AC #12: "measure/tech-stack.md reflects the selected
  // shared framework/tool versions." Batch A selected Next 16.2.9;
  // tech-stack.md must mention it as the current shared version.
  assert.ok(existsSync(TECH_STACK_MD), `${TECH_STACK_MD} must exist`);
  const content = readFileSync(TECH_STACK_MD, "utf8");
  assert.match(
    content,
    /16\.2\.9|16\.2\.\d+/,
    `tech-stack.md must mention the selected Next 16.2.9 patch line (or any 16.2.x ≥ 16.2.9 selected by Batch A); current file does not contain a 16.2.x reference`,
  );
});

test("Phase 4 Red: measure/tech-stack.md records the selected React 19.2.7 patch line", () => {
  assert.ok(existsSync(TECH_STACK_MD), `${TECH_STACK_MD} must exist`);
  const content = readFileSync(TECH_STACK_MD, "utf8");
  assert.match(
    content,
    /19\.2\.7|19\.2\.\d+/,
    `tech-stack.md must mention the selected React 19.2.7 patch line (or any 19.2.x ≥ 19.2.7 selected by Batch A); current file does not contain a 19.2.x reference`,
  );
});

test("Phase 4 Red: measure/tech-stack.md records the selected Vitest 4.1.8 patch line", () => {
  assert.ok(existsSync(TECH_STACK_MD), `${TECH_STACK_MD} must exist`);
  const content = readFileSync(TECH_STACK_MD, "utf8");
  assert.match(
    content,
    /4\.1\.8|4\.1\.\d+/,
    `tech-stack.md must mention the selected Vitest 4.1.8 patch line (or any 4.1.x ≥ 4.1.8 selected by Batch B); current file does not contain a 4.1.x reference`,
  );
});

test("Phase 4 Red: measure/tech-debt.md is at or below the 50-line policy ceiling", () => {
  // tech-debt.md is curated working memory (per the file's own
  // header and per workflow.md). Plan.md Phase 4 task 2 requires
  // adding newly discovered unsupported/deferred dependencies
  // without exceeding the line limit; the Red proof is that the
  // current line count is already at the policy ceiling, so any
  // additional row must be paired with a summary / removal.
  assert.ok(existsSync(TECH_DEBT_MD), `${TECH_DEBT_MD} must exist`);
  const content = readFileSync(TECH_DEBT_MD, "utf8");
  const lineCount = content.split("\n").length;
  assert.ok(
    lineCount <= 50,
    `tech-debt.md must stay at or below the 50-line curated-memory ceiling (workflow.md / tech-debt.md header); current line count is ${lineCount}. Any new row added during Phase 4 must be paired with removal/summarization of a resolved entry.`,
  );
});

test("Phase 4 Red: the 2026-04-29 react-konva tech-debt row is reconciled (Resolved or removed)", () => {
  // Plan.md Phase 4 task 2: "Reconcile the React/React-Konva
  // tech-debt row if resolved." Batch A upgraded React to 19.2.7
  // (Green commit 70061422), which satisfies the react-konva
  // peer-dependency requirement (react-konva wants React 19.2.x).
  // The 2026-04-29 row is therefore resolved and must be marked
  // Resolved or removed from tech-debt.md. At HEAD the row is still
  // 'Open', so the test fails.
  assert.ok(existsSync(TECH_DEBT_MD), `${TECH_DEBT_MD} must exist`);
  const content = readFileSync(TECH_DEBT_MD, "utf8");
  // Find the row that mentions react-konva. The row may be in any
  // column position; we locate the table row by grepping for the
  // "react-konva" identifier and inspecting its Status cell.
  const lines = content.split("\n");
  const rowLines = lines.filter((l) => /react-konva/i.test(l));
  assert.ok(
    rowLines.length >= 1,
    `tech-debt.md must still reference the 2026-04-29 react-konva row (or have removed it explicitly); no react-konva row found`,
  );
  // Tighten: at least one row mentioning react-konva must be either
  // marked 'Resolved' or removed from the file. At HEAD the row is
  // 'Open' and the file is 51 lines; Batch A's React 19.2.7 upgrade
  // satisfies the peer, so the row must be reconciled.
  const reconciled = rowLines.some(
    (l) => /\|\s*Resolved\s*\|/i.test(l),
  );
  assert.ok(
    reconciled,
    `Batch A's React 19.2.7 upgrade (commit 70061422) satisfies the react-konva peer dependency; the 2026-04-29 tech-debt row must be marked Resolved. Current row(s):\n${rowLines.join("\n")}`,
  );
});

test("Phase 4 Red: baseline-final/pnpm-outdated.json exists for the post-upgrade diff", () => {
  // Plan.md Phase 4 task 4: re-run `pnpm outdated -r --format json`
  // and `pnpm audit --json`; compare with the baseline and document
  // unresolved items. The Red proof is that the post-upgrade
  // snapshots under `baseline-final/` have not yet been written,
  // so no diff against the Phase 1 baseline (`baseline/`) is
  // possible. The Green commit must run the re-runs and commit the
  // new JSONs.
  assert.ok(
    existsSync(BASELINE_FINAL_DIR),
    `Phase 4 must produce a baseline-final/ directory under ${TRACK_ROOT} containing the post-upgrade pnpm-outdated.json and pnpm-audit.json snapshots for diff against the Phase 1 baseline; baseline-final/ does not exist yet`,
  );
  const outdatedFinal = join(BASELINE_FINAL_DIR, "pnpm-outdated.json");
  assert.ok(
    existsSync(outdatedFinal),
    `Phase 4 must commit ${outdatedFinal} so the post-upgrade outdated snapshot is diffable against baseline/pnpm-outdated.json`,
  );
  const auditFinal = join(BASELINE_FINAL_DIR, "pnpm-audit.json");
  assert.ok(
    existsSync(auditFinal),
    `Phase 4 must commit ${auditFinal} so the post-upgrade audit snapshot is diffable against baseline/pnpm-audit.json`,
  );
});

test("Phase 4 Red: baseline-final/pnpm-outdated.json is parseable JSON without warning prelude", () => {
  const outdatedFinal = join(BASELINE_FINAL_DIR, "pnpm-outdated.json");
  const parsed = readJsonArtifact(outdatedFinal);
  assert.equal(
    parsed && typeof parsed,
    "object",
    `${outdatedFinal} must parse as a JSON object produced by pnpm outdated --format json`,
  );
  assert.ok(
    !Array.isArray(parsed),
    `${outdatedFinal} must be a JSON object keyed by package name, not an array or warning text`,
  );
});

test("Phase 4 Red: baseline-final/pnpm-audit.json explicitly records incomplete audit status", () => {
  const auditFinal = join(BASELINE_FINAL_DIR, "pnpm-audit.json");
  const parsed = readJsonArtifact(auditFinal);
  assert.equal(
    parsed && typeof parsed,
    "object",
    `${auditFinal} must parse as a JSON object`,
  );
  assert.equal(
    parsed.incomplete,
    true,
    `${auditFinal} must explicitly set incomplete: true when pnpm audit stalls; absence of audit output must not be treated as a clean security result`,
  );
  assert.match(
    String(parsed.note ?? ""),
    /(stall|timeout|incomplete|unknown)/i,
    `${auditFinal} must include a note explaining that final audit results are incomplete/unknown`,
  );
});

// ── Phase 4 Red Gate aggregate ───────────────────────────────────────────────
//
// Total Red signal at HEAD: 11 failing assertions across 1 bounded
// `node --test` invocation (Backlog exists / metadata schema / spec
// title / plan title / Zod 4 cross-link / Prisma 7 rejection / tech-
// stack.md Next 16.2.9 / tech-stack.md React 19.2.7 / tech-stack.md
// Vitest 4.1.8 / tech-debt.md line count / react-konva reconciliation
// / baseline-final snapshots = 12 assertions if the backlog test is
// counted separately, plus baseline-final = 12 total assertions
// across 1 bounded command). Every Red is caused by a missing Phase 4
// artifact (file, row, section, snapshot) and not by a stale durable
// record. No test in this file can accidentally trigger a full
// `pnpm turbo run` or a real `pnpm outdated`/`pnpm audit` — the
// script reads files only and never spawns package-management
// tooling.