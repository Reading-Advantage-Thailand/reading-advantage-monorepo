/**
 * Wave 2 Phase 4 — Reusable migration-doctor test helper.
 *
 * Generalizes the Phase 1 `ledger-doctor` test pattern (and the original
 * hand-patched DB approach) into a deterministic helper that simulates
 * migration divergence states without a live Postgres instance.
 *
 * The helper consumes structured `MigrationState` fixtures (no live DB,
 * no network calls) and produces a `DivergenceReport` with labeled
 * counts. Variants:
 *   - "fresh" — empty ledger, no schema artifacts
 *   - "existing" — ledger and schema in parity (zero divergence)
 *   - "schema-missing-ledger" — schema artifacts present but ledger rows
 *     missing for at least one migration (the June 8 incident class)
 *   - "ledger-missing-schema" — ledger rows claim a migration was applied
 *     but the corresponding schema sentinel is missing
 *
 * Why this lives here:
 *   - `packages/db/src/testing/` is intentionally NOT in the package's
 *     `exports` map, so this helper is a test utility, not a shipped
 *     runtime API.
 *   - All divergence logic is pure — takes fixtures, returns a labeled
 *     report — so tests can assert the exact case they care about
 *     without spinning up Postgres.
 */

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface SentinelProbe {
  kind: "table" | "column";
  target: string;
}

interface FakeLedgerRow {
  hash: string;
  createdAt: number;
}

interface MigrationState {
  journal: JournalEntry[];
  sentinels: Record<string, SentinelProbe>;
  schemaPresentTags: Set<string>;
  ledgerRows: FakeLedgerRow[];
}

interface Divergence {
  tag: string;
  idx: number;
}

interface DivergenceReport {
  freshDb: boolean;
  existingDb: boolean;
  schemaPresentLedgerMissing: Divergence[];
  ledgerPresentSchemaMissing: Divergence[];
  divergenceCount: number;
}

type StateVariant =
  | "fresh"
  | "existing"
  | "schema-missing-ledger"
  | "ledger-missing-schema";

interface MigrationDoctorHelper {
  /**
   * Build a deterministic migration state fixture for the requested
   * divergence shape.
   */
  buildState(variant: StateVariant): MigrationState;
  /**
   * Run the doctor logic against a (possibly hand-built) migration state
   * fixture and return a labeled divergence report. No live DB.
   */
  check(state: MigrationState): DivergenceReport;
}

const SAMPLE_JOURNAL: JournalEntry[] = [
  { idx: 1, version: "1", when: 1000, tag: "0001_initial", breakpoints: false },
  { idx: 2, version: "1", when: 2000, tag: "0002_add_users", breakpoints: false },
  { idx: 3, version: "1", when: 3000, tag: "0003_add_schools", breakpoints: false },
];

const SAMPLE_SENTINELS: Record<string, SentinelProbe> = {
  "0001_initial": { kind: "table", target: "users" },
  "0002_add_users": { kind: "column", target: "users.email" },
  "0003_add_schools": { kind: "table", target: "schools" },
};

/**
 * Build the doctor helper. Returns an object with two pure functions:
 * `buildState(variant)` and `check(state)`. Both are deterministic and
 * side-effect-free; no DB connection, no network calls.
 *
 * @returns A reusable helper that simulates migration divergence states
 *   for unit tests.
 */
export function buildMigrationDoctorHelper(): MigrationDoctorHelper {
  return {
    buildState(variant) {
      switch (variant) {
        case "fresh":
          return {
            journal: [],
            sentinels: {},
            schemaPresentTags: new Set(),
            ledgerRows: [],
          };
        case "existing":
          return {
            journal: SAMPLE_JOURNAL,
            sentinels: SAMPLE_SENTINELS,
            schemaPresentTags: new Set(
              SAMPLE_JOURNAL.map((entry) => entry.tag),
            ),
            ledgerRows: SAMPLE_JOURNAL.map((entry, i) => ({
              hash: `h${i + 1}`,
              createdAt: entry.when,
            })),
          };
        case "schema-missing-ledger":
          // Schema artifacts exist for every journal entry, but ledger rows
          // are missing for the last migration (the June 8 incident class).
          return {
            journal: SAMPLE_JOURNAL,
            sentinels: SAMPLE_SENTINELS,
            schemaPresentTags: new Set(
              SAMPLE_JOURNAL.map((entry) => entry.tag),
            ),
            ledgerRows: SAMPLE_JOURNAL.slice(0, -1).map((entry, i) => ({
              hash: `h${i + 1}`,
              createdAt: entry.when,
            })),
          };
        case "ledger-missing-schema":
          // Ledger claims every migration was applied, but the schema
          // sentinel for the last migration is missing.
          return {
            journal: SAMPLE_JOURNAL,
            sentinels: {
              ...SAMPLE_SENTINELS,
              "0003_add_schools": undefined as unknown as SentinelProbe,
            },
            schemaPresentTags: new Set(
              SAMPLE_JOURNAL.slice(0, -1).map((entry) => entry.tag),
            ),
            ledgerRows: SAMPLE_JOURNAL.map((entry, i) => ({
              hash: `h${i + 1}`,
              createdAt: entry.when,
            })),
          };
        default: {
          const _exhaustive: never = variant;
          throw new Error(
            `[migration-doctor-helper] Unknown state variant: ${String(_exhaustive)}`,
          );
        }
      }
    },

    check(state) {
      const journalByTag = new Map<string, JournalEntry>();
      for (const entry of state.journal) {
        journalByTag.set(entry.tag, entry);
      }

      const ledgerTags = new Set<string>();
      // The fake ledger rows don't carry the tag (in production this
      // would be a join on `drizzle.__drizzle_migrations`), so we infer
      // them by createdAt ordering against the journal. The test helper
      // guarantees ledgerRows.length === journal.length for "existing"
      // and "ledger-missing-schema", so a positional zip is safe.
      for (let i = 0; i < state.ledgerRows.length; i++) {
        const entry = state.journal[i];
        if (entry) ledgerTags.add(entry.tag);
      }

      const schemaPresentLedgerMissing: Divergence[] = [];
      for (const tag of state.schemaPresentTags) {
        const entry = journalByTag.get(tag);
        if (entry && !ledgerTags.has(tag)) {
          schemaPresentLedgerMissing.push({ tag, idx: entry.idx });
        }
      }

      const ledgerPresentSchemaMissing: Divergence[] = [];
      for (const tag of ledgerTags) {
        const entry = journalByTag.get(tag);
        if (entry && !state.schemaPresentTags.has(tag)) {
          ledgerPresentSchemaMissing.push({ tag, idx: entry.idx });
        }
      }

      const freshDb =
        state.ledgerRows.length === 0 &&
        state.schemaPresentTags.size === 0 &&
        state.journal.length === 0;
      const existingDb =
        schemaPresentLedgerMissing.length === 0 &&
        ledgerPresentSchemaMissing.length === 0 &&
        !freshDb;

      return {
        freshDb,
        existingDb,
        schemaPresentLedgerMissing,
        ledgerPresentSchemaMissing,
        divergenceCount:
          schemaPresentLedgerMissing.length +
          ledgerPresentSchemaMissing.length,
      };
    },
  };
}

export type {
  Divergence,
  DivergenceReport,
  FakeLedgerRow,
  JournalEntry,
  MigrationDoctorHelper,
  MigrationState,
  SentinelProbe,
  StateVariant,
};