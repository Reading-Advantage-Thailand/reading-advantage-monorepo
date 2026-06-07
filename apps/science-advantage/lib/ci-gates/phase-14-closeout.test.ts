/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` /
 * Phase 14 ("Closeout").
 *
 * Mirrors the Phase 0 / Phase 1 / Phase 3 / Phase 4 / Phase 6 / Phase 7 /
 * Phase 8 / Phase 9 / Phase 10 / Phase 11 / Phase 12 / Phase 12B / Phase
 * 12C / Phase 13 files in style: file-content / file-existence
 * regression guards that mirror the strategy's stated end-state
 * condition. No external commands are spawned (no `tsc`, no
 * `pnpm turbo run ...`) because Phase 14 is a pure Measure-docs +
 * archive-move operation.
 *
 * Background (per
 * `measure/tracks/ci_typecheck_alignment_20260603/spec.md` and
 * `test-strategy.md` §1 row P14):
 *
 *   Phase 14 is the track closeout. Its 4 sub-tasks per `plan.md`:
 *
 *     1. Update `measure/tech-debt.md` row `auth_strategy_review` to
 *        `Resolved` and append a note that the resolution was via
 *        this track.
 *     2. Update `measure/tech-debt.md` row
 *        `audit_20260603_housekeeping_batch` to mark F-1001, F-1002,
 *        F-1204, F-1205 `Resolved` (F-1003 was resolved by Track 0,
 *        `protocol_v1_1_graphdb_20260603`).
 *     3. Add a lessons-learned entry:
 *        "`ignoreBuildErrors: true` is the single biggest
 *         type-safety hole; ~370 errors masked 6 root causes, each
 *         fixable in a small PR."
 *     4. Move the track to
 *        `measure/archive/ci_typecheck_alignment_20260603/` and
 *        update `measure/tracks.md` to point at the archive path.
 *
 *   Verified current state (2026-06-07):
 *
 *     - `measure/tech-debt.md:19` — `auth_strategy_review` row reads
 *       `Status: Open`. Resolution note absent.
 *     - `measure/tech-debt.md:43` —
 *       `audit_20260603_housekeeping_batch` row reads `Status: Open`;
 *       F-1001 / F-1002 / F-1204 / F-1205 are mentioned inside the
 *       notes as "resolved by `ci_typecheck_alignment_20260603`
 *       (Track 11), not here" but the row itself is not flipped
 *       to `Resolved`.
 *     - `measure/lessons-learned.md` — 50 lines (at the cap). No
 *       entry matching the new
 *       "`ignoreBuildErrors: true` is the single biggest
 *        type-safety hole" phrase. (A *related* but distinct entry
 *       exists at line 39 — about Prisma-removal re-evaluating
 *       tech-debt — but it is not the canonical closeout entry.)
 *     - Track directory is at
 *       `measure/tracks/ci_typecheck_alignment_20260603/` (active
 *       registry). The archive path
 *       `measure/archive/ci_typecheck_alignment_20260603/` does
 *       not exist.
 *     - `measure/tracks.md:115-116` lists the track under
 *       "Pending Tracks" pointing at `./tracks/ci_typecheck_alignment_20260603/`
 *       (unresolved checkbox, active status).
 *
 * The Phase 14 end-state contract (file-content regression guards
 * for the 4 sub-tasks, mirroring the strategy's stated end-state
 * condition in `test-strategy.md` §1 row P14 / §5 P14):
 *
 *   (a) **`auth_strategy_review` row → `Resolved` with a track-
 *       reference note** — file-content regression guard on
 *       `measure/tech-debt.md`. The row's `Status` cell must read
 *       `Resolved` and the notes cell must reference this track
 *       (`ci_typecheck_alignment_20260603`).
 *   (b) **`audit_20260603_housekeeping_batch` row → marks F-1001,
 *       F-1002, F-1204, F-1205 as `Resolved`** — file-content
 *       regression guard. Each F-ID must be individually marked
 *       `Resolved` in the row's notes.
 *   (c) **`measure/lessons-learned.md` contains the new entry**
 *       — file-content regression guard. The new entry must
 *       contain the canonical phrase
 *       "`ignoreBuildErrors: true` is the single biggest
 *        type-safety hole" (or a semantically equivalent
 *        restatement). The 50-line cap from the file header
 *       ("Keep it at or below **50 lines**") is also locked
 *       to surface accidental over-addition.
 *   (d) **Track moved to `measure/archive/...` and `tracks.md`
 *       updated** — file-existence regression guard. The track
 *       directory must exist at the archive path with the 4
 *       expected files (`metadata.json`, `plan.md`, `spec.md`,
 *       `test-strategy.md`); the original
 *       `measure/tracks/<id>/` directory must NOT exist; and
 *       `measure/tracks.md` must reference the archive path
 *       (with a resolved checkbox — the convention used by all
 *       other archived tracks per lines 26-145).
 *
 * Tests in this file (16 it-blocks across 4 describe blocks):
 *
 *   **Describe: Task 1 — `auth_strategy_review` row → Resolved**
 *     1. Row exists in tech-debt.md
 *     2. Row status is `Resolved` (red-phase; fails today)
 *     3. Row notes reference this track
 *        (`ci_typecheck_alignment_20260603`)
 *     4. The 360-errors / 6-root-causes narrative is preserved
 *        in the notes (forward-compat regression guard)
 *
 *   **Describe: Task 2 — `audit_20260603_housekeeping_batch`
 *               F-ID resolution flags**
 *     5. Row exists in tech-debt.md
 *     6. F-1001 is marked `Resolved` (red-phase; fails today)
 *     7. F-1002 is marked `Resolved` (red-phase; fails today)
 *     8. F-1204 is marked `Resolved` (red-phase; fails today)
 *     9. F-1205 is marked `Resolved` (red-phase; fails today)
 *    10. F-1003 row reference preserved (resolves-via-Track-0
 *        note, regression guard)
 *
 *   **Describe: Task 3 — lessons-learned entry**
 *    11. File exists at `measure/lessons-learned.md`
 *    12. File contains the new entry phrase
 *        (red-phase; fails today)
 *    13. File length ≤ 50 lines (regression guard; passes today
 *        at 50 lines, prevents accidental cap-bust on closeout)
 *
 *   **Describe: Task 4 — track moved to archive + tracks.md
 *               updated**
 *    14. Archive directory exists at
 *        `measure/archive/ci_typecheck_alignment_20260603/`
 *        (red-phase; fails today)
 *    15. Archive directory contains the 4 expected files
 *        (red-phase; fails today)
 *    16. `measure/tracks.md` references the archive path with
 *        a resolved checkbox (red-phase; fails today)
 *
 * Targeted vitest command (DB-free, <1s):
 *   `pnpm --filter science-advantage exec vitest run
 *      --config vitest.unit.config.ts
 *      lib/ci-gates/phase-14-closeout.test.ts`
 *
 * Note: the test reads `measure/**` from the monorepo root,
 * which is the parent of the package root (`apps/science-advantage/`)
 * — `process.cwd()` during vitest run is the package root.
 * Paths are resolved via `path.resolve` with `../../` escaping
 * the package root.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * The monorepo root, parent of the package root.
 *
 * `process.cwd()` is the package root (`apps/science-advantage/`)
 * because the targeted vitest command is
 * `pnpm --filter science-advantage exec vitest run --config ...`.
 * The Measure docs live at `<monorepo>/measure/`, so paths are
 * resolved via `resolve(SCIENCE_ADVANTAGE_ROOT, "..", "..", "measure", ...)`.
 */
