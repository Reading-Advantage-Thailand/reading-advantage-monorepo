/**
 * Phase 10 Red-phase tests for the track closeout deliverables.
 *
 * Driven by `measure/tracks/ai_adapter_package_20260603/plan.md`
 * Phase 10 (3 tasks: tech-debt update, lessons-learned entry,
 * track archival + tracks.md flip). All three tasks are Measure
 * doc-only updates, so the Red-phase contract is encoded as
 * file-content assertions over the four Measure documents the
 * Green-phase implementer must touch:
 *
 *   1. `measure/tech-debt.md` — Task 1 (row
 *      `audit_20260603_housekeeping_batch` must annotate F-101 +
 *      F-202 as Resolved by `ai_adapter_package_20260603`).
 *   2. `measure/lessons-learned.md` — Task 2 (entry tagged
 *      `(YYYY-MM-DD, ai_adapter_package)` capturing the mock-
 *      provider unit-test pattern + real-provider integration-
 *      with-API-keys lesson).
 *   3. `measure/tracks.md` + `measure/archive/...` +
 *      `measure/tracks/...` — Task 3 (track moved from
 *      `tracks/` to `archive/`, tracks.md line flipped from
 *      `[~]` / `./tracks/` to `[x]` / `./archive/`).
 *
 * Test design:
 *   - Pure `node:fs` reads against the repo's Measure docs. No
 *     imports from the `@reading-advantage/ai` package, no DB,
 *     no network, no module mocks.
 *   - Path resolution walks from this file
 *     (`packages/ai/src/__tests__/phase-10-closeout.test.ts`) up
 *     3 levels to reach the repo root.
 *   - Tasks 1 + 2 are regression nets: the annotations are
 *     already present (tech-debt.md line 43 + lessons-learned.md
 *     line 46) from prior phases, so these assertions pass today
 *     and guard against accidental drift during the Green-phase
 *     archive move.
 *   - Task 3 is the active RED contract — the four sub-
 *     assertions fail today because the track has not yet been
 *     moved to archive and tracks.md still says `[~]` /
 *     `./tracks/...`.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/ai && \
 *     npx vitest run src/__tests__/phase-10-closeout.test.ts
 *
 * Location note: lives under `packages/ai/src/__tests__/` to
 * match the existing phase-N-foo.test.ts naming
 * (phase-2-mock-provider, phase-3-openai-provider,
 * phase-4-google-provider, phase-5-provider-selector,
 * phase-9-docs). The default vitest include glob picks the file
 * up; no config edit required (test-strategy §4 architecture
 * guardrails are still respected — this file does not touch
 * `vitest.config.ts` or `packages/ai/src/`).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/ai/src/__tests__/phase-10-closeout.test.ts` → up 3 → repo root.
const REPO_ROOT = join(__dirname, "../../../..");

const TECH_DEBT_PATH = join(REPO_ROOT, "measure/tech-debt.md");
const LESSONS_LEARNED_PATH = join(REPO_ROOT, "measure/lessons-learned.md");
const TRACKS_MD_PATH = join(REPO_ROOT, "measure/tracks.md");
const TRACK_DIR = join(
  REPO_ROOT,
  "measure/tracks/ai_adapter_package_20260603",
);
const ARCHIVE_DIR = join(
  REPO_ROOT,
  "measure/archive/ai_adapter_package_20260603",
);

describe("Phase 10 — Task 1: tech-debt.md marks F-101 + F-202 Resolved by this track", () => {
  it("tech-debt.md exists at the expected Measure path", () => {
    expect(() => readFileSync(TECH_DEBT_PATH, "utf8")).not.toThrow();
  });

  it("the audit_20260603_housekeeping_batch row names both F-101 and F-202 as Resolved by ai_adapter_package_20260603", () => {
    const source = readFileSync(TECH_DEBT_PATH, "utf8");
    // The batched row is a single table line; we pin the contract
    // by checking the row text contains all four anchors:
    //   - the batch row's track ID
    //   - F-101 marked Resolved
    //   - F-202 marked Resolved
    //   - reference to ai_adapter_package_20260603 as the closer
    const rowLine = source
      .split("\n")
      .find((line) => line.includes("audit_20260603_housekeeping_batch"));
    expect(
      rowLine,
      "tech-debt.md must contain a row with track ID `audit_20260603_housekeeping_batch` " +
        "(the batched science-advantage Medium/Low findings — the closer track for F-101 + F-202).",
    ).toBeDefined();
    expect(
      rowLine,
      "The audit_20260603_housekeeping_batch row must reference F-101 (direct AI SDK coupling).",
    ).toMatch(/F-101/);
    expect(
      rowLine,
      "The audit_20260603_housekeeping_batch row must reference F-202 (process.env mutation).",
    ).toMatch(/F-202/);
    expect(
      rowLine,
      "The audit_20260603_housekeeping_batch row must call out ai_adapter_package_20260603 as the resolving track.",
    ).toMatch(/ai_adapter_package_20260603/);
    expect(
      rowLine,
      "The annotation must say F-101 + F-202 are **Resolved** (the bold-Resolved convention used by the other rows that close out cross-track findings).",
    ).toMatch(/F-101[^\n]*Resolved|Resolved[^\n]*F-101/i);
  });

  it("tech-debt.md stays at or below the 50-line bounded-memory cap", () => {
    const source = readFileSync(TECH_DEBT_PATH, "utf8");
    const lineCount = source.split("\n").length;
    // Per the file's own header comment: "Keep it at or below 50
    // lines." A trailing newline produces one extra empty string
    // after split; allow up to 51 to account for that.
    expect(
      lineCount,
      `tech-debt.md is ${lineCount} lines; the file's own header caps it at 50 ` +
        "(bounded working memory, not append-only). Phase 10 must not push it over " +
        "the cap — if F-101 / F-202 closure surfaces additional rows, prune resolved " +
        "items first.",
    ).toBeLessThanOrEqual(51);
  });
});

describe("Phase 10 — Task 2: lessons-learned.md has the ai_adapter_package mock-provider lesson", () => {
  it("lessons-learned.md exists at the expected Measure path", () => {
    expect(() =>
      readFileSync(LESSONS_LEARNED_PATH, "utf8"),
    ).not.toThrow();
  });

  it("contains an entry tagged with the ai_adapter_package track and a date", () => {
    const source = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    // The lessons-learned convention is `- (YYYY-MM-DD, <track>) <lesson text>`
    // (see neighbouring entries for codecamp_review, prisma_drizzle_*, etc.).
    // Pin both the date-shaped prefix and the track ID.
    expect(
      source,
      "lessons-learned.md must contain a bulleted entry tagged " +
        "`(YYYY-MM-DD, ai_adapter_package)` per the file's existing " +
        "convention (see other entries like `(2026-05-22, prisma_drizzle_schema_unification)`).",
    ).toMatch(/\(\d{4}-\d{2}-\d{2},\s*ai_adapter_package[^)]*\)/);
  });

  it("the ai_adapter_package entry captures both halves of the lesson: mock=unit-test, real=integration-with-keys", () => {
    const source = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    // Pull the line(s) containing the ai_adapter_package tag and
    // assert both halves of the lesson are present. We don't pin
    // exact wording (the precursor entry at line 46 uses
    // "deterministic responses" rather than the plan's literal
    // "snapshot tests"; both phrasings are accurate per the
    // Phase 2 snapshot test pattern) but we do pin the contract.
    const lessonLine = source
      .split("\n")
      .find((line) => /ai_adapter_package/.test(line));
    expect(
      lessonLine,
      "lessons-learned.md must contain an entry tagged with ai_adapter_package.",
    ).toBeDefined();
    const line = lessonLine ?? "";
    // Half 1: mock provider is the unit-test pattern. Allow either
    // "snapshot" (plan's literal wording) or "deterministic"
    // (the precursor entry's wording, which describes the same
    // snapshot pattern Phase 2 actually shipped).
    expect(
      /mock/i.test(line) && /unit[- ]test/i.test(line),
      "The ai_adapter_package entry must say the mock provider is the unit-test pattern.",
    ).toBe(true);
    expect(
      /snapshot|deterministic/i.test(line),
      "The ai_adapter_package entry must mention the snapshot / deterministic-response pattern that the mock provider uses (Phase 2's __snapshots__ directory is the implementation).",
    ).toBe(true);
    // Half 2: real providers are integration-tested only with API keys present.
    expect(
      /real/i.test(line) && /integration/i.test(line),
      "The ai_adapter_package entry must say real providers are integration-tested (not unit-tested).",
    ).toBe(true);
    expect(
      /api keys?/i.test(line),
      "The ai_adapter_package entry must mention that the real-provider integration tests require API keys (the `it.skipIf(!process.env.X_API_KEY)` gate pattern from Phases 3 + 4).",
    ).toBe(true);
  });

  it("lessons-learned.md stays at or below the 50-line bounded-memory cap", () => {
    const source = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    const lineCount = source.split("\n").length;
    // Same bounded-memory rule as tech-debt.md; the file's own
    // header reads "Keep it at or below 50 lines."
    expect(
      lineCount,
      `lessons-learned.md is ${lineCount} lines; the file's own header caps it at 50 ` +
        "(curated working memory, not an append-only log). Phase 10 must not push it over " +
        "the cap — if the ai_adapter_package entry needs polish, condense or prune older entries first.",
    ).toBeLessThanOrEqual(51);
  });
});

describe("Phase 10 — Task 3: track archived + tracks.md flipped to [x] / archive link", () => {
  it("measure/tracks/ai_adapter_package_20260603/ source-of-truth dir is removed (track moved out)", () => {
    // The plan calls for a `mv tracks/... archive/...` operation.
    // After Green-phase, the `tracks/` copy must be gone so there
    // is exactly one canonical location for the spec / plan /
    // test-strategy.
    expect(
      existsSync(TRACK_DIR),
      "After Phase 10 task 3, `measure/tracks/ai_adapter_package_20260603/` " +
        "must be gone (track moved to `measure/archive/`). Today this dir still " +
        "exists with the source-of-truth plan.md + test-strategy.md, so this " +
        "assertion fails RED.",
    ).toBe(false);
  });

  it("measure/archive/ai_adapter_package_20260603/ contains the full track artefact set", () => {
    expect(
      existsSync(ARCHIVE_DIR),
      "After Phase 10 task 3, the archived track dir must exist.",
    ).toBe(true);
    // The Phase 10 archive must contain the full artefact set
    // including test-strategy.md (the prior stale archive dir
    // from 2026-06-05 is missing test-strategy.md, so this
    // catches the "incomplete move" failure mode).
    const requiredFiles = ["plan.md", "spec.md", "metadata.json", "test-strategy.md"];
    for (const fileName of requiredFiles) {
      const filePath = join(ARCHIVE_DIR, fileName);
      expect(
        existsSync(filePath),
        `Archive dir must contain ${fileName} (the in-flight tracks/ copy has this file; ` +
          "the move must preserve the full artefact set, not just the original 3 files).",
      ).toBe(true);
    }
  });

  it("the archived plan.md is the current in-flight version (contains Phase 9 Green-phase commit SHA 8075dad)", () => {
    if (!existsSync(ARCHIVE_DIR)) {
      // The previous assertion catches the dir-missing case; here
      // we only care about staleness when the dir does exist.
      return;
    }
    const archivedPlanPath = join(ARCHIVE_DIR, "plan.md");
    if (!existsSync(archivedPlanPath)) {
      // The previous assertion already covers this; bail to avoid
      // a misleading double-failure noise.
      return;
    }
    const source = readFileSync(archivedPlanPath, "utf8");
    // The Phase 9 Green-phase commit (8075dad) is the canary that
    // proves the archive is the current in-flight plan.md, not
    // the 2026-06-05 stub. Today's stale archive dir's plan.md
    // is 6794 bytes and was last edited 2026-06-05; the current
    // plan.md is much larger and contains the Phase 0-9 Red /
    // Green notes including 8075dad.
    expect(
      source,
      "The archived plan.md must be the current in-flight version " +
        "(contains the Phase 9 Green commit SHA `8075dad`). The 2026-06-05 stub " +
        "archived plan does not contain this SHA, so this assertion catches the " +
        "stale-archive failure mode.",
    ).toMatch(/8075dad/);
  });

  it("tracks.md flips the ai_adapter_package_20260603 entry to [x] with the archive link", () => {
    const source = readFileSync(TRACKS_MD_PATH, "utf8");
    const trackLine = source
      .split("\n")
      .find(
        (line) =>
          line.includes("ai_adapter_package_20260603") &&
          line.includes("**Track:"),
      );
    expect(
      trackLine,
      "tracks.md must contain a `- [STATUS] **Track: ...**` heading line " +
        "naming ai_adapter_package_20260603.",
    ).toBeDefined();
    const line = trackLine ?? "";
    expect(
      line,
      "After Phase 10 task 3, the tracks.md entry must be `[x]` (completed). " +
        "Today it is `[~]` (in progress).",
    ).toMatch(/^-\s*\[x\]/);
    expect(
      line,
      "After Phase 10 task 3, the tracks.md link must point to `./archive/ai_adapter_package_20260603/`. " +
        "Today it points to `./tracks/ai_adapter_package_20260603/`.",
    ).toMatch(/\.\/archive\/ai_adapter_package_20260603\//);
    // Negative assertion: the stale `./tracks/...` link must NOT
    // appear in the heading line after the move.
    expect(
      /\.\/tracks\/ai_adapter_package_20260603\//.test(line),
      "After Phase 10 task 3, the tracks.md link must NOT still point to " +
        "`./tracks/ai_adapter_package_20260603/` — that path is gone after the move.",
    ).toBe(false);
  });
});
