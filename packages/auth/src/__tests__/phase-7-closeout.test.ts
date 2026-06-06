// Red-phase Phase 7 Closeout pinning tests.
//
// Per `measure/tracks/audit_log_retention_dsar_20260605/plan.md`
// Phase 7 (the four closeout tasks):
//
//   1. Update `measure/tech-debt.md`: note retention/DSAR delivered;
//      reconcile any audit-log follow-up rows.
//   2. Add a lessons-learned entry if anything non-obvious surfaced
//      (privileged-connection DELETE against an append-only table;
//      advisory-lock job pattern).
//   3. Update `measure/tracks.md` (mark complete) and move the track
//      dir to `measure/archive/`.
//   4. Commit with `git notes` summarizing the track.
//
// Phase 7 has no source code and no new tests-of-behavior — it is a
// documentation/bookkeeping phase. Following the established
// `phase-1-docs.test.ts` / `phase-6-quality-gates.test.ts` pattern,
// this file pins the four closeout deliverables as file-system and
// git-state assertions so a regression (e.g. the track gets archived
// but the tech-debt row is forgotten, or the lessons-learned entry
// misses the privileged-DELETE gotcha) trips the test runner
// instead of relying on a doc review.
//
// What this file pins:
//
//   1. `measure/tech-debt.md` MUST contain a row tagged
//      `audit_log_retention_dsar_20260605` that records the delivery
//      (and any follow-up reconciliation from the prior audit-log
//      track). The file MUST stay at or below the 50-line working-
//      memory cap, so the new row requires pruning the oldest
//      resolved entries (the file is currently at the cap).
//
//   2. `measure/lessons-learned.md` MUST contain a 2026-06-06 entry
//      tagged `audit_log_retention_dsar_20260605` that captures at
//      least one of the two non-obvious topics the plan calls out
//      (privileged-connection DELETE against an append-only table,
//      advisory-lock job pattern). The file MUST stay ≤ 50 lines
//      (currently 46, so 1–4 new lines are budgeted).
//
//   3. `measure/tracks.md` MUST NOT have a `[ ]` entry for the
//      track; the track dir MUST exist at
//      `measure/archive/audit_log_retention_dsar_20260605/` and MUST
//      NOT exist at `measure/tracks/audit_log_retention_dsar_20260605/`.
//      Together these pin the move-to-archive invariant.
//
//   4. The most recent commit that touched the track directory
//      (the dir-move commit) MUST have a `git notes` note attached
//      that mentions the track id. The note text is what a future
//      reader will see when reviewing the closeout — it must
//      identify the track by name.
//
// All four assertions are pure file-system / git-state reads; no DB,
// no pnpm, no global vitest setup needed. The file lives at
// `packages/auth/src/__tests__/` (the same home as the prior
// phase-pin tests in this track) so vitest auto-discovery picks it
// up with no config changes.
//
// Run with:
//   cd packages/auth && npx vitest run src/__tests__/phase-7-closeout.test.ts
//
// RED expectations (2026-06-06):
//   - tech-debt.md has no `audit_log_retention_dsar_20260605` row
//     → task-1 assertions fail
//   - lessons-learned.md has no `audit_log_retention_dsar_20260605`
//     entry → task-2 assertions fail
//   - track dir is at `tracks/`, not `archive/`; tracks.md still
//     has `[ ]` for the track → task-3 assertions fail
//   - HEAD (and the latest commit on the track dir) has no
//     `git notes` entry → task-4 assertion fails
//
// These four failures are the expected Red-phase signal. The
// Green-phase owner fixes them by performing the four closeout
// tasks: append the tech-debt row, append the lessons-learned
// entry, git-mv the dir + edit tracks.md, and attach a git note
// to the dir-move commit. After that, the four assertions go
// green and the track is ready to mark `[x]`.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "../../../..//");

const TECH_DEBT_PATH = resolve(REPO_ROOT, "measure/tech-debt.md");
const LESSONS_LEARNED_PATH = resolve(REPO_ROOT, "measure/lessons-learned.md");
const TRACKS_REGISTRY_PATH = resolve(REPO_ROOT, "measure/tracks.md");

const TRACK_DIR_TRACKS = resolve(
  REPO_ROOT,
  "measure/tracks/audit_log_retention_dsar_20260605",
);
const TRACK_DIR_ARCHIVE = resolve(
  REPO_ROOT,
  "measure/archive/audit_log_retention_dsar_20260605",
);

const TRACK_ID = "audit_log_retention_dsar_20260605";
const CLOSE_DATE = "2026-06-06";

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

// ---------------------------------------------------------------------------
// Task 1 — tech-debt.md records retention/DSAR delivery
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 1: measure/tech-debt.md records retention/DSAR delivery", () => {
  it("tech-debt.md exists at the expected path", () => {
    expect(
      existsSync(TECH_DEBT_PATH),
      "Expected measure/tech-debt.md to exist.",
    ).toBe(true);
  });

  it("tech-debt.md contains a row tagged with this track id", () => {
    expect(
      existsSync(TECH_DEBT_PATH),
      "tech-debt.md must exist before its content can be pinned.",
    ).toBe(true);

    const source = readFileSync(TECH_DEBT_PATH, "utf-8");
    // The track id must appear as the cell in the Track column. The
    // table is pipe-separated; a line like
    //   `| 2026-06-06 | audit_log_retention_dsar_20260605 | ... |`
    // contains the track id. We do not constrain the exact column
    // position — only that the id appears at all in a pipe-prefixed
    // table row (defends against accidental drift into prose).
    const rowPattern = new RegExp(
      `^\\s*\\|\\s*[^|]*\\|\\s*${TRACK_ID}\\s*\\|`,
      "m",
    );
    expect(
      rowPattern.test(source),
      `tech-debt.md must contain a pipe-table row whose Track column ` +
        `is "${TRACK_ID}". The closeout owner records the delivery ` +
        `so future readers can find the resolved row by track id.`,
    ).toBe(true);
  });

  it("tech-debt.md row for this track records the delivery (Resolved status)", () => {
    expect(
      existsSync(TECH_DEBT_PATH),
      "tech-debt.md must exist before its content can be pinned.",
    ).toBe(true);

    const source = readFileSync(TECH_DEBT_PATH, "utf-8");
    // Find the row, then check that its Status column is Resolved.
    // The Status column is the 5th column in the existing rows; we
    // anchor on the row beginning with the track id, then accept
    // any "Resolved" / "Delivered" / "Closed" status to leave room
    // for a future status taxonomy.
    const rowMatch = source.match(
      new RegExp(
        `^\\s*\\|\\s*[^|]*\\|\\s*${TRACK_ID}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)\\s*\\|`,
        "m",
      ),
    );
    expect(
      rowMatch,
      `tech-debt.md must contain a row tagged "${TRACK_ID}" with ` +
        `Item | Severity | Status columns.`,
    ).not.toBeNull();
    // The 4th capture group is the Status column.
    const status = rowMatch![3] ?? "";
    const allowedStatuses = /Resolved|Delivered|Closed/i;
    expect(
      allowedStatuses.test(status),
      `tech-debt.md row for "${TRACK_ID}" must record a closed ` +
        `status (Resolved / Delivered / Closed). Got Status = ` +
        `"${status}".`,
    ).toBe(true);
  });

  it("tech-debt.md stays within the 50-line working-memory cap after the new row is added", () => {
    // AGENTS.md + measure/tech-debt.md header: "Keep it at or below
    // 50 lines." The file is currently at the cap (50 lines), so
    // the closeout work must prune resolved entries (or
    // consolidate them) before appending the new row. This test
    // guards against the easy "just append" anti-pattern.
    expect(
      existsSync(TECH_DEBT_PATH),
      "tech-debt.md must exist before its line count can be asserted.",
    ).toBe(true);

    const source = readFileSync(TECH_DEBT_PATH, "utf-8");
    // Split on newlines and drop a trailing empty element from the
    // final '\n' so a 50-line file with a trailing newline reports
    // as 50 lines, not 51. The split without filter counts the
    // terminator as a separator, producing an off-by-one.
    const rawLines = source.split("\n");
    const lineCount =
      rawLines[rawLines.length - 1] === ""
        ? rawLines.length - 1
        : rawLines.length;
    expect(
      lineCount,
      `tech-debt.md is the working-memory registry and must stay ` +
        `≤ 50 lines per AGENTS.md. Current line count is ` +
        `${lineCount}; the closeout work adds a new row for ` +
        `"${TRACK_ID}", so the file must be pruned to fit.`,
    ).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — lessons-learned.md captures the non-obvious lessons
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 2: measure/lessons-learned.md captures non-obvious lessons", () => {
  it("lessons-learned.md exists at the expected path", () => {
    expect(
      existsSync(LESSONS_LEARNED_PATH),
      "Expected measure/lessons-learned.md to exist.",
    ).toBe(true);
  });

  it("lessons-learned.md contains a 2026-06-06 entry tagged with this track id", () => {
    expect(
      existsSync(LESSONS_LEARNED_PATH),
      "lessons-learned.md must exist before its content can be pinned.",
    ).toBe(true);

    const source = readFileSync(LESSONS_LEARNED_PATH, "utf-8");
    // Existing entries use the format
    //   `- (YYYY-MM-DD, <track_id>) <lesson prose>`
    // at the start of a bullet. Pin the date and the track id as
    // anchor tokens — the prose itself is intentionally not pinned
    // so the closeout owner has freedom to express the lesson in
    // their own words.
    const entryPattern = new RegExp(
      `^\\s*-\\s*\\(${CLOSE_DATE}\\s*,\\s*${TRACK_ID}\\)`,
      "m",
    );
    expect(
      entryPattern.test(source),
      `lessons-learned.md must contain an entry dated ` +
        `${CLOSE_DATE} tagged "${TRACK_ID}". The closeout owner ` +
        `appends a lessons-learned bullet so the gotchas from this ` +
        `track are searchable by date + track id.`,
    ).toBe(true);
  });

  it("lessons-learned.md entry mentions at least one of the two flagged non-obvious topics", () => {
    // The plan calls out two specific topics the entry should
    // cover: (a) privileged-connection DELETE against an
    // append-only table, (b) advisory-lock job pattern. We do not
    // pin the exact phrasing — only the topic signal — so the
    // closeout owner can word the lesson naturally. Both topics
    // are real implementation findings from Phases 2 + 3 of this
    // track.
    expect(
      existsSync(LESSONS_LEARNED_PATH),
      "lessons-learned.md must exist before its content can be pinned.",
    ).toBe(true);

    const source = readFileSync(LESSONS_LEARNED_PATH, "utf-8");
    const rowMatch = source.match(
      new RegExp(
        `^\\s*-\\s*\\(${CLOSE_DATE}\\s*,\\s*${TRACK_ID}\\)\\s*([\\s\\S]*?)(?=^\\s*$|^\\s*-\\s*\\(|^##\\s*)`,
        "m",
      ),
    );
    expect(
      rowMatch,
      `lessons-learned.md must contain a ${CLOSE_DATE} entry ` +
        `tagged "${TRACK_ID}".`,
    ).not.toBeNull();

    const entryBody = (rowMatch![1] ?? "").toLowerCase();
    // Topic signals — at least one must appear in the entry body.
    // We use OR so a single-topic entry (e.g. a one-line addendum)
    // still passes; an entry covering both topics gets a free
    // bonus signal.
    const privilegedDeleteSignals = [
      "privileged",
      "direct_database_url",
      "revoke",
      "append-only",
      "append only",
      "delete on",
    ];
    const advisoryLockSignals = [
      "advisory",
      "advisory_lock",
      "pg_try_advisory",
      "advisory lock",
    ];
    const matchesPrivileged = privilegedDeleteSignals.some((s) =>
      entryBody.includes(s),
    );
    const matchesAdvisory = advisoryLockSignals.some((s) =>
      entryBody.includes(s),
    );
    expect(
      matchesPrivileged || matchesAdvisory,
      `lessons-learned.md entry for "${TRACK_ID}" must mention at ` +
        `least one of: privileged-connection DELETE (privileged / ` +
        `DIRECT_DATABASE_URL / REVOKE / append-only) or advisory-lock ` +
        `job pattern (advisory / advisory_lock / pg_try_advisory). ` +
        `These are the two non-obvious topics the plan calls out.`,
    ).toBe(true);
  });

  it("lessons-learned.md stays within the 50-line working-memory cap after the new entry is added", () => {
    expect(
      existsSync(LESSONS_LEARNED_PATH),
      "lessons-learned.md must exist before its line count can be asserted.",
    ).toBe(true);

    const source = readFileSync(LESSONS_LEARNED_PATH, "utf-8");
    const rawLines = source.split("\n");
    const lineCount =
      rawLines[rawLines.length - 1] === ""
        ? rawLines.length - 1
        : rawLines.length;
    expect(
      lineCount,
      `lessons-learned.md is the working-memory registry and must ` +
        `stay ≤ 50 lines per AGENTS.md. Current line count is ` +
        `${lineCount}; the closeout work adds a new entry for ` +
        `"${TRACK_ID}", so the file must stay within the cap.`,
    ).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Task 3 — tracks.md + dir move
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 3: measure/tracks.md updated + track dir moved to measure/archive/", () => {
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
        `The dir still exists at the old location.`,
    ).toBe(true);
  });

  it("measure/tracks.md no longer has a pending [ ] entry for this track", () => {
    expect(
      existsSync(TRACKS_REGISTRY_PATH),
      "tracks.md must exist before its content can be pinned.",
    ).toBe(true);

    const source = readFileSync(TRACKS_REGISTRY_PATH, "utf-8");
    // A pending entry looks like:
    //   `- [ ] **Track: Audit Log Retention + DSAR Bulk Export**`
    // The track-title fragment uniquely identifies the entry
    // (the registry has only one track with that exact title).
    const trackTitle = "Audit Log Retention + DSAR Bulk Export";
    // Look for a `- [ ]` line containing the track title — this
    // is the "still pending" marker the closeout step removes.
    const pendingEntryPattern = new RegExp(
      `^\\s*-\\s*\\[\\s*\\]\\s*\\*\\*[^*]*${escapeRegExp(trackTitle)}[^*]*\\*\\*`,
      "m",
    );
    expect(
      !pendingEntryPattern.test(source),
      `tracks.md must not contain a pending [ ] entry for the ` +
        `track titled "${trackTitle}". The closeout step marks ` +
        `the entry [x] (or removes it entirely and adds the ` +
        `archive link elsewhere).`,
    ).toBe(true);
  });
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Task 4 — git notes attached to the closeout commit
// ---------------------------------------------------------------------------

describe("Phase 7 — Task 4: git notes attached to the closeout (dir-move) commit", () => {
  it("the most recent commit that touched the track dir has a git notes note", () => {
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
        `This should be the closeout (dir-move) commit.`,
    ).toBe(true);

    // `git notes show <sha>` exits non-zero with no output when no
    // note is attached; safeExec swallows that into "".
    const note = safeExec(`git notes show ${latestTouching}`);
    expect(
      note.length > 0,
      `The latest commit touching the track dir (${latestTouching}) ` +
        `has no \`git notes\` note attached. The Phase 7 task #4 ` +
        `requires \`git notes add -m "..." <sha>\` summarizing the ` +
        `track — a future reader reviewing the closeout will see no ` +
        `summary without it.`,
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
});

function shellQuote(s: string): string {
  // Quote a path for safe inclusion in a `git log -- <paths>`
  // argument list. The paths are repo-relative and contain no
  // shell metacharacters, but quoting is cheap insurance.
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
