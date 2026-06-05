/**
 * Phase 8 (Close-out) contracts for the AGENTS.md Compliance Audit of
 * `apps/science-advantage/` (pilot).
 *
 * Phase 8 of the audit protocol (`measure/agents-md-audit-protocol.md`
 * §"Audit Procedure" — terminal phase) is the close-out pass: flip the
 * track's `metadata.json#status` to `complete`, move the track directory
 * from `measure/tracks/` to `measure/archive/`, and record a checked
 * completion row in `measure/tracks.md`. The Phase 8 plan tasks are:
 *
 *   - Update this track's status to `complete` in `metadata.json`
 *   - Archive: `mv measure/tracks/agents_md_audit_science_advantage_20260603 measure/archive/`
 *   - Add completion row to `measure/tracks.md`
 *
 * The test strategy (`test-strategy.md` §1) flags Phases 7–8 as "N/A"
 * for unit tests because they are presentation / archival steps with no
 * executable behavior. As with Phase 7, the Red-phase contract tests
 * below deliberately pin only the *audit-trail* contracts of Phase 8 —
 * the evidence a future re-audit needs to confirm the pilot was actually
 * closed out (not just paused at "presented for sign-off"). They do not
 * test the human action of "archiving"; they pin the artifacts that
 * prove the close-out happened.
 *
 * Contracts pinned by this file:
 *
 *   8.1 — Status flip: the track's `metadata.json#status` reads
 *         `"complete"` (per the Phase 8 plan task's literal directive).
 *         The metadata file is located either in `measure/tracks/` (if
 *         Phase 8.2 has not yet run) or in `measure/archive/` (after
 *         Phase 8.2 runs); the test follows it to whichever directory
 *         currently holds it.
 *   8.2 — Archive move:
 *         (a) the source `measure/tracks/agents_md_audit_science_advantage_20260603/`
 *             directory does *not* exist (the `mv` happened); and
 *         (b) the destination
 *             `measure/archive/agents_md_audit_science_advantage_20260603/`
 *             directory *does* exist; and
 *         (c) the archived directory still contains the three required
 *             artifacts (`metadata.json`, `spec.md`, `plan.md`).
 *   8.3 — Registry update: `measure/tracks.md` has a checked completion
 *         row (`[x]`) for the audit pilot whose link points at
 *         `./archive/agents_md_audit_science_advantage_20260603/`, not
 *         `./tracks/…`. The existing `[ ]` row on line 71 of `tracks.md`
 *         is the *pending* registration; closing the track means
 *         flipping it to `[x]` and updating the link target.
 *
 * The SUT is the audit track's `metadata.json#status`, the filesystem
 * layout under `measure/tracks/` and `measure/archive/`, and the
 * `measure/tracks.md` registry. Tests are unit-level (no DB, no
 * Next.js server) and use the same filesystem access patterns as the
 * Phase 0–7 audit tests.
 *
 * State of the tests on 2026-06-06 (Red phase):
 *   - 8.1 (status === "complete")               — RED today. The track's
 *     `metadata.json#status` is still `"active"` (per Phase 7's
 *     sign-off-gate state pinned by `audit-phase7-present-to-user.test.ts`
 *     contract 7.1).
 *   - 8.2.a (source dir absent)                 — RED today. The track
 *     directory still lives under `measure/tracks/`.
 *   - 8.2.b (archive dir present)               — RED today. No copy
 *     under `measure/archive/` yet.
 *   - 8.2.c (archive contains 3 artifacts)      — RED today (depends on
 *     8.2.b being GREEN first).
 *   - 8.3.a (tracks.md row is [x])              — RED today. The row on
 *     `tracks.md:71` is still `- [ ]`.
 *   - 8.3.b (tracks.md row links to archive/)   — RED today. The row's
 *     link target is `./tracks/agents_md_audit_science_advantage_20260603/`,
 *     not `./archive/…`.
 *
 * The Red tests turn GREEN once a subsequent Green-phase task:
 *   (a) Edits `metadata.json#status` from `"active"` to `"complete"`.
 *   (b) Runs `mv measure/tracks/agents_md_audit_science_advantage_20260603 measure/archive/`.
 *   (c) Edits `measure/tracks.md` to flip the row to `[x]` and updates
 *       the link target to `./archive/agents_md_audit_science_advantage_20260603/`.
 *
 * Note on the Phase 7 ↔ Phase 8 contract overlap: contract 7.1.a in
 * `audit-phase7-present-to-user.test.ts` asserts the status is
 * `"active"` — a sign-off gate. That assertion will *intentionally*
 * break the moment Phase 8.1 is executed (status flips to "complete").
 * That is the correct sequencing: Phase 7's gate exists *until* Phase 8
 * closes the track, at which point the gate is no longer relevant.
 * The Green-phase task that runs Phase 8 must update or relax the Phase
 * 7.1.a assertion accordingly (e.g. allow `"complete"` once Phase 8 has
 * landed, or delete the assertion as obsolete). That update is owned by
 * the Green-phase implementer, not by this Red-phase test author.
 *
 * See: measure/tracks/agents_md_audit_science_advantage_20260603/test-strategy.md
 */
