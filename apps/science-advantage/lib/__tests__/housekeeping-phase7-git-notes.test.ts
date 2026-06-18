/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 7
 * (Add `git notes` to 24 `refactor(science):` Ports — F-1207).
 *
 * ## Phase 7 Contract
 *
 * Per `measure/tracks/housekeeping_batch_20260603/plan.md` Phase 7:
 *
 *   1. Enumerate `refactor(science):` commits touching
 *      `apps/science-advantage/`.
 *   2. For each commit belonging to the archived
 *      `prisma_drizzle_science_controllers_20260505` track, attach a
 *      git note containing the track ID
 *      (`prisma_drizzle_science_controllers_20260505`).
 *   3. Verify: `git log --notes --grep
 *      prisma_drizzle_science_controllers_20260505` returns the
 *      commits with the note attached.
 *   4. Document the backfill in `measure/lessons-learned.md`.
 *
 * ## HEAD Pre-State (commit `4c0d4d7f`)
 *
 * - 59 total `refactor(science):` commits in repo history.
 * - **52 of 59** have a git note containing the track ID
 *   (`prisma_drizzle_science_controllers_20260505`).
 * - **7 of 59** do NOT have the track ID in their note:
 *   - **5 commits have a git note but lack the track ID** (Red state):
 *     - `9d40a9e` — Phase 0 pilot
 *     - `3312144` — Phase 1 / Task 1
 *     - `33a4d73` — Phase 1 / Task 2
 *     - `6b29adf` — Phase 1 / Task 3
 *     - `b831558` — Phase 5 catch-all
 *     These predate the standardized `Track: <id>` note-header format.
 *   - **2 commits have NO git note at all** (negative control —
 *     correctly belong to other tracks, not
 *     `prisma_drizzle_science_controllers_20260505`):
 *     - `1f8c2a0` — Phase 1 of THIS housekeeping track (belongs to
 *       `housekeeping_batch_20260603`, not the prisma_drizzle track).
 *     - `3d3528e` — Flatten auth adapter (F-401, not the prisma_drizzle
 *       track).
 * - 73 total commits (across all commit types) have the track ID in
 *   their git note (the remainder are chore(measure) tracking commits
 *   and other track members).
 *
 * ## Audit Drift
 *
 * The 2026-06-03 audit cited "24" as the rough count of `refactor(science):`
 * ports belonging to `prisma_drizzle_science_controllers_20260505`. The
 * HEAD-actual count of `refactor(science):` commits whose git note
 * currently contains the track ID is **52**, which reflects the
 * accumulated track work since the audit snapshot. The Phase 7 contract
 * is unchanged — every track-member commit must have the track ID in
 * its note — but the Implementer's backlog is the 5 specific commits
 * listed above (not a fresh "24").
 *
 * ## Membership Rule
 *
 * The previous MID pass attempted to use a body-content filter
 * (`body.includes("prisma") || body.includes("Drizzle")`) to identify
 * track members. That heuristic was too narrow (captured only 22 of
 * the 52 members) and excluded several commits whose body content
 * discusses postgres/client-bundle-split topics without naming prisma
 * directly. The §1 tests below use an **explicit SHA list** of the 5
 * known-failing commits instead, which is the authoritative membership
 * rule for the Implementer's backlog.
 *
 * ## Test Strategy
 *
 * - **§1 — Main Red gate**: 5 sub-tests, one per known-failing SHA.
 *   Each asserts that `git notes show <sha>` contains the track ID.
 *   All 5 fail at HEAD; all 5 will pass after the Implementer runs
 *   `git notes append -m "\nTrack: prisma_drizzle_science_controllers_20260505" <sha>`
 *   for each.
 * - **§2 — Negative control**: 2 sub-tests, one per non-track
 *   `refactor(science):` commit (`3d3528e`, `1f8c2a0`). Each asserts
 *   that the note (if any) does NOT contain the track ID. Both pass
 *   at HEAD (the commits have no notes at all).
 * - **§3 — Live-proof gate**: 2 sub-tests pinning the
 *   `git log --notes --grep` aggregate count from test-strategy.md
 *   Phase 7 "Live-Proof Plan". The refactor(science) subset is ≥52
 *   at HEAD; the full count is ≥73 at HEAD. Both pass at HEAD; both
 *   will continue to pass at Green (the Implementer appends to
 *   existing notes, so the aggregate count does not change).
 * - **§4 — Precondition**: All 5 known-failing commits have a git
 *   note (the Implementer will append, not create). Pass at HEAD.
 * - **§5 — Note shape preservation**: Average note length across the
 *   52 passing track-member commits is ≥ 100 chars (notes contain
 *   rich Task/Decision/Phase content). Pass at HEAD; protects
 *   against the Implementer replacing rich notes with the bare
 *   track ID.
 * - **§6 — Audit SHA enumeration (post-Green)**: The 5 originally-
 *   failing SHAs are stable in history AND each now contains the
 *   track ID in its note. Fails at HEAD (Red); passes after the
 *   Implementer attaches the track ID to all 5. Acts as a single-
 *   commit regression guard for any future note-stripping event.
 *
 * ## Test Framework & SUT
 *
 * - SUT: the set of git notes attached to `refactor(science):`
 *   commits belonging to `prisma_drizzle_science_controllers_20260505`.
 * - Framework: vitest 4.1.8 (DB-free via `vitest.unit.config.ts`).
 * - Side effects: none. The test shells out to `git log` and
 *   `git notes show` for ground-truth introspection. No files are
 *   created or modified, no git notes are added/removed by the test
 *   itself.
 *
 * ## Targeted Red Command
 *
 * ```bash
 * cd apps/science-advantage && \
 *   ./node_modules/.bin/vitest run \
 *     --config vitest.unit.config.ts \
 *     lib/__tests__/housekeeping-phase7-git-notes.test.ts
 * ```
 *
 * (Use `/opt/codex-desktop/resources/node-runtime/bin/node` if the
 * `node` binary is not on PATH on the host.)
 *
 * ## Cross-References
 *
 * - `measure/tracks/housekeeping_batch_20260603/plan.md` (Phase 7)
 * - `measure/tracks/housekeeping_batch_20260603/test-strategy.md`
 * - `apps/science-advantage/lib/__tests__/housekeeping-phase6-repin-deps.test.ts`
 *   (precedent for `git log` / `git notes`-shelling tests)
 */
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const TRACK_ID = 'prisma_drizzle_science_controllers_20260505';

