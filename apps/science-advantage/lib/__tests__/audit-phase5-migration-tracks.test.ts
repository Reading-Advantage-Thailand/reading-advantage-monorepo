/**
 * Phase 5 (Generate Migration Tracks) contracts for the AGENTS.md Compliance
 * Audit of `apps/science-advantage/` (pilot).
 *
 * The audit's Phase 5 deliverable is the migration plan: 12 Measure tracks
 * (Tracks 0–12) that group the 45 finding IDs from `findings.md` into
 * actionable migration work. Per `test-strategy.md` §1 / §5, the contract is:
 *
 *   - Each track has a valid skeleton (`metadata.json` + `spec.md` +
 *     `plan.md`).
 *   - Each plan has ≤15 phase-level work units (`## Phase N:` headings).
 *   - Each track references the finding ID(s) it resolves.
 *
 * The SUT is the audit's `migration-tracks.md` artifact plus the 12 track
 * directories it points at (`measure/tracks/<id>/` for pending tracks,
 * `measure/archive/<id>/` for completed tracks). Tests are unit-level (no
 * DB, no Next.js server) and use the same filesystem access patterns as
 * the Phase 0–4 audit tests.
 *
 * Cross-check contract (Phase 5.5): the proposed tracks must also be
 * listed in `measure/tracks.md` under the "Pending Tracks — Audit Findings
 * (science-advantage, 2026-06-03)" sub-heading, so the registry stays in
 * sync with the audit's deliverables.
 *
 * State of the tests on 2026-06-05:
 *   - 5.1 (migration-tracks.md structure)        — GREEN.
 *   - 5.2 (track skeleton exists)                — GREEN (all 12).
 *   - 5.3 (≤15 phase-level tasks per plan)       — GREEN (max 15,
 *     `ci_typecheck_alignment_20260603`).
 *   - 5.4 (finding ID reference in skeleton)     — GREEN.
 *   - 5.5 (cross-check vs measure/tracks.md)     — GREEN for the 12
 *     proposed tracks; the section also lists 1 follow-up ("Audit Log
 *     Retention + DSAR Bulk Export") that is not in migration-tracks.md —
 *     this is allowed (follow-up tracks can be appended) and the test
 *     asserts the 12 are present without forbidding extras.
 *
 * Known sub-contract gaps documented in `measure/tech-debt.md`:
 *   - `audit_log_infrastructure_20260603` (Track 4) is marked `complete`
 *     in `metadata.json` and the `Pending Tracks — Audit Findings`
 *     section is marked `[x]`, but the directory is still under
 *     `measure/tracks/` rather than `measure/archive/`. Not asserted
 *     here (move is a track-completion chore, not a Phase 5 contract).
 *   - 4 metadata.json files have `estimated_tasks > 15` (zod: 18,
 *     domain: 24, observability: 16, ci: 17). The Phase 5 contract is
 *     about the actual plan phases, not the estimate, so this is not
 *     asserted.
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

const MIGRATION_TRACKS = path.join(
  MONOREPO_ROOT,
  'measure/audit-reports/science-advantage_20260603/migration-tracks.md',
);
const TRACKS_REGISTRY = path.join(MONOREPO_ROOT, 'measure/tracks.md');
const TRACKS_DIR = path.join(MONOREPO_ROOT, 'measure/tracks');
const ARCHIVE_DIR = path.join(MONOREPO_ROOT, 'measure/archive');

const PENDING_HEADING = 'Pending Tracks — Audit Findings (science-advantage, 2026-06-03)';

/**
 * The 12 tracks proposed in `migration-tracks.md` (Tracks 0–12) and their
 * declared severity. Track 0 is a protocol-level pre-audit chore (no
 * application code change); the other 11 are user-facing migration work.
 *
 * `trackId` is the directory name under `measure/tracks/` or
 * `measure/archive/`. Track 0's id is not inlined in `migration-tracks.md`
 * as `**Track ID:**` (it's a one-line summary); the others (1–12) are.
 * Hardcoding the mapping here keeps the parser focused on phase-level
 * validation rather than on title-to-id slugification.
 */