import fs from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();

const TRACK_ID = 'agents_md_audit_science_advantage_20260603';
const TRACKS_DIR_PATH = path.join(MONOREPO_ROOT, 'measure/tracks', TRACK_ID);
const ARCHIVE_DIR_PATH = path.join(MONOREPO_ROOT, 'measure/archive', TRACK_ID);
const TRACKS_REGISTRY = path.join(MONOREPO_ROOT, 'measure/tracks.md');

/**
 * Resolve the path to the track's `metadata.json`, following it to whichever
 * directory currently holds it. After Phase 8.2 runs, the file lives under
 * `measure/archive/<track_id>/`; before, under `measure/tracks/<track_id>/`.
 * Both are valid intermediate states during the close-out window, so the
 * status-flip contract (8.1) is decoupled from the archive-move contract (8.2).
 */
async function resolveMetadataPath(): Promise<string> {
  const archiveCandidate = path.join(ARCHIVE_DIR_PATH, 'metadata.json');
  const tracksCandidate = path.join(TRACKS_DIR_PATH, 'metadata.json');
  try {
    await fs.access(archiveCandidate);
    return archiveCandidate;
  } catch {
    /* fall through to tracks/ */
  }
  return tracksCandidate;
}

/**
 * Return true if `p` exists and is a directory, false otherwise. Used by
 * the archive-move contract (8.2) to assert the directory has moved from
 * `measure/tracks/` to `measure/archive/`.
 */
async function isDirectory(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 8: Close-out)', () => {
  // ============================================================
  // 8.1 — Status flip: metadata.status === "complete"
  // ============================================================
  describe('Phase 8.1 — Track metadata status is "complete"', () => {
    /**
     * The Phase 8 plan task says, verbatim: "Update this track's status
     * to `complete` in `metadata.json`." The literal target is the
     * string `"complete"` (not `"completed"` — even though both appear
     * in archived metadata.json files historically — and not
     * `"archived"` — which is not a status value used anywhere in this
     * project).
     *
     * RED today (2026-06-06): the metadata reads `"active"` because
     * Phase 7's sign-off gate is still in effect.
     */
    it('metadata.json#status reads "complete"', async () => {
      const metadataPath = await resolveMetadataPath();
      const contents = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(contents) as { status?: string };
      expect(
        metadata.status,
        `Track ${TRACK_ID} metadata.status should be "complete" once Phase 8 has been ` +
          `executed. Found ${JSON.stringify(metadata.status)} at ${path.relative(
            MONOREPO_ROOT,
            metadataPath,
          )}. The Phase 8 plan task literally says "Update this track's status to \`complete\` ` +
          `in metadata.json".`,
      ).toBe('complete');
    });

    /**
     * Sanity contract: the metadata.json file remains valid JSON and
     * the `id` field still matches the track id. A close-out that
     * corrupts the file (e.g. by hand-editing and breaking a comma)
     * would make this test fail loudly so the next auditor can recover.
     */
    it('metadata.json is well-formed JSON with the original track id intact', async () => {
      const metadataPath = await resolveMetadataPath();
      const contents = await fs.readFile(metadataPath, 'utf-8');
      let metadata: { id?: string };
      expect(
        () => {
          metadata = JSON.parse(contents) as { id?: string };
        },
        `Track ${TRACK_ID} metadata.json at ${path.relative(
          MONOREPO_ROOT,
          metadataPath,
        )} should be valid JSON after the Phase 8 status flip. A close-out edit must not ` +
          'corrupt the file.',
      ).not.toThrow();
      // @ts-expect-error metadata is assigned in the expect() callback above
      expect(metadata.id, 'metadata.id should match the track directory name').toBe(TRACK_ID);
    });
  });

  // ============================================================
  // 8.2 — Archive move: tracks/ → archive/
  // ============================================================
  describe('Phase 8.2 — Track directory has been archived', () => {
    /**
     * The Phase 8 plan task says, verbatim: `mv measure/tracks/agents_md_audit_science_advantage_20260603 measure/archive/`.
     * Per `mv` semantics, the source directory must no longer exist
     * after the move. A stale copy at `measure/tracks/<id>/` is the
     * most common close-out bug (auditor does `cp -r` instead of `mv`,
     * or forgets to delete the source), so this contract pins the
     * source-absent invariant explicitly.
     *
     * RED today (2026-06-06): the directory is still under
     * `measure/tracks/`.
     */
    it('source directory measure/tracks/<id>/ does NOT exist', async () => {
      const exists = await isDirectory(TRACKS_DIR_PATH);
      expect(
        exists,
        `Track directory measure/tracks/${TRACK_ID}/ should not exist after Phase 8.2 ` +
          'archives the track. The Phase 8 plan task is `mv … measure/archive/`, which removes ' +
          'the source. If a copy remains at measure/tracks/, the auditor probably used `cp -r` ' +
          'instead of `mv`, or forgot to delete the source. Remove the stale copy.',
      ).toBe(false);
    });

    /**
     * The destination directory must exist after the move. This is
     * the positive half of contract 8.2 — together with 8.2.a, the
     * two assertions pin the `mv` semantics: exactly one of
     * (tracks/, archive/) must hold the directory.
     *
     * RED today (2026-06-06): no copy at measure/archive/ yet.
     */
    it('destination directory measure/archive/<id>/ DOES exist', async () => {
      const exists = await isDirectory(ARCHIVE_DIR_PATH);
      expect(
        exists,
        `Track directory measure/archive/${TRACK_ID}/ should exist after Phase 8.2 ` +
          'archives the track. The Phase 8 plan task is `mv measure/tracks/' +
          TRACK_ID +
          ' measure/archive/`. Re-run the `mv` if the directory is still under measure/tracks/.',
      ).toBe(true);
    });

    /**
     * The archived directory must still contain the three required
     * track artifacts: `metadata.json`, `spec.md`, `plan.md`. The
     * Measure framework treats the trio as the minimum viable track
     * skeleton (per `measure/tracks/` directory conventions and the
     * Phase 5 migration-tracks contract). Archiving an *empty* or
     * *partial* directory would erase the audit's deliverable trail.
     *
     * `test-strategy.md`, `fixtures/`, and other supplementary files
     * are not asserted — they are allowed to remain or be pruned at
     * the auditor's discretion. Only the trio is contract-required.
     *
     * RED today (2026-06-06): the archive directory does not exist
     * yet (8.2.b is RED).
     */
    it('archived directory contains metadata.json, spec.md, and plan.md', async () => {
      const required = ['metadata.json', 'spec.md', 'plan.md'];
      const missing: string[] = [];
      for (const name of required) {
        const candidate = path.join(ARCHIVE_DIR_PATH, name);
        try {
          await fs.access(candidate);
        } catch {
          missing.push(name);
        }
      }
      expect(
        missing,
        `Archived track directory measure/archive/${TRACK_ID}/ should contain the three ` +
          `required Measure skeleton artifacts (metadata.json, spec.md, plan.md). ` +
          `Missing: ${missing.join(', ') || '(none)'}. If the directory does not exist at all, ` +
          'Phase 8.2 has not run yet (see test 8.2.b).',
      ).toEqual([]);
    });
  });

  // ============================================================
  // 8.3 — Registry update: tracks.md row is [x] + links to archive/
  // ============================================================
  describe('Phase 8.3 — measure/tracks.md has a checked completion row', () => {
    /**
     * The Phase 8 plan task says: "Add completion row to
     * `measure/tracks.md`." The pre-existing registration row on
     * `measure/tracks.md` (line 71 as of 2026-06-06) is the *pending*
     * registration of the audit pilot:
     *
     *   - [ ] **Track: AGENTS.md Compliance Audit — science-advantage (pilot)**
     *         *Link: [./tracks/agents_md_audit_science_advantage_20260603/](…)*
     *
     * Closing the track means flipping that row's checkbox to `[x]`
     * — this is the "completion" the plan task asks for. The contract
     * is checked by looking for at least one `[x]` row in `tracks.md`
     * whose text references the audit pilot.
     *
     * RED today (2026-06-06): the row is `[ ]`.
     */
    it('tracks.md has at least one [x] row referencing the audit pilot', async () => {
      const contents = await fs.readFile(TRACKS_REGISTRY, 'utf-8');
      // Match a checked row whose visible text mentions the audit
      // pilot. We anchor on a unique phrase from the spec.md title
      // ("AGENTS.md Compliance Audit — science-advantage") so that
      // a future re-audit of a different app does not satisfy the
      // contract.
      const rowRe =
        /^-\s+\[x\][^\n]*AGENTS\.md\s+Compliance\s+Audit\s+—\s+science-advantage/m;
      const match = contents.match(rowRe);
      expect(
        match,
        'measure/tracks.md should contain a checked `- [x] **Track: AGENTS.md Compliance Audit ' +
          '— science-advantage (pilot)**` row once Phase 8.3 has been executed. The pending ' +
          'row on line ~71 (`- [ ] **Track: AGENTS.md Compliance Audit — science-advantage ' +
          '(pilot)**`) must be flipped to `- [x]` — that flip IS the completion row.',
      ).not.toBeNull();
    });

    /**
     * The checked row's Markdown link must point at the archive
     * destination, not the (now-empty) `measure/tracks/` source. A
     * row that says `[x]` but still links to `./tracks/<id>/` is
     * a broken link the moment Phase 8.2 runs the `mv`; readers
     * clicking the link would hit a 404. This contract ensures the
     * checkbox flip and the link update are kept in sync.
     *
     * RED today (2026-06-06): even if the checkbox were flipped,
     * the existing row's link target is `./tracks/…`, not
     * `./archive/…`.
     */
    it('checked tracks.md row links to ./archive/<id>/, not ./tracks/<id>/', async () => {
      const contents = await fs.readFile(TRACKS_REGISTRY, 'utf-8');
      // Find every `- [x]` row that mentions the audit pilot and check
      // that at least one such row links to the archive directory.
      const rowRe =
        /^-\s+\[x\][^\n]*AGENTS\.md\s+Compliance\s+Audit\s+—\s+science-advantage[^\n]*$/gm;
      const rows = [...contents.matchAll(rowRe)].map((m) => m[0]);
      // The link is on the same line OR on a continuation line; scan a
      // few characters past each match to catch wrapped Link suffixes
      // like "*Link: [./archive/…](./archive/…)*" on the next line.
      // The `tracks.md` convention puts the Link inline (` *Link: …*`),
      // so a same-line check is sufficient. If the convention ever
      // changes to a wrapped line, extend the slice to include the
      // following non-empty line.
      const archiveLinkRe = new RegExp(
        `\\./archive/${TRACK_ID.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}/?`,
      );
      const tracksLinkRe = new RegExp(
        `\\./tracks/${TRACK_ID.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}/?`,
      );
      const goodRows = rows.filter((r) => archiveLinkRe.test(r));
      const staleRows = rows.filter(
        (r) => tracksLinkRe.test(r) && !archiveLinkRe.test(r),
      );
      expect(
        goodRows.length,
        'measure/tracks.md should have at least one `[x]` row for the audit pilot whose Link ' +
          `points at \`./archive/${TRACK_ID}/\`. Found ${rows.length} checked rows referencing ` +
          `the audit; ${goodRows.length} link to ./archive/, ${staleRows.length} still link to ` +
          './tracks/. Update the Link target to match the archive move (Phase 8.2). A row that ' +
          'is `[x]` but still links to ./tracks/ becomes a broken link the moment the directory ' +
          'is moved.',
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