/**
 * Run a git command from the monorepo root. Returns stdout/stderr/status.
 * Throws on spawn errors; callers inspect `status` for non-zero exits.
 */
function runCaptured(
  command: string,
  args: string[]
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * Get the git note attached to a commit. Returns `null` if the commit
 * has no note (`git notes show` exits non-zero).
 */
function getNoteForSha(sha: string): string | null {
  const result = runCaptured('git', ['notes', 'show', sha]);
  if (result.status !== 0) return null;
  return result.stdout;
}

/**
 * Get the subject (first line) of a commit.
 */
function getCommitSubject(sha: string): string {
  const result = runCaptured('git', ['log', '-1', '--format=%s', sha]);
  if (result.status !== 0) return '';
  return result.stdout.trim();
}

/**
 * The 5 known-failing commits whose git note exists but lacks the
 * track ID. These predate the standardized `Track: <id>` note-header
 * format and use the older `Task: Phase X / Y` format only. The
 * Implementer's contract is to append the track ID to each note.
 */
const KNOWN_FAILING_SHAS = [
  '9d40a9e2e033a438a7348d8564f26089659b066e',
  '3312144449c7d3e174a20e4b32dd6ecd48f0afe5',
  '33a4d731ed410e5d758fe3e63ae4a84c49e42419',
  '6b29adf9f793f192b148d3fff1ed14000c8876ec',
  'b831558cdbadd8238c5d6d5b0c537a7715dfd3d8',
] as const;

/**
 * The 2 non-track `refactor(science):` commits that correctly lack
 * any git note (and therefore cannot have the track ID). Used as the
 * negative control to prevent the Implementer from over-attaching
 * the track ID to unrelated commits.
 */
const NON_TRACK_SHAS = [
  '3d3528e581547504cb55cbb0af19a92e0904e49f', // F-401 (auth flatten)
  '1f8c2a013723e717564bf780030f5603a28da025', // Phase 1 housekeeping track
] as const;

/**
 * The expected baseline counts at HEAD (commit `4c0d4d7f`). Used to
 * pin the live-proof gate from test-strategy.md Phase 7.
 */
const BASELINE_REFACTOR_WITH_REF = 52;
const BASELINE_TOTAL_WITH_REF = 73;

describe(
  'housekeeping_batch_20260603 / Phase 7 — Add `git notes` to 24 `refactor(science):` ports (F-1207)',
  () => {
    describe('§1 — Main Red gate: every known-failing commit has the track ID in its git note', () => {
      /**
       * For each of the 5 known-failing commits, the git note must
       * contain `prisma_drizzle_science_controllers_20260505`. The
       * contract is "contains" — the Implementer may either append the
       * track ID to the existing rich note (preferred; preserves
       * Task/Decision/Phase content) or replace the note with the bare
       * track ID (acceptable per the spec's `git notes add -m "..."`
       * command but loses audit trail).
       *
       * The Implementer's recommended command (from plan.md Phase 7
       * "Handoff"):
       * ```bash
       * git notes append -m "\nTrack: prisma_drizzle_science_controllers_20260505" <sha>
       * ```
       *
       * Each §1.x sub-test fails at HEAD and passes after the
       * Implementer appends the track ID to the corresponding commit.
       */
      for (const sha of KNOWN_FAILING_SHAS) {
        const shortSha = sha.slice(0, 7);
        const subject = getCommitSubject(sha);
        it(`§1.${KNOWN_FAILING_SHAS.indexOf(sha) + 1} — git notes show ${shortSha} contains the track ID (${subject})`, () => {
          const note = getNoteForSha(sha);
          expect(
            note,
            `expected git note for ${shortSha} (${subject}) to exist (precondition for appending the track ID)`
          ).not.toBeNull();
          expect(
            note,
            `expected git note for ${shortSha} (${subject}) to contain "${TRACK_ID}"; got:\n${note}`
          ).toMatch(new RegExp(TRACK_ID));
        });
      }
    });

    describe('§2 — Negative control: non-track `refactor(science):` commits do NOT have the track ID', () => {
      /**
       * `3d3528e` (F-401 auth flatten) and `1f8c2a0` (Phase 1 of this
       * housekeeping track) are NOT members of
       * `prisma_drizzle_science_controllers_20260505`. The Implementer
       * must NOT attach the track ID to their notes. Both have no git
       * note at HEAD; if the Implementer accidentally adds the track
       * ID to either commit, this assertion catches it.
       *
       * Both pass at HEAD and continue to pass at Green.
       */
      for (const sha of NON_TRACK_SHAS) {
        const shortSha = sha.slice(0, 7);
        const subject = getCommitSubject(sha);
        it(`§2.${NON_TRACK_SHAS.indexOf(sha) + 1} — git notes show ${shortSha} (${subject}) does NOT contain the track ID`, () => {
          const note = getNoteForSha(sha);
          if (note === null) {
            // No note at all: trivially does not contain the track ID.
            return;
          }
          expect(
            note,
            `expected git note for ${shortSha} (${subject}) to NOT contain "${TRACK_ID}" (this commit does not belong to ${TRACK_ID}); got:\n${note}`
          ).not.toMatch(new RegExp(TRACK_ID));
        });
      }
    });

    describe('§3 — Live-proof gate from test-strategy.md Phase 7', () => {
      /**
       * test-strategy.md Phase 7 "Live-Proof Plan" row:
       *   Red:   `git log --notes --grep prisma_drizzle_science_controllers_20260505`
       *          must return 0 for a sample SHA at Red.
       *   Green: returns the 24+ commits with the note attached.
       *
       * The §3.1 sub-test pins the count for `refactor(science):`
       * commits specifically. At HEAD, 52 such commits have the track
       * ID in their notes. After the Implementer appends to the 5
       * known-failing commits, the count remains 52 (the notes are
       * augmented, not created).
       *
       * Pass at HEAD (52 ≥ 52); continues to pass at Green.
       */
      it(`§3.1 — git log --notes --grep ${TRACK_ID} returns ≥ ${BASELINE_REFACTOR_WITH_REF} \`refactor(science):\` commits (live-proof baseline)`, () => {
        const result = runCaptured('git', [
          'log',
          '--notes',
          '--grep',
          TRACK_ID,
          '--format=%H %s',
          '--all',
        ]);
        if (result.status !== 0) {
          throw new Error(`git log --notes --grep failed: ${result.stderr}`);
        }
        const refactorHits = result.stdout
          .trim()
          .split('\n')
          .filter((l) => /^[0-9a-f]{40} refactor\(science\):/.test(l));
        expect(
          refactorHits.length,
          `expected git log --notes --grep ${TRACK_ID} to return ≥ ${BASELINE_REFACTOR_WITH_REF} \`refactor(science):\` commits; found ${refactorHits.length}.`
        ).toBeGreaterThanOrEqual(BASELINE_REFACTOR_WITH_REF);
      });

      /**
       * Pin the full count (across all commit types, not just
       * refactor(science)). At HEAD, 73 commits have the track ID in
       * their notes — the remainder are chore(measure) tracking
       * commits and other track members.
       *
       * Pass at HEAD (73 ≥ 73); continues to pass at Green.
       */
      it(`§3.2 — git log --notes --grep ${TRACK_ID} returns ≥ ${BASELINE_TOTAL_WITH_REF} commits total (live-proof aggregate)`, () => {
        const result = runCaptured('git', [
          'log',
          '--notes',
          '--grep',
          TRACK_ID,
          '--format=%H',
          '--all',
        ]);
        if (result.status !== 0) {
          throw new Error(`git log --notes --grep failed: ${result.stderr}`);
        }
        const hits = result.stdout
          .trim()
          .split('\n')
          .filter((l) => /^[0-9a-f]{40}$/.test(l));
        expect(
          hits.length,
          `expected git log --notes --grep ${TRACK_ID} to return ≥ ${BASELINE_TOTAL_WITH_REF} commits total; found ${hits.length}.`
        ).toBeGreaterThanOrEqual(BASELINE_TOTAL_WITH_REF);
      });
    });

    describe('§4 — Precondition: every known-failing commit has a git note', () => {
      /**
       * The §1 contract is about note CONTENT (must contain the track
       * ID). The §4 contract is about note EXISTENCE (every
       * known-failing commit must have A note). If a commit has no
       * note at all, §1 fails trivially because the Implementer
       * cannot append — they must first run `git notes add -m "..."`.
       *
       * Pin §4 separately so the Implementer can distinguish "missing
       * note" from "wrong note content". All 5 known-failing commits
       * have notes at HEAD (their notes just lack the track ID).
       *
       * Pass at HEAD; continues to pass at Green.
       */
      it('§4.1 — every known-failing commit has a git note (precondition for §1 append)', () => {
        const missing = KNOWN_FAILING_SHAS.filter(
          (sha) => getNoteForSha(sha) === null
        );
        expect(
          missing.length,
          `expected every known-failing commit to have a git note (precondition for appending the track ID); ${missing.length} commit(s) have no note:\n` +
            missing.map((s) => `  - ${s.slice(0, 7)}: ${getCommitSubject(s)}`).join('\n')
        ).toBe(0);
      });
    });

    describe('§5 — Note shape preservation (regression guard)', () => {
      /**
       * The existing notes have rich task descriptions (Task: /
       * Decision: / Phase N / etc.). The Implementer should append the
       * track ID rather than replacing the note entirely, to preserve
       * the audit trail. §5.1 is informational — it doesn't fail at
       * Green; it documents the expected note-shape invariant.
       *
       * If the Implementer replaced rich notes with the bare track
       * ID, the average note length would drop sharply (the track ID
       * alone is 41 chars; the average at HEAD is hundreds). Pin a
       * floor to detect mass replacement.
       */
      it('§5.1 — average note length across all \`refactor(science):\` commits with the track ID is ≥ 100 chars (notes retain rich Task/Decision content)', () => {
        const result = runCaptured('git', [
          'log',
          '--format=%H %s',
          '--all',
        ]);
        if (result.status !== 0) {
          throw new Error(`git log failed: ${result.stderr}`);
        }
        const refactorShas = result.stdout
          .trim()
          .split('\n')
          .filter((l) => /^([0-9a-f]{40}) refactor\(science\):/.test(l))
          .map((l) => l.split(' ')[0]);
        let totalLength = 0;
        let count = 0;
        for (const sha of refactorShas) {
          const note = getNoteForSha(sha);
          if (note !== null && note.includes(TRACK_ID)) {
            totalLength += note.length;
            count += 1;
          }
        }
        const avg = count > 0 ? totalLength / count : 0;
        expect(
          avg,
          `expected average note length for \`refactor(science):\` commits with the track ID to be ≥ 100 chars (notes contain rich Task/Decision content); got ${avg.toFixed(0)} across ${count} commits. If the Implementer replaced notes with the bare track ID, this would drop sharply.`
        ).toBeGreaterThanOrEqual(100);
      });
    });

    describe('§6 — Audit SHA enumeration: the 5 originally-failing SHAs are stable and now annotated', () => {
      /**
       * Pin the 5 originally-failing SHAs as audit-stable members of
       * the Implementer's backlog. Asserts:
       *   1. All 5 SHAs are still present as `refactor(science):`
       *      commits (rebase / history-rewrite regression guard).
       *   2. Each now has the track ID in its git note (post-Green
       *      contract — duplicates §1.1–§1.5 to keep §6 self-contained
       *      and to flag any single-commit regression where a note is
       *      stripped after Phase 7 closes).
       *
       * Passes at Green; would fail if any of the 5 SHAs were
       * dropped from history or had its note unrelated to the track
       * stripped.
       */
      it('§6.1 — the 5 originally-failing SHAs are stable and now contain the track ID (post-Green)', () => {
        const result = runCaptured('git', [
          'log',
          '--format=%H %s',
          '--all',
        ]);
        if (result.status !== 0) {
          throw new Error(`git log failed: ${result.stderr}`);
        }
        const refactorShas = new Set(
          result.stdout
            .trim()
            .split('\n')
            .filter((l) => /^([0-9a-f]{40}) refactor\(science\):/.test(l))
            .map((l) => l.split(' ')[0])
        );
        const stillPresent = KNOWN_FAILING_SHAS.filter((s) =>
          refactorShas.has(s)
        );
        expect(
          stillPresent.length,
          `expected all 5 originally-failing SHAs to still be present as \`refactor(science):\` commits (history-rewrite regression guard); found ${stillPresent.length}/5`
        ).toBe(5);
        // Post-Green contract: each originally-failing SHA must now
        // contain the track ID in its git note.
        const missing: string[] = [];
        for (const sha of KNOWN_FAILING_SHAS) {
          const note = getNoteForSha(sha);
          if (note === null || !note.includes(TRACK_ID)) {
            missing.push(sha.slice(0, 7));
          }
        }
        expect(
          missing,
          `expected all 5 originally-failing SHAs to have the track ID in their note post-Green; missing: ${missing.join(', ') || 'none'}`
        ).toEqual([]);
      });
    });
  }
);