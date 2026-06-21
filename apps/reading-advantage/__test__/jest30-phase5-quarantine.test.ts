/**
 * Jest 30 Migration - Phase 5 Task 3: Canaries Quarantine Red Proof.
 *
 * The fleet completion audit called out three game-component test
 * suites that are failing in the full Jest run under Jest 30:
 *
 *   - apps/reading-advantage/components/games/vocabulary/dragon-flight/DragonFlightGame.test.tsx
 *   - apps/reading-advantage/components/games/vocabulary/dragon-rider/DragonRiderGame.test.tsx
 *   - apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.test.tsx
 *
 * These are pre-existing testing-library / Konva mock interaction
 * failures (per Phase 3 plan.md §"Phase 3 - Green proof" canary
 * table), NOT Jest 30 API changes. Jest 30 keeps both
 * `jest.requireActual` and `useFakeTimers` APIs per jest30-audit.md
 * §2 rows 5-6. Task 3 requires the implementer to either FIX the
 * rendering failure in each canary, or formally QUARANTINE each
 * failing canary with owner, date, and follow-up track id.
 *
 * This file is the Red proof for Task 3: it enumerates the three
 * canary suite paths and asserts each is either (a) passing in the
 * latest run record, or (b) listed in the
 * `phase-5-quarantine.json` manifest with the required owner/date/
 * follow-up fields.
 *
 * Design constraints:
 *
 *   - One focused test file. The test does not run Jest itself; the
 *     full-suite run is owned by Task 2 and the canary fixes are
 *     owned by the Phase 5 implementer (see plan.md hand-off §5.3).
 *   - The test cross-references the run record from Task 2; if the
 *     run record shows the canary as passing, no quarantine entry
 *     is required (the fix path).
 *   - If the run record shows the canary as failing, the test
 *     requires a quarantine entry with the required fields.
 *   - Bounded: `__test__/jest30-phase5-quarantine.test.ts` is the
 *     single source of truth; no `--testPathPattern` widening, no
 *     full-suite smoke, no watch mode.
 *
 * Expected behavior:
 *
 *   - FAILS at the pre-Phase-5 HEAD (the quarantine manifest does
 *     not exist; the canaries are failing in the targeted `__test__`
 *     gate's siblings that Phase 5 must bring into scope). The 4
 *     tests fail because: (1) the manifest is missing, (2) the
 *     DragonFlight canary is not in the manifest, (3) the DragonRider
 *     canary is not in the manifest, (4) the CastleDefense canary is
 *     not in the manifest.
 *   - PASSES once the implementer either (a) fixes all 3 canaries
 *     (in which case the manifest may be empty/absent) or (b) writes
 *     the manifest with one entry per still-failing canary.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const QUARANTINE_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tracks",
  "jest30_major_migration",
  "phase-5-quarantine.json",
);

const RUN_RECORD_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tracks",
  "jest30_major_migration",
  "phase-5-full-run.json",
);

interface Phase5QuarantineEntry {
  suite_path: string;
  failure_mode?: string;
  owner: string;
  quarantined_at: string;
  follow_up_track: string;
}

interface Phase5Quarantine {
  created_at?: string;
  quarantined: Phase5QuarantineEntry[];
}

const CANARY_SUITES = [
  "apps/reading-advantage/components/games/vocabulary/dragon-flight/DragonFlightGame.test.tsx",
  "apps/reading-advantage/components/games/vocabulary/dragon-rider/DragonRiderGame.test.tsx",
  "apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.test.tsx",
] as const;

function readQuarantineOrNull(): Phase5Quarantine | null {
  if (!fs.existsSync(QUARANTINE_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(QUARANTINE_PATH, "utf8");
  try {
    return JSON.parse(raw) as Phase5Quarantine;
  } catch (error) {
    throw new Error(
      `phase-5-quarantine: JSON parse failed at ${QUARANTINE_PATH}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function readRunRecordOrNull(): unknown {
  if (!fs.existsSync(RUN_RECORD_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(RUN_RECORD_PATH, "utf8"));
}

/**
 * Resolve a canary suite to one of: "passing" | "failing" | "unknown".
 * - "passing" when the run record shows the suite in a passing state
 * - "failing" when the run record shows the suite as failing
 * - "unknown" when no run record exists yet (the implementer has
 *   not completed Task 2), in which case the test cannot make a
 *   determination from the run and must rely on the quarantine
 *   manifest instead.
 */
function canaryStatus(
  suitePath: string,
  runRecord: unknown,
): "passing" | "failing" | "unknown" {
  if (!runRecord || typeof runRecord !== "object") {
    return "unknown";
  }
  const record = runRecord as {
    per_app?: { reading_advantage?: { failing_suites?: string[] } };
  };
  const failing = record.per_app?.reading_advantage?.failing_suites;
  if (!Array.isArray(failing)) {
    return "unknown";
  }
  if (failing.includes(suitePath)) {
    return "failing";
  }
  return "passing";
}

function findQuarantineEntry(
  quarantine: Phase5Quarantine | null,
  suitePath: string,
): Phase5QuarantineEntry | undefined {
  if (!quarantine) {
    return undefined;
  }
  return quarantine.quarantined.find((entry) => entry.suite_path === suitePath);
}

describe("jest30-phase5-quarantine - migration canaries are fixed or formally quarantined", () => {
  const quarantine = readQuarantineOrNull();
  const runRecord = readRunRecordOrNull();

  test("phase-5-quarantine.json file exists at the canonical path (or all canaries pass)", () => {
    if (quarantine === null) {
      // Manifest may legitimately be absent if all canaries pass.
      // Assert all three canaries are passing in the run record.
      for (const suite of CANARY_SUITES) {
        expect(canaryStatus(suite, runRecord)).toBe("passing");
      }
      return;
    }
    expect(quarantine).toBeDefined();
    expect(Array.isArray(quarantine.quarantined)).toBe(true);
  });

  test.each(CANARY_SUITES)(
    "canary %s is either passing in the run record or listed in the quarantine manifest with owner/date/follow-up",
    (suitePath) => {
      const status = canaryStatus(suitePath, runRecord);
      if (status === "passing") {
        // No quarantine entry required.
        return;
      }
      // Either failing or unknown: must be in the manifest.
      const entry = findQuarantineEntry(quarantine, suitePath);
      expect(entry).toBeDefined();
      expect(entry?.owner).toEqual(expect.any(String));
      expect((entry?.owner ?? "").length).toBeGreaterThan(0);
      expect(entry?.quarantined_at).toEqual(expect.any(String));
      expect(entry?.quarantined_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(entry?.follow_up_track).toEqual(expect.any(String));
      expect((entry?.follow_up_track ?? "").length).toBeGreaterThan(0);
    },
  );
});
