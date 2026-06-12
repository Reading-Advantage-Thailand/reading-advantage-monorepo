/**
 * Phase 7 (Closeout) — Red-phase pinning tests for the
 * `codecamp_review_ai_consolidation_20260605` track.
 *
 * Phase 7 has no source code, no new tests-of-behavior, and no
 * runtime deliverable. The four closeout tasks in `plan.md` are
 * pure Measure-doc bookkeeping:
 *
 *   Task 1. Mark `measure/tech-debt.md` 2026-05-15
 *           "Duplicate `generateReview`" row **Resolved** with the
 *           resolving commit (the Phase 5 Green dead-code deletion
 *           is the actual closure of the duplicate — the Phase 1
 *           preflight is the closure of the "unverified model
 *           capability" half; both land in one annotation).
 *   Task 2. Add a lessons-learned entry capturing the
 *           OpenRouter-as-OpenAI-variant or A/B prompt
 *           reconciliation lesson. Per the plan, the entry is
 *           conditional ("if anything reusable surfaced") — Phases
 *           0 + 1 surfaced two reusable patterns: (a) the
 *           adapter-factory approach (`aiClientToGenerateReview`)
 *           keeps the existing `(system, prompt) => Promise<...>`
 *           DI seam stable when adopting a wider `AIClient`
 *           abstraction (lower blast radius than widening
 *           `reviewExercise`); (b) credential-gated live
 *           preflight (`it.skipIf(!process.env.OPENROUTER_API_KEY)`)
 *           is the reusable pattern for capability gates that
 *           must not block CI without a real key.
 *   Task 3. Update `measure/tracks.md` (mark complete, flip link
 *           to `./archive/codecamp_review_ai_consolidation_20260605/`)
 *           and move the track dir from `measure/tracks/...` to
 *           `measure/archive/...`.
 *   Task 4. Attach a `git notes` note to the closeout (dir-move)
 *           commit summarizing the track. Future readers see the
 *           note via `git log --notes` / `git notes show <sha>`.
 *
 * Test design:
 *   - Pure `node:fs` + `node:child_process` reads against the
 *     repo's Measure docs and git state. No imports from any
 *     `@reading-advantage/*` package, no DB, no network, no module
 *     mocks.
 *   - Path resolution walks from this file
 *     (`packages/webhooks/src/__tests__/phase-7-closeout.test.ts`)
 *     up 4 levels to the repo root.
 *   - The 4 sections below pin each closeout task as one or more
 *     assertions, with the artifact (file-content) assertion
 *     paired with a live-gate git-state assertion (commit
 *     existence, dir-move, notes attachment) so the file is not a
 *     pure markdown-assertion test (per the supervisor's rule for
 *     Phase-deliverable-as-artifact tests).
 *   - Test runs against the HEAD worktree (no DB, no network,
 *     no pnpm scripts).
 *
 * Targeted Red command:
 *   cd packages/webhooks && \
 *     npx vitest run src/__tests__/phase-7-closeout.test.ts
 *
 * Red expectations (2026-06-12):
 *   - tech-debt.md row 2026-05-15 still says "Open"
 *     → task-1 assertions fail
 *   - lessons-learned.md has no entry tagged
 *     `codecamp_review_ai_consolidation_20260605`
 *     → task-2 assertions fail
 *   - track dir is at `tracks/`, not `archive/`; tracks.md
 *     still has the `[ ]` entry pointing at `./tracks/...`
 *     → task-3 assertions fail
 *   - HEAD has no `git notes` entry on the (not-yet-existing)
 *     closeout commit → task-4 assertions fail
 *
 * These four failure groups are the expected Red-phase signal.
 * The Green-phase owner resolves them by performing the four
 * closeout tasks: flip the tech-debt row in-place from Open to
 * Resolved with the Phase 5 Green commit SHA (3dc3167a), append a
 * lessons-learned bullet, `git mv` the dir + edit tracks.md, and
 * `git notes add -m "..." <sha>` on the dir-move commit. After
 * that, the four groups go green and the track is ready to mark
 * `[x]`.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const TECH_DEBT_PATH = join(REPO_ROOT, "measure/tech-debt.md");
const LESSONS_LEARNED_PATH = join(REPO_ROOT, "measure/lessons-learned.md");
const TRACKS_REGISTRY_PATH = join(REPO_ROOT, "measure/tracks.md");

const TRACK_DIR_TRACKS = join(
  REPO_ROOT,
  "measure/tracks/codecamp_review_ai_consolidation_20260605",
);
const TRACK_DIR_ARCHIVE = join(
  REPO_ROOT,
  "measure/archive/codecamp_review_ai_consolidation_20260605",
);

const TRACK_ID = "codecamp_review_ai_consolidation_20260605";
const CLOSE_DATE = "2026-06-12";
const RESOLVING_COMMIT = "3dc3167a";

function safeExec(command: string): string {
  try {
    return execSync(command, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// ---------------------------------------------------------------------------
// Task 1 — tech-debt.md row 2026-05-15 marks Duplicate `generateReview`
//          Resolved by Phase 5 Green dead-code deletion (3dc3167a)
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 1: tech-debt.md 2026-05-15 row marks Duplicate `generateReview` Resolved", () => {
  it("tech-debt.md exists at the expected Measure path", () => {
    expect(() => readFileSync(TECH_DEBT_PATH, "utf8")).not.toThrow();
  });

  it("tech-debt.md row tagged 2026-05-15 codecamp_review is flipped to Resolved", () => {
    const source = readFileSync(TECH_DEBT_PATH, "utf8");
    // The row in question (current line 24) reads:
    //   `| 2026-05-15 | codecamp_review | Duplicate `generateReview` LLM
    //    implementation + unverified model capability | High | Open | ...`
    // We anchor on the `2026-05-15 | codecamp_review` prefix + the
    // "Duplicate `generateReview`" item-text anchor so we are
    // pinning the *Duplicate* row (not the second 2026-05-15
    // codecamp_review row about "No integration tests" which is
    // deferred to the reliability track and stays Open).
    const rowLine = source
      .split("\n")
      .find(
        (line) =>
          /^\|\s*2026-05-15\s*\|\s*codecamp_review\s*\|/.test(line) &&
          line.includes("Duplicate `generateReview`"),
      );
    expect(
      rowLine,
      "tech-debt.md must still contain a 2026-05-15 codecamp_review row whose Item column starts with `Duplicate `generateReview`` (the row this track resolves).",
    ).toBeDefined();
    expect(
      rowLine,
      "The 2026-05-15 Duplicate `generateReview` row must flip from Open to Resolved (Phase 5 Green deleted the duplicate; the row is the tech-debt ledger's record of the closure).",
    ).toMatch(/\bResolved\b/);
    expect(
      rowLine,
      "The 2026-05-15 Duplicate `generateReview` row must no longer carry the Open marker once Phase 7 closes it.",
    ).not.toMatch(/\bOpen\b/);
  });

  it("tech-debt.md 2026-05-15 row references the resolving commit (3dc3167a) and the Phase 1 preflight commit (92eeca19)", () => {
    // The track resolves two distinct sub-issues in one annotation:
    //   (a) duplicate `generateReview` impls → Phase 5 Green
    //       dead-code deletion (3dc3167a)
    //   (b) unverified model capability → Phase 1 OpenRouter
    //       capability preflight (92eeca19)
    // Both must be named in the annotation so a future reader
    // can find each half. The track id must also be present so
    // the closeout is greppable.
    const source = readFileSync(TECH_DEBT_PATH, "utf8");
    const rowLine =
      source
        .split("\n")
        .find(
          (line) =>
            /^\|\s*2026-05-15\s*\|\s*codecamp_review\s*\|/.test(line) &&
            line.includes("Duplicate `generateReview`"),
        ) ?? "";
    expect(
      rowLine,
      "The 2026-05-15 Duplicate `generateReview` row must reference the Phase 5 Green commit `3dc3167a` (the actual deletion of the duplicate call sites).",
    ).toMatch(/3dc3167a/);
    expect(
      rowLine,
      "The 2026-05-15 Duplicate `generateReview` row must reference the Phase 1 OpenRouter preflight commit `92eeca19` (the closure of the 'unverified model capability' half of the row).",
    ).toMatch(/92eeca19/);
    expect(
      rowLine,
      "The annotation must name the resolving track id `codecamp_review_ai_consolidation_20260605` so the row is greppable by track id (matches the convention used by the other rows that close out cross-track findings, e.g. `auth_strategy_review` 2026-05-03).",
    ).toMatch(/codecamp_review_ai_consolidation_20260605/);
  });

  it("tech-debt.md stays within the bounded-memory cap (≤ 51 lines incl. trailing newline)", () => {
    // The file's own header reads "Keep it at or below 50 lines."
    // Today it is 55 lines (over the cap). The Phase 7 closeout
    // resolves a row in-place (no new row added) but a different
    // resolved track may be archived in the same window; guard
    // against a regression that pushes the cap further over.
    const source = readFileSync(TECH_DEBT_PATH, "utf8");
    const rawLines = source.split("\n");
    const lineCount =
      rawLines[rawLines.length - 1] === ""
        ? rawLines.length - 1
        : rawLines.length;
    expect(
      lineCount,
      `tech-debt.md is ${lineCount} lines; the file's header caps it at 50. ` +
        "The Phase 7 closeout must not push it further over the cap — " +
        "prune resolved entries first if other rows need to be added.",
    ).toBeLessThanOrEqual(51);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — lessons-learned.md captures the adapter-factory + preflight lessons
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 2: lessons-learned.md captures the OpenRouter + adapter-factory lessons", () => {
  it("lessons-learned.md exists at the expected Measure path", () => {
    expect(() => readFileSync(LESSONS_LEARNED_PATH, "utf8")).not.toThrow();
  });

  it("contains an entry tagged (2026-06-12, codecamp_review_ai_consolidation_20260605)", () => {
    const source = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    // Convention: `- (YYYY-MM-DD, <track_id>) <lesson prose>` (see
    // other entries like `(2026-06-10, storage_package_20260603)`).
    // Pin the date + track id as anchor tokens; the prose itself
    // is not pinned so the closeout owner can word the lesson.
    const entryPattern = new RegExp(
      `^\\s*-\\s*\\(${CLOSE_DATE}\\s*,\\s*${TRACK_ID}\\)`,
      "m",
    );
    expect(
      entryPattern.test(source),
      `lessons-learned.md must contain a ${CLOSE_DATE} entry ` +
        `tagged "${TRACK_ID}" so the lessons from this track are ` +
        "searchable by date + track id.",
    ).toBe(true);
  });

  it("entry captures the adapter-factory DI-seam lesson (AIClient ↔ reviewExercise bridge)", () => {
    // Phase 0's documented decision was: keep `reviewExercise`'s
    // narrower `(system, prompt) => Promise<ReviewResult>` DI
    // callback shape and add a thin `aiClientToGenerateReview`
    // adapter factory at the call site (lower blast radius than
    // widening the domain function). This is the most reusable
    // pattern the track surfaced and is the lesson the plan calls
    // out ("A/B prompt reconciliation or OpenRouter-as-OpenAI-
    // variant surfaced anything reusable").
    const source = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    const entryMatch = source.match(
      new RegExp(
        `^\\s*-\\s*\\(${CLOSE_DATE}\\s*,\\s*${TRACK_ID}\\)(\\s[\\s\\S]*?)(?=^\\s*$\\s*$|^\\s*-\\s*\\(|^##\\s*)`,
        "m",
      ),
    );
    expect(
      entryMatch,
      `lessons-learned.md must contain a ${CLOSE_DATE} entry ` +
        `tagged "${TRACK_ID}" (precondition for topic assertion).`,
    ).not.toBeNull();
    const body = (entryMatch?.[1] ?? "").toLowerCase();
    // Topic signal A: the adapter-factory pattern. The plan calls
    // this out explicitly. Accept either the factory name
    // (`aiClientToGenerateReview`) or the conceptual phrase
    // ("adapter") — the closeout owner has freedom to express
    // the lesson in their own words.
    const adapterSignals = [
      "aiClientToGenerateReview".toLowerCase(),
      "adapter",
      "di seam",
      "narrower di",
    ];
    const topicMatch = adapterSignals.some((s) => body.includes(s));
    expect(
      topicMatch,
      `lessons-learned.md entry for "${TRACK_ID}" must mention ` +
        "the adapter-factory DI-seam pattern (e.g. " +
        "`aiClientToGenerateReview` / adapter / narrower DI). " +
        "This is the most reusable Phase 0 decision and the " +
        "lesson the plan explicitly calls out. Got: " +
        JSON.stringify(body.slice(0, 240)),
    ).toBe(true);
  });

  it("entry captures at least one of: OpenRouter-as-OpenAI-variant, blast-radius, credential-gated preflight", () => {
    // Three sub-topics the plan flags as candidate lessons; the
    // entry should mention at least one. Pinning any of the three
    // keeps the entry honest about what the track actually
    // surfaced (not just the adapter-factory from the previous
    // test).
    const source = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    const entryMatch = source.match(
      new RegExp(
        `^\\s*-\\s*\\(${CLOSE_DATE}\\s*,\\s*${TRACK_ID}\\)(\\s[\\s\\S]*?)(?=^\\s*$\\s*$|^\\s*-\\s*\\(|^##\\s*)`,
        "m",
      ),
    );
    expect(
      entryMatch,
      `lessons-learned.md must contain a ${CLOSE_DATE} entry ` +
        `tagged "${TRACK_ID}".`,
    ).not.toBeNull();
    const body = (entryMatch?.[1] ?? "").toLowerCase();
    const openrouterVariantSignals = [
      "openai-compatible",
      "openai compatible",
      "baseurl",
      "base url",
      "openrouter as a",
      "openrouter as openai",
      "variant of openai",
    ];
    const blastRadiusSignals = [
      "blast radius",
      "blast-radius",
      "lower blast",
      "widen the seam",
      "widen reviewexercise",
    ];
    const preflightSignals = [
      "skipif",
      "skip if",
      "credential-gated",
      "credential gated",
      "openrouter_api_key",
    ];
    const anyTopic =
      openrouterVariantSignals.some((s) => body.includes(s)) ||
      blastRadiusSignals.some((s) => body.includes(s)) ||
      preflightSignals.some((s) => body.includes(s));
    expect(
      anyTopic,
      `lessons-learned.md entry for "${TRACK_ID}" must mention at ` +
        "least one of: OpenRouter-as-OpenAI-variant (OpenAI-compatible / " +
        "baseURL / OpenRouter-as-OpenAI), blast-radius discipline (blast " +
        "radius / lower blast / widen the seam), or credential-gated " +
        "preflight (skipIf / credential-gated / OPENROUTER_API_KEY). " +
        "These are the three sub-topics the plan flags as candidate " +
        "lessons. Got: " +
        JSON.stringify(body.slice(0, 240)),
    ).toBe(true);
  });

  it("lessons-learned.md stays within the bounded-memory cap (≤ 51 lines incl. trailing newline)", () => {
    const source = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    const rawLines = source.split("\n");
    const lineCount =
      rawLines[rawLines.length - 1] === ""
        ? rawLines.length - 1
        : rawLines.length;
    expect(
      lineCount,
      `lessons-learned.md is ${lineCount} lines; the file's header ` +
        "caps it at 50. The Phase 7 closeout adds a new entry for " +
        `"${TRACK_ID}", so the file must stay within the cap ` +
        "(condense or prune older entries if needed).",
    ).toBeLessThanOrEqual(51);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — tracks.md + dir move
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 3: tracks.md updated + track dir moved to measure/archive/", () => {
  it("the track dir is moved to measure/archive/", () => {
    expect(
      existsSync(TRACK_DIR_ARCHIVE),
      `Expected the track dir to exist at ` +
        `measure/archive/${TRACK_ID}/ after the move-to-archive ` +
        `closeout step.`,
    ).toBe(true);
  });

  it("the track dir is no longer at measure/tracks/", () => {
    expect(
      !existsSync(TRACK_DIR_TRACKS),
      `Expected the track dir to have been removed from ` +
        `measure/tracks/${TRACK_ID}/ as part of the move-to-archive. ` +
        "The dir still exists at the old location.",
    ).toBe(true);
  });

  it("the archive dir preserves the full artefact set (plan/spec/metadata/test-strategy)", () => {
    expect(
      existsSync(TRACK_DIR_ARCHIVE),
      "Precondition: the archive dir must exist before the " +
        "artefact-preservation assertion can run. The previous " +
        "test catches the dir-missing case explicitly.",
    ).toBe(true);
    const requiredFiles = [
      "plan.md",
      "spec.md",
      "metadata.json",
      "test-strategy.md",
    ];
    for (const fileName of requiredFiles) {
      const filePath = join(TRACK_DIR_ARCHIVE, fileName);
      expect(
        existsSync(filePath),
        `Archive dir must contain ${fileName} (the in-flight ` +
          "tracks/ copy has this file; the move must preserve the " +
          "full artefact set, not just the original 3 files).",
      ).toBe(true);
    }
  });

  it("tracks.md flips the codecamp_review_ai_consolidation_20260605 entry to [x] with the archive link", () => {
    const source = readFileSync(TRACKS_REGISTRY_PATH, "utf8");
    const trackLine = source
      .split("\n")
      .find(
        (line) =>
          line.includes("codecamp_review_ai_consolidation_20260605") &&
          line.includes("**Track:"),
      );
    expect(
      trackLine,
      "tracks.md must contain a `- [STATUS] **Track: ...**` heading line " +
        "naming codecamp_review_ai_consolidation_20260605.",
    ).toBeDefined();
    const line = trackLine ?? "";
    expect(
      line,
      "After Phase 7 task 3, the tracks.md entry must be `[x]` (completed). " +
        "Today it is `[ ]` (pending).",
    ).toMatch(/^-\s*\[x\]/);
    expect(
      line,
      "After Phase 7 task 3, the tracks.md link must point to " +
        "`./archive/codecamp_review_ai_consolidation_20260605/`. " +
        "Today it points to `./tracks/codecamp_review_ai_consolidation_20260605/`.",
    ).toMatch(/\.\/archive\/codecamp_review_ai_consolidation_20260605\//);
    expect(
      /\.\/tracks\/codecamp_review_ai_consolidation_20260605\//.test(line),
      "After Phase 7 task 3, the tracks.md link must NOT still point to " +
        "`./tracks/codecamp_review_ai_consolidation_20260605/` — that path is gone after the move.",
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 4 — git notes attached to the closeout (dir-move) commit
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 4: git notes attached to the closeout (dir-move) commit", () => {
  it("the latest commit touching the track dir has a git notes note", () => {
    // The dir-move commit (`git mv measure/tracks/<id>/* measure/archive/<id>/*`
    // or equivalent) is the latest commit touching either path. The
    // closeout task attaches a `git notes add` note to that commit
    // summarizing the track. The note is what `git log --notes` and
    // `git notes show <sha>` will print for a future reader.
    //
    // Note: `-n 1` must come BEFORE `--`; after `--` git interprets
    // it as part of the pathspec list and returns every matching
    // commit instead of the latest one.
    const latestTouching = safeExec(
      `git log -n 1 --format=%H -- ${shellQuote(`measure/tracks/${TRACK_ID}/`)} ${shellQuote(`measure/archive/${TRACK_ID}/`)}`,
    );
    expect(
      latestTouching.length > 0,
      `Expected at least one commit to have touched the track dir. ` +
        "This should be the closeout (dir-move) commit.",
    ).toBe(true);

    // `git notes show <sha>` exits non-zero with no output when no
    // note is attached; safeExec swallows that into "".
    const note = safeExec(`git notes show ${latestTouching}`);
    expect(
      note.length > 0,
      `The latest commit touching the track dir (${latestTouching}) ` +
        "has no `git notes` note attached. The Phase 7 task #4 " +
        "requires `git notes add -m \"...\" <sha>` summarizing the " +
        "track — a future reader reviewing the closeout will see no " +
        "summary without it.",
    ).toBe(true);
  });

  it("the git notes note mentions this track id by name", () => {
    const latestTouching = safeExec(
      `git log -n 1 --format=%H -- ${shellQuote(`measure/tracks/${TRACK_ID}/`)} ${shellQuote(`measure/archive/${TRACK_ID}/`)}`,
    );
    expect(latestTouching.length > 0).toBe(true);

    const note = safeExec(`git notes show ${latestTouching}`);
    expect(note.length > 0).toBe(true);

    expect(
      note.includes(TRACK_ID),
      `The git notes note on ${latestTouching} must mention the ` +
        `track id "${TRACK_ID}" so it is searchable by name. ` +
        `Got note: ${JSON.stringify(note.slice(0, 200))}`,
    ).toBe(true);
  });

  it("the git notes note references the resolving commit (3dc3167a)", () => {
    // The dir-move commit is bookkeeping, not the resolving commit.
    // The git notes summary is the right place to cite the
    // resolving commits so a future reviewer sees the closure
    // evidence at a glance.
    const latestTouching = safeExec(
      `git log -n 1 --format=%H -- ${shellQuote(`measure/tracks/${TRACK_ID}/`)} ${shellQuote(`measure/archive/${TRACK_ID}/`)}`,
    );
    expect(latestTouching.length > 0).toBe(true);
    const note = safeExec(`git notes show ${latestTouching}`);
    expect(note.length > 0).toBe(true);
    expect(
      note.includes(RESOLVING_COMMIT),
      `The git notes note on the closeout commit (${latestTouching}) ` +
        `must reference the Phase 5 Green resolving commit ` +
        `'${RESOLVING_COMMIT}' (the actual deletion of the duplicate ` +
        "call sites — the closure of the tech-debt row). Got note: " +
        JSON.stringify(note.slice(0, 240)),
    ).toBe(true);
  });
});