const MONOREPO_ROOT = resolve(process.cwd(), "..", "..");

const TECH_DEBT_PATH = resolve(MONOREPO_ROOT, "measure", "tech-debt.md");
const LESSONS_LEARNED_PATH = resolve(MONOREPO_ROOT, "measure", "lessons-learned.md");
const TRACKS_REGISTRY_PATH = resolve(MONOREPO_ROOT, "measure", "tracks.md");
const TRACK_DIR_ACTIVE = resolve(
  MONOREPO_ROOT,
  "measure",
  "tracks",
  "ci_typecheck_alignment_20260603",
);
const TRACK_DIR_ARCHIVE = resolve(
  MONOREPO_ROOT,
  "measure",
  "archive",
  "ci_typecheck_alignment_20260603",
);

/**
 * Read a file as UTF-8 text, returning `null` if the file does not
 * exist. Used by every file-content assertion below so a regression
 * that deletes the file surfaces a clear "file missing" message
 * rather than a raw `ENOENT` stack.
 *
 * @param filePath Absolute path to the file to read.
 * @returns The file contents as a string, or `null` if the file
 *   does not exist.
 */
function readOrNull(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf8");
}

/**
 * Extract the row text (one table line) from a Markdown table that
 * contains the given Track column value. Returns `null` if no
 * matching row is found. Used to scope per-row assertions to a
 * specific `measure/tech-debt.md` row without false-positives on
 * other rows that mention the same F-IDs.
 *
 * The `measure/tech-debt.md` table format is:
 *   `| Date | Track | Item | Severity | Status | Notes |`
 * followed by pipe-separated rows. The `Track` column is column
 * index 1; this helper splits on the first 6 pipes (date, track,
 * item, severity, status) and returns the remainder of the line
 * (notes + trailing pipe) as a substring. A simpler, more robust
 * approach: match the full line containing the `Track` value as
 * a whole token and return the matched line.
 *
 * @param content The full file content.
 * @param trackValue The value of the `Track` column to locate
 *   (e.g. `auth_strategy_review`).
 * @returns The matching row text (single line, including the
 *   trailing newline), or `null` if no match.
 */
function findTableRow(
  content: string,
  trackValue: string,
): string | null {
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (!line.includes(`| ${trackValue} |`)) continue;
    return line;
  }
  return null;
}

describe("Phase 14 / Task 1 — tech-debt.md auth_strategy_review row → Resolved", () => {
  const content = readOrNull(TECH_DEBT_PATH);

  it("1. tech-debt.md exists at measure/tech-debt.md", () => {
    expect(content).not.toBeNull();
  });

  it("2. auth_strategy_review row Status is `Resolved` (red-phase)", () => {
    if (content === null) {
      throw new Error(
        `tech-debt.md missing at ${TECH_DEBT_PATH}; cannot assert row status.`,
      );
    }
    const row = findTableRow(content, "auth_strategy_review");
    expect(row, "auth_strategy_review row must exist in tech-debt.md").not.toBeNull();
    if (row === null) return;
    // Status is column 5 (0-indexed after splitting on `|`) per the
    // header "| Date | Track | Item | Severity | Status | Notes |".
    // Split on `|`, trim, and pick index 5 (the Status cell).
    const cells = row.split("|").map((cell) => cell.trim());
    const statusCell = cells[5];
    expect(
      statusCell,
      `auth_strategy_review row Status must be "Resolved" (red-phase: was "${statusCell}").`,
    ).toBe("Resolved");
  });

  it("3. auth_strategy_review row Notes reference this track", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "auth_strategy_review");
    expect(row).not.toBeNull();
    if (row === null) return;
    const cells = row.split("|").map((cell) => cell.trim());
    const notesCell = cells[6];
    expect(
      notesCell,
      "auth_strategy_review Notes must reference ci_typecheck_alignment_20260603.",
    ).toContain("ci_typecheck_alignment_20260603");
  });

  it("4. auth_strategy_review row preserves the 360 / 6 root-cause narrative (regression guard)", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "auth_strategy_review");
    expect(row).not.toBeNull();
    if (row === null) return;
    const cells = row.split("|").map((cell) => cell.trim());
    const notesCell = cells[6];
    // The resolution note should preserve the original
    // decomposition context (360 tsc errors / 6 root causes) so
    // future readers can understand the scope. Loosely
    // matched (numeric OR word) to allow "617" (actual count
    // post-upgrade) or "360" (original spec count).
    const hasNumber =
      /360/.test(notesCell) || /617/.test(notesCell) || /~370/.test(notesCell);
    // The original notes use a (a)..(f) bullet sequence (6 sub-items)
    // for the blocker decomposition, plus a "6 warnings" baseline
    // figure. The resolution note should preserve either or both
    // signals. The regex is deliberately flexible: it matches the
    // explicit "6 root cause" phrase OR the (a)..(f) bullet
    // sequence OR the "6 warnings" baseline.
    const hasSixCauses =
      /6 root cause|6 blockers|6 warnings|\(a\)[\s\S]*?\(f\)/i.test(notesCell);
    expect(
      hasNumber,
      "auth_strategy_review Notes must preserve the tsc-error count (360 / 617 / ~370).",
    ).toBe(true);
    expect(
      hasSixCauses,
      "auth_strategy_review Notes must mention the 6 root causes.",
    ).toBe(true);
  });
});