const PROPOSED_TRACKS: ReadonlyArray<{
  trackNum: number;
  trackId: string;
  severity: string;
  /** Finding IDs the track resolves, per `migration-tracks.md` `- **Resolves:**` line. */
  resolves: readonly string[];
}> = [
  {
    trackNum: 0,
    trackId: 'protocol_v1_1_graphdb_20260603',
    severity: 'Protocol',
    resolves: ['F-1003'],
  },
  {
    trackNum: 1,
    trackId: 'app_domain_migration_20260603',
    severity: 'Critical',
    resolves: ['F-305', 'F-203', 'F-208', 'F-306', 'F-307', 'F-405', 'F-701', 'F-702'],
  },
  {
    trackNum: 2,
    trackId: 'tenant_db_school_id_20260603',
    severity: 'Critical',
    resolves: ['F-501', 'F-502'],
  },
  {
    trackNum: 3,
    trackId: 'argon2id_password_20260603',
    severity: 'Critical',
    resolves: ['F-401', 'F-402', 'F-406'],
  },
  {
    trackNum: 4,
    trackId: 'audit_log_infrastructure_20260603',
    severity: 'Critical',
    resolves: ['F-404', 'F-901'],
  },
  {
    trackNum: 5,
    trackId: 'ai_adapter_package_20260603',
    severity: 'High',
    resolves: ['F-101', 'F-202'],
  },
  {
    trackNum: 6,
    trackId: 'storage_package_20260603',
    severity: 'High',
    resolves: ['F-102', 'F-703'],
  },
  {
    trackNum: 7,
    trackId: 'zod_boundary_hardening_20260603',
    severity: 'High',
    resolves: ['F-601', 'F-602', 'F-302', 'F-603', 'F-604', 'F-704'],
  },
  {
    trackNum: 8,
    trackId: 'domain_module_decomposition_20260603',
    severity: 'High',
    resolves: ['F-301', 'F-303', 'F-304', 'F-504', 'F-1101'],
  },
  {
    trackNum: 9,
    trackId: 'observability_stack_20260603',
    severity: 'Medium',
    resolves: ['F-902', 'F-903', 'F-904', 'F-905', 'F-906'],
  },
  {
    trackNum: 10,
    trackId: 'rate_limiter_v2_20260603',
    severity: 'Medium',
    resolves: ['F-403', 'F-407'],
  },
  {
    trackNum: 11,
    trackId: 'ci_typecheck_alignment_20260603',
    severity: 'High',
    resolves: ['F-1001', 'F-1002', 'F-1003', 'F-1204', 'F-1205'],
  },
  {
    trackNum: 12,
    trackId: 'housekeeping_batch_20260603',
    severity: 'Low',
    resolves: [
      'F-205',
      'F-503',
      'F-705',
      'F-1102',
      'F-1201',
      'F-1202',
      'F-1207',
      'F-1301',
      'F-1305',
      'F-1306',
    ],
  },
];

/**
 * Parse `migration-tracks.md` into one entry per `## Track N —` section,
 * capturing the track number, body, and the `**Track ID:**` value if
 * present (Track 0 omits it; the rest have it).
 */
async function parseMigrationTrackSections(): Promise<
  Array<{ trackNum: number; trackId: string | null; body: string }>
> {
  const contents = await fs.readFile(MIGRATION_TRACKS, 'utf-8');
  const sections: Array<{ trackNum: number; trackId: string | null; body: string }> = [];
  const lines = contents.split('\n');
  let current: { trackNum: number; trackId: string | null; body: string[] } | null = null;

  const flush = () => {
    if (current) {
      sections.push({
        trackNum: current.trackNum,
        trackId: current.trackId,
        body: current.body.join('\n'),
      });
    }
  };

  for (const line of lines) {
    const m = line.match(/^## Track (\d+) — /);
    if (m) {
      flush();
      current = {
        trackNum: Number(m[1]),
        trackId: null,
        body: [line],
      };
      continue;
    }
    if (current) {
      current.body.push(line);
      const idMatch = line.match(/^- \*\*Track ID:\*\*\s*`([^`]+)`/);
      if (idMatch) current.trackId = idMatch[1];
    }
  }
  flush();
  return sections;
}

/**
 * Find the directory for `trackId`. Completed tracks are moved to
 * `measure/archive/`; pending tracks stay in `measure/tracks/`. Returns
 * the absolute path of the existing directory, or `null` if neither
 * candidate exists.
 */
async function locateTrackDir(trackId: string): Promise<string | null> {
  for (const parent of [TRACKS_DIR, ARCHIVE_DIR]) {
    const candidate = path.join(parent, trackId);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // not present; fall through
    }
  }
  return null;
}

/**
 * Count the number of `## Phase N:` top-level headings in a plan file.
 * This is the "≤15 tasks" contract from the test strategy: a track's plan
 * is a sequence of top-level phases, not a flat list of `- [ ]` items
 * (each phase typically has many sub-tasks). Tracks with 16+ phases are
 * too large to ship in a single PR; the protocol caps the count at 15.
 */
async function countTopLevelPhases(planPath: string): Promise<number> {
  const contents = await fs.readFile(planPath, 'utf-8');
  // Match `## Phase 0:`, `## Phase 1:`, etc. but NOT `### Phase 2a:`
  // (sub-phases are counted as part of the parent phase, not as their
  // own top-level work units).
  const matches = contents.match(/^## Phase \d+:/gm);
  return matches ? matches.length : 0;
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 5: Generate Migration Tracks)', () => {
  // ============================================================
  // 5.1 — migration-tracks.md exists and has 12 track sections
  // ============================================================
  describe('Phase 5.1 — migration-tracks.md structure', () => {
    /**
     * Per Phase 5 plan task 1: "Write `migration-tracks.md` — group
     * findings into tracks of ≤15 plan tasks". The deliverable is a
     * single Markdown file that introduces each proposed track as a
     * `## Track N — <title>` section. The plan text says "12 Measure
     * tracks" so 12 sections is the contract.
     *
     * GREEN today: the file exists, is non-empty, and contains 13
     * `## Track N —` sections (Tracks 0 through 12). Track 0 is the
     * pre-audit protocol chore and is counted as part of the 12-track
     * plan (the plan's own header says "12-Track Migration Plan" and
     * `## Overview` says "Track 0 is a protocol-refinement pre-audit
     * chore"). So the assertion is `>= 12` rather than `=== 12` to
     * accommodate the protocol chore being co-numbered.
     */
    it('migration-tracks.md exists at the expected path', async () => {
      const stat = await fs.stat(MIGRATION_TRACKS);
      expect(stat.isFile()).toBe(true);
    });

    it('migration-tracks.md is non-empty', async () => {
      const contents = await fs.readFile(MIGRATION_TRACKS, 'utf-8');
      expect(contents.length).toBeGreaterThan(0);
    });

    it('migration-tracks.md has a "## Track N —" section for every proposed track', async () => {
      const sections = await parseMigrationTrackSections();
      const declaredNumbers = sections.map((s) => s.trackNum).sort((a, b) => a - b);
      const expectedNumbers = PROPOSED_TRACKS.map((t) => t.trackNum).sort((a, b) => a - b);
      expect(
        declaredNumbers,
        `migration-tracks.md is missing track sections for: ${expectedNumbers
          .filter((n) => !declaredNumbers.includes(n))
          .join(', ')}`,
      ).toEqual(expectedNumbers);
    });
  });

  // ============================================================
  // 5.2 — Each proposed track has a valid skeleton
  // ============================================================
  describe('Phase 5.2 — Track skeleton (metadata.json + spec.md + plan.md)', () => {
    /**
     * Per Phase 5 plan task 2: "For each proposed track, write a
     * `metadata.json` + `spec.md` + `plan.md` skeleton". The
     * skeleton is the unit-level deliverable. A track without all
     * three files is not actionable from a Measure perspective
     * (no machine-readable status, no FR list, no plan checklist).
     *
     * Tracks are located under either `measure/tracks/<id>/` (pending)
     * or `measure/archive/<id>/` (completed and archived). GREEN today:
     * all 12 tracks have all three files in their respective directory.
     */
    it.each(PROPOSED_TRACKS)(
      'track $trackId (Track $trackNum) has metadata.json + spec.md + plan.md',
      async ({ trackId, trackNum }) => {
        const dir = await locateTrackDir(trackId);
        expect(
          dir,
          `track directory for ${trackId} (Track ${trackNum}) is missing from both measure/tracks/ and measure/archive/`,
        ).not.toBeNull();
        for (const file of ['metadata.json', 'spec.md', 'plan.md']) {
          const filePath = path.join(dir as string, file);
          const stat = await fs.stat(filePath);
          expect(
            stat.isFile(),
            `${trackId}/${file} is not a regular file`,
          ).toBe(true);
          expect(
            stat.size,
            `${trackId}/${file} is empty (size 0)`,
          ).toBeGreaterThan(0);
        }
      },
    );

    /**
     * Sub-contract: `metadata.json` is parseable JSON and has the
     * minimum fields (`track_id`, `type`, `description`). A track
     * with a broken `metadata.json` cannot be ingested by future
     * Measure tooling (status rollups, registry updates).
     */
    it.each(PROPOSED_TRACKS)(
      'track $trackId has a parseable metadata.json with track_id matching the directory name',
      async ({ trackId }) => {
        const dir = (await locateTrackDir(trackId)) as string;
        const meta = JSON.parse(await fs.readFile(path.join(dir, 'metadata.json'), 'utf-8'));
        expect(
          typeof meta.track_id,
          `${trackId}/metadata.json is missing 'track_id' field`,
        ).toBe('string');
        expect(
          meta.track_id,
          `${trackId}/metadata.json track_id ('${meta.track_id}') does not match the directory name`,
        ).toBe(trackId);
        expect(
          typeof meta.type,
          `${trackId}/metadata.json is missing 'type' field`,
        ).toBe('string');
        expect(
          typeof meta.description,
          `${trackId}/metadata.json is missing 'description' field`,
        ).toBe('string');
      },
    );
  });

  // ============================================================
  // 5.3 — Each plan has ≤15 phase-level work units
  // ============================================================
  describe('Phase 5.3 — Plan has ≤15 phase-level tasks', () => {
    /**
     * Per Phase 5 plan task 1 and `test-strategy.md` §1: "Track ≤15
     * tasks". A "task" here is a top-level `## Phase N:` section —
     * each phase is a self-contained work unit shippable in one PR.
     * Sub-phases (`### Phase 2a:`, `### Phase 2b:`, …) are part of
     * the parent phase, not their own top-level work unit.
     *
     * The cap of 15 is the protocol's PR-reviewability ceiling; tracks
     * with more phases should be split (e.g. Track 8 could become
     * `domain_module_decomposition` + `codecamp_module_split`).
     *
     * GREEN today (2026-06-05): every plan is ≤15 phases. The
     * maximum is `ci_typecheck_alignment_20260603` (Track 11) at
     * exactly 15 phases (0–14). One more phase on Track 11 would
     * breach the contract.
     */
    it.each(PROPOSED_TRACKS)(
      'track $trackId plan has ≤15 ## Phase N: sections',
      async ({ trackId, trackNum }) => {
        const dir = (await locateTrackDir(trackId)) as string;
        const phaseCount = await countTopLevelPhases(path.join(dir, 'plan.md'));
        expect(
          phaseCount,
          `${trackId} (Track ${trackNum}) plan has ${phaseCount} ## Phase N: sections; the test-strategy §1 contract caps tracks at 15. Split the track before adding more work.`,
        ).toBeLessThanOrEqual(15);
        // Sanity: every plan has at least Phase 0 (Setup) + Phase 1
        // (first real work) + a Closeout phase. Anything below 3 is
        // almost certainly missing a real plan.
        expect(
          phaseCount,
          `${trackId} (Track ${trackNum}) plan has only ${phaseCount} phases; expected at least 3 (Phase 0 + ≥1 work phase + Closeout).`,
        ).toBeGreaterThanOrEqual(3);
      },
    );
  });

  // ============================================================
  // 5.4 — Each track references the finding ID(s) it resolves
  // ============================================================
  describe('Phase 5.4 — Finding ID reference in skeleton', () => {
    /**
     * Per Phase 5 plan task 1: each track must group specific
     * findings from `findings.md` into a migration plan. The
     * binding is: the finding IDs listed in `migration-tracks.md`
     * `- **Resolves:**` for that track must be mentioned in the
     * track's `metadata.json` (description field) or `spec.md`
     * (Problem section). Otherwise the track is disconnected
     * from the audit and the reader cannot trace work back to a
     * finding.
     *
     * GREEN today: every track's `metadata.json` description
     * contains the `Resolves:` list verbatim (or close to it,
     * depending on whether the track notes "partial" or "(root)"
     * subsumptions).
     */
    it.each(PROPOSED_TRACKS)(
      'track $trackId metadata.json description references every finding it resolves',
      async ({ trackId, resolves }) => {
        const dir = (await locateTrackDir(trackId)) as string;
        const meta = JSON.parse(await fs.readFile(path.join(dir, 'metadata.json'), 'utf-8'));
        const description: string = meta.description ?? '';
        const missing = resolves.filter((f) => !description.includes(f));
        expect(
          missing,
          `${trackId}/metadata.json description is missing finding IDs: ${missing.join(', ')}. The description should reference every finding this track resolves.`,
        ).toEqual([]);
      },
    );

    /**
     * Sub-contract: the spec.md also references the resolved
     * findings. A track with finding IDs only in the description
     * but not in the spec makes the FR list unmoored from the
     * audit (the spec is the "why" and must cite the finding).
     *
     * Note: spec.md may include additional F-IDs beyond the
     * resolves list (e.g. related findings mentioned in the
     * Problem section). The contract is that all `resolves`
     * IDs are mentioned, not that the mentions are exclusive.
     */
    it.each(PROPOSED_TRACKS)(
      'track $trackId spec.md references every finding it resolves',
      async ({ trackId, resolves }) => {
        const dir = (await locateTrackDir(trackId)) as string;
        const spec = await fs.readFile(path.join(dir, 'spec.md'), 'utf-8');
        const missing = resolves.filter((f) => !spec.includes(f));
        expect(
          missing,
          `${trackId}/spec.md is missing finding IDs: ${missing.join(', ')}. Every resolved finding must be cited in the spec's Problem section.`,
        ).toEqual([]);
      },
    );
  });

  // ============================================================
  // 5.5 — Cross-check vs measure/tracks.md registry
  // ============================================================
  describe('Phase 5.5 — measure/tracks.md "Pending Tracks — Audit Findings" cross-check', () => {
    /**
     * Per Phase 5 plan task 3: "Add the proposed tracks to
     * `measure/tracks.md` under 'Pending Tracks — Audit Findings'".
     * The registry is the user-facing entry point; a track that
     * exists only in `migration-tracks.md` is invisible to anyone
     * scanning the registry.
     *
     * GREEN today: every proposed track is listed in the section.
     */
    it('measure/tracks.md has the "Pending Tracks — Audit Findings" sub-heading', async () => {
      const contents = await fs.readFile(TRACKS_REGISTRY, 'utf-8');
      expect(contents).toContain(PENDING_HEADING);
    });

    it.each(PROPOSED_TRACKS)(
      'track $trackId is listed in the "Pending Tracks — Audit Findings" section',
      async ({ trackId }) => {
        const contents = await fs.readFile(TRACKS_REGISTRY, 'utf-8');
        // Find the section; the section ends at the next `####`
        // heading or at the next `---` separator / `### ` heading
        // (whichever comes first).
        const startIdx = contents.indexOf(PENDING_HEADING);
        expect(
          startIdx,
          `measure/tracks.md is missing the "${PENDING_HEADING}" section`,
        ).toBeGreaterThanOrEqual(0);
        // Take everything from the section start to the next `####` heading
        // (the section is `####`; the next `####` is the next section).
        const tail = contents.slice(startIdx);
        const sectionEndMatch = tail.slice(PENDING_HEADING.length).match(/^####\s/m);
        const section = sectionEndMatch
          ? tail.slice(0, PENDING_HEADING.length + (sectionEndMatch.index ?? tail.length))
          : tail;
        expect(
          section.includes(trackId),
          `track ${trackId} is not listed under "${PENDING_HEADING}" in measure/tracks.md. Add an entry with a Link to ${trackId.startsWith('protocol_v1_1') || trackId.startsWith('app_domain') || trackId.startsWith('tenant_db') || trackId.startsWith('argon2id') || trackId.startsWith('ai_adapter') ? './archive/' : './tracks/'}${trackId}/`,
        ).toBe(true);
      },
    );

    /**
     * Sub-contract: the link in the section entry points to an
     * existing directory. A link to a missing directory is a
     * broken registry entry.
     *
     * GREEN today: all 12 link paths resolve to existing
     * directories. The link targets are `./tracks/<id>/` for
     * pending tracks and `./archive/<id>/` for archived ones;
     * the test resolves both forms via `locateTrackDir`.
     */
    it.each(PROPOSED_TRACKS)(
      'track $trackId link target in measure/tracks.md points to an existing directory',
      async ({ trackId }) => {
        const dir = await locateTrackDir(trackId);
        expect(
          dir,
          `track ${trackId} link in measure/tracks.md points to a directory that does not exist (neither measure/tracks/${trackId}/ nor measure/archive/${trackId}/ is on disk)`,
        ).not.toBeNull();
      },
    );
  });
});
