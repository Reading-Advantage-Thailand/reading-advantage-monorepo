/**
 * Jest 30 Migration - Phase 5 Task 5: Metadata Closeout Consistency Red Proof.
 *
 * Task 5 requires the implementer to update `metadata.json` AND
 * `measure/tracks.md` ONLY after the full-suite/quarantine evidence
 * from Tasks 1-4 is recorded. This is the "post-condition check" -
 * the closeout action references the Phase 5 work specifically so
 * that future readers can see how the migration's last open seam
 * was closed.
 *
 * This file is the Red proof for Task 5. It asserts two
 * post-closeout shape facts:
 *
 *   - `metadata.json` `deviation_notes` references "Phase 5" (the
 *     current pre-closeout notes mention the completion audit but
 *     not "Phase 5" by name).
 *   - The `jest30_major_migration` entry in `measure/tracks.md`
 *     no longer carries the pre-Phase-5 "keep active/reopened"
 *     qualifier and instead uses a "closed" / "complete" / SHA
 *     reference.
 *
 * Both assertions are checked together; either one failing flips
 * the closeout gate. The two-prong test is the minimum that
 * proves the closeout action was actually performed (vs. silently
 * letting the track sit at "reopened" forever).
 *
 * Design constraints:
 *
 *   - One focused test file. The closeout is owned by the
 *     Phase 5 closeout role; the test only verifies the
 *     post-closeout contract.
 *   - Bounded: `__test__/jest30-phase5-metadata-consistency.test.ts`
 *     is the single source of truth; no `--testPathPattern` widening,
 *     no full-suite smoke, no watch mode.
 *
 * Expected behavior:
 *
 *   - FAILS at the pre-Phase-5 HEAD because:
 *     (1) `metadata.json` `deviation_notes` does not mention
 *         "Phase 5" (current text is the track-reopening reason:
 *         "Kept active after the 2026-06-21 fleet completion
 *         audit rejected the closeout: ...").
 *     (2) The jest30 entry in tracks.md says "keep
 *         active/reopened after the completion audit" (pre-Phase-5
 *         qualifier).
 *   - PASSES once the implementer updates `deviation_notes` to
 *     reference Phase 5 AND updates tracks.md to remove the
 *     "keep active/reopened" qualifier.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const METADATA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tracks",
  "jest30_major_migration",
  "metadata.json",
);

const TRACKS_MD_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tracks.md",
);

interface Phase5Metadata {
  track_id: string;
  type: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  description: string;
  deviation_notes?: string;
}

function readMetadataOrNull(): Phase5Metadata | null {
  if (!fs.existsSync(METADATA_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(METADATA_PATH, "utf8")) as Phase5Metadata;
}

function readTracksMdOrEmpty(): string {
  if (!fs.existsSync(TRACKS_MD_PATH)) {
    return "";
  }
  return fs.readFileSync(TRACKS_MD_PATH, "utf8");
}

describe(
  "jest30-phase5-metadata-consistency - metadata and tracks.md are consistent with Phase 5 evidence",
  () => {
    test(
      "metadata.json deviation_notes reference the Phase 5 Completion-Audit Remediation work",
      () => {
        const metadata = readMetadataOrNull();
        expect(metadata).not.toBeNull();
        if (!metadata) {
          return;
        }
        expect(metadata.deviation_notes).toEqual(expect.any(String));
        // The Phase 5 closeout requires the implementer to update
        // deviation_notes to mention Phase 5. The current pre-Phase-5
        // notes (the track-reopening reason) do NOT mention "Phase
        // 5" - they talk about the "completion audit" and "subset of
        // suites". After closeout, the notes should reference the
        // Phase 5 remediation work (and ideally the closeout SHA).
        const notes = metadata.deviation_notes ?? "";
        expect(notes).toMatch(/phase\s*5/i);
      },
    );

    test(
      "measure/tracks.md jest30 entry has been reconciled to the post-Phase-5 state (no 'keep active/reopened' qualifier)",
      () => {
        const tracksMd = readTracksMdOrEmpty();
        // The Phase 5 closeout requires the implementer to update
        // the jest30 entry in tracks.md. The current pre-closeout
        // entry says "keep active/reopened" (per the post-completion-
        // audit reopening). After closeout, the entry should be
        // updated to "closed" or reference the closeout SHA.
        expect(tracksMd).toMatch(/jest30_major_migration/);
        // Find the jest30 entry and assert it does NOT contain the
        // pre-Phase-5 "reopened" qualifier.
        const jest30Entry = tracksMd.match(
          /jest30_major_migration[\s\S]{0,400}/,
        );
        expect(jest30Entry).not.toBeNull();
        expect(jest30Entry?.[0] ?? "").not.toMatch(/keep\s+active\s*\/\s*reopened/i);
        expect(jest30Entry?.[0] ?? "").toMatch(/closed|complete|done|sha:/i);
      },
    );
  },
);