describe("Phase 14 / Task 2 — tech-debt.md audit_20260603_housekeeping_batch F-ID resolution flags", () => {
  const content = readOrNull(TECH_DEBT_PATH);

  it("5. audit_20260603_housekeeping_batch row exists in tech-debt.md", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "audit_20260603_housekeeping_batch");
    expect(
      row,
      "audit_20260603_housekeeping_batch row must exist in tech-debt.md.",
    ).not.toBeNull();
  });

  it("6. F-1001 is marked `Resolved` in the row notes (red-phase)", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "audit_20260603_housekeeping_batch");
    expect(row).not.toBeNull();
    if (row === null) return;
    // Per-F-ID resolution marker: the F-ID must be followed by a
    // case-sensitive "Resolved" (canonical marker, optionally
    // bold) within 60 characters. The case-sensitivity is the
    // differentiator from the row's existing group-resolution
    // clause ("are resolved by `ci_typecheck_alignment_20260603`
    // (Track 11)") which uses lowercase "resolved". The 60-char
    // scope spans a single parenthetical / line-break / short
    // prose bridge but does not span the ~150-char gap from
    // F-1001 to the group-resolution clause.
    const f1001Match = row.match(/F-1001[\s\S]{0,60}?(?:\*\*)?Resolved(?:\*\*)?/);
    expect(
      f1001Match,
      "F-1001 must be marked `Resolved` in audit_20260603_housekeeping_batch row notes.",
    ).not.toBeNull();
  });

  it("7. F-1002 is marked `Resolved` in the row notes (red-phase)", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "audit_20260603_housekeeping_batch");
    expect(row).not.toBeNull();
    if (row === null) return;
    const f1002Match = row.match(/F-1002[\s\S]{0,60}?(?:\*\*)?Resolved(?:\*\*)?/);
    expect(
      f1002Match,
      "F-1002 must be marked `Resolved` in audit_20260603_housekeeping_batch row notes.",
    ).not.toBeNull();
  });

  it("8. F-1204 is marked `Resolved` in the row notes (red-phase)", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "audit_20260603_housekeeping_batch");
    expect(row).not.toBeNull();
    if (row === null) return;
    const f1204Match = row.match(/F-1204[\s\S]{0,60}?(?:\*\*)?Resolved(?:\*\*)?/);
    expect(
      f1204Match,
      "F-1204 must be marked `Resolved` in audit_20260203_housekeeping_batch row notes.",
    ).not.toBeNull();
  });

  it("9. F-1205 is marked `Resolved` in the row notes (red-phase)", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "audit_20260603_housekeeping_batch");
    expect(row).not.toBeNull();
    if (row === null) return;
    const f1205Match = row.match(/F-1205[\s\S]{0,60}?(?:\*\*)?Resolved(?:\*\*)?/);
    expect(
      f1205Match,
      "F-1205 must be marked `Resolved` in audit_20260603_housekeeping_batch row notes.",
    ).not.toBeNull();
  });

  it("10. F-1003 `Resolved`-by-Track-0 reference preserved (regression guard)", () => {
    if (content === null) {
      throw new Error(`tech-debt.md missing at ${TECH_DEBT_PATH}.`);
    }
    const row = findTableRow(content, "audit_20260603_housekeeping_batch");
    expect(row).not.toBeNull();
    if (row === null) return;
    // F-1003 was resolved by Track 0 (protocol_v1_1_graphdb_20260603)
    // per the row's notes. The reference must be preserved across
    // the Phase 14 closeout edit.
    expect(
      row,
      "F-1003 reference (resolved by Track 0) must be preserved.",
    ).toMatch(/F-1003.*?(protocol_v1_1_graphdb|Track 0)/);
  });
});

describe("Phase 14 / Task 3 — measure/lessons-learned.md new entry", () => {
  const content = readOrNull(LESSONS_LEARNED_PATH);

  it("11. measure/lessons-learned.md exists", () => {
    expect(content).not.toBeNull();
  });

  it("12. file contains the new entry: `ignoreBuildErrors: true` is the single biggest type-safety hole (red-phase)", () => {
    if (content === null) {
      throw new Error(
        `lessons-learned.md missing at ${LESSONS_LEARNED_PATH}.`,
      );
    }
    // The new entry's canonical phrasing is the verbatim text from
    // the Phase 14 plan task 3, plus the surrounding "370 errors
    // masked 6 root causes" continuation. Match the
    // `ignoreBuildErrors: true` lead-in and the 6-root-causes
    // continuation.
    const hasLeadIn = /`ignoreBuildErrors: true`/.test(content);
    const hasTypeSafetyHole = /type-safety hole/i.test(content);
    const hasSixCauses = /6 root cause/i.test(content);
    expect(
      hasLeadIn && hasTypeSafetyHole && hasSixCauses,
      "lessons-learned.md must contain the new entry referencing " +
        "`ignoreBuildErrors: true` as a type-safety hole " +
        "and the 6 root causes.",
    ).toBe(true);
  });

  it("13. file length ≤ 50 lines (regression guard for the file-header cap)", () => {
    if (content === null) {
      throw new Error(
        `lessons-learned.md missing at ${LESSONS_LEARNED_PATH}.`,
      );
    }
    // `trimEnd()` strips a trailing newline so split("\n") gives
    // the actual line count (not N+1). The file-header cap is
    // "Keep it at or below 50 lines".
    const lineCount = content.trimEnd().split("\n").length;
    expect(
      lineCount,
      `lessons-learned.md must be at or below 50 lines (file-header cap); ` +
        `was ${lineCount}. Condense or remove an older entry before adding the new one.`,
    ).toBeLessThanOrEqual(50);
  });
});

describe("Phase 14 / Task 4 — track moved to archive + tracks.md updated", () => {
  it("14. archive directory exists at measure/archive/ci_typecheck_alignment_20260603/ (red-phase)", () => {
    expect(
      existsSync(TRACK_DIR_ARCHIVE),
      `archive directory must exist at ${TRACK_DIR_ARCHIVE}.`,
    ).toBe(true);
  });

  it("15. archive directory contains the 4 expected files (red-phase)", () => {
    if (!existsSync(TRACK_DIR_ARCHIVE)) {
      throw new Error(
        `archive directory missing at ${TRACK_DIR_ARCHIVE}; cannot list files.`,
      );
    }
    const stat = statSync(TRACK_DIR_ARCHIVE);
    expect(stat.isDirectory(), "archive path must be a directory.").toBe(true);
    const files = readdirSync(TRACK_DIR_ARCHIVE).sort();
    expect(
      files,
      `archive directory must contain metadata.json, plan.md, spec.md, test-strategy.md; was ${JSON.stringify(files)}.`,
    ).toEqual(
      expect.arrayContaining([
        "metadata.json",
        "plan.md",
        "spec.md",
        "test-strategy.md",
      ]),
    );
  });

  it("16. measure/tracks.md references the archive path with a resolved checkbox (red-phase)", () => {
    const content = readOrNull(TRACKS_REGISTRY_PATH);
    if (content === null) {
      throw new Error(`tracks.md missing at ${TRACKS_REGISTRY_PATH}.`);
    }
    // Find the ci_typecheck_alignment_20260603 line block. The
    // archive-move convention (per measure/tracks.md lines 26-145
    // for all other archived tracks) is:
    //   `- [x] **Track: ...** *Link:
    //      [./archive/ci_typecheck_alignment_20260603/]
    //      (./archive/ci_typecheck_alignment_20260603/)*`
    //
    // The red-phase assertion is that the entry references the
    // archive path AND has a resolved checkbox.
    const line = content
      .split("\n")
      .find((l) => l.includes("ci_typecheck_alignment_20260603"));
    expect(
      line,
      "tracks.md must contain a line referencing ci_typecheck_alignment_20260603.",
    ).toBeDefined();
    if (line === undefined) return;
    expect(
      line,
      "tracks.md line must reference the ./archive/ci_typecheck_alignment_20260603/ path.",
    ).toContain("./archive/ci_typecheck_alignment_20260603/");
    // Resolved checkbox: the line itself or a nearby `- [x]` for
    // the same track heading. Allow the line to start with
    // `- [x]` (track heading) OR the link to be inside an
    // `- [x]` block.
    const hasResolvedCheckbox = /^- \[x\]\s+\*\*Track:[^*]*ci_typecheck_alignment/m.test(
      content,
    );
    expect(
      hasResolvedCheckbox,
      "tracks.md must have a `- [x]` checkbox for ci_typecheck_alignment_20260603 " +
        "(track moved to archive, checkbox resolved).",
    ).toBe(true);
  });
});
