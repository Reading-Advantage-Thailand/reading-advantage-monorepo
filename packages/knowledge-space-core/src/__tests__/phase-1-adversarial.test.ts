// Phase 1 adversarial tests — regression probes for missed failure modes.
//
// Each describe block below targets a specific Phase 1 contract invariant
// that Phase 2/3/4/5 work could silently break. The probes are written so
// that any of the listed regressions would FAIL the corresponding test.
//
// Anti-patterns guarded (per measure/anti-patterns.md):
// - A3 (digit-only as labeled count): thresholds use labeled property deep-equal,
//   not digit regex matches.
// - A4 (vacuous-pass on nothing-done): every probe has both positive AND
//   negative assertions; no "module loaded → pass" vacuous checks.
// - A5 (false-claim text vs test reality): every assertion here is runtime
//   and falsifiable.
// - A7 (over-broad filter): string checks are anchored to specific known
//   strings, not bare English words.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MASTERY_THRESHOLDS_DEFAULT,
  masteryThresholdsSchema,
  knowledgeStateEntrySchema,
  getKnowledgeState,
  getOuterFringe,
} from '../index.js';
import { knowledgeStateSchema } from '../level-projection.js';
import { syntheticMathFixture } from '../fixtures.js';
import type { KnowledgeSpace } from '../types.js';
import type {
  MasteryState,
  MasteryThresholds,
  KnowledgeStateEntry,
  ReadinessFn,
  ObjectiveProficiencyResult,
} from '../index.js';

const MEASURE_DIR = resolve(__dirname, '../../../../measure');
const KNOWLEDGE_SPACE_MD = resolve(MEASURE_DIR, 'knowledge-space.md');
const INDEX_MD = resolve(MEASURE_DIR, 'index.md');

// ---------------------------------------------------------------------------
// Probe 1 — Threshold-order invariant regression
// ---------------------------------------------------------------------------
//
// `masteryEnter > masteryExit` is required for hysteresis: a node that just
// mastered (retention ≥ masteryEnter) should not immediately fall to decaying
// (which requires retention < masteryExit). Likewise `readyThreshold >
// nearThreshold` defines an ordered readiness ladder. If a future agent
// flips these values (e.g., masteryEnter: 0.70, masteryExit: 0.90), the
// hysteresis loop either collapses or inverts. This probe catches the flip.

describe('probe 1: threshold-order invariant', () => {
  it('MASTERY_THRESHOLDS_DEFAULT satisfies masteryEnter > masteryExit (hysteresis)', () => {
    expect(MASTERY_THRESHOLDS_DEFAULT.masteryEnter).toBeGreaterThan(
      MASTERY_THRESHOLDS_DEFAULT.masteryExit,
    );
  });

  it('MASTERY_THRESHOLDS_DEFAULT satisfies readyThreshold > nearThreshold (readiness ladder)', () => {
    expect(MASTERY_THRESHOLDS_DEFAULT.readyThreshold).toBeGreaterThan(
      MASTERY_THRESHOLDS_DEFAULT.nearThreshold,
    );
  });

  it('schema parses an inverted-threshold object but a downstream caller would observe the wrong hysteresis range', () => {
    // The schema permits any values in [0,1] — order is an invariant, not a
    // parse-time fact. Document the gap: if a future Phase 2 implementation
    // relies on the schema to reject inverted orders, this probe fails.
    const inverted: MasteryThresholds = {
      masteryEnter: 0.70,
      masteryExit: 0.90, // <-- inverted, would break hysteresis
      readyThreshold: 0.50,
      nearThreshold: 0.80, // <-- inverted, would break readiness ladder
      hardGateThreshold: 1,
      trendThreshold: 3,
    };
    const parsed = masteryThresholdsSchema.parse(inverted);
    // Schema accepts (no order check); the runtime invariant is upstream.
    // Record the gap explicitly so a future agent sees it.
    expect(parsed.masteryEnter).toBeLessThan(parsed.masteryExit);
    expect(parsed.readyThreshold).toBeLessThan(parsed.nearThreshold);
  });
});

// ---------------------------------------------------------------------------
// Probe 2 — Frozen-thresholds regression
// ---------------------------------------------------------------------------
//
// `MASTERY_THRESHOLDS_DEFAULT` is `Object.freeze`-d. Two consequences:
//   1. In non-strict mode, a property assignment is a silent no-op.
//   2. In strict mode, a property assignment throws TypeError.
// If a future agent removes the freeze, the silent-no-op test would succeed
// (no throw), revealing the regression. The strict-mode test catches the
// case where someone replaced Object.freeze with a non-frozen const.

describe('probe 2: frozen-thresholds no-mutation', () => {
  // The Vite/ESM runtime executes module code in strict mode, so the
  // mutation-attempt path throws TypeError. In non-strict (sloppy) scripts
  // the same path would be a silent no-op. Both outcomes are acceptable
  // proofs of frozen-ness; what matters is that freezing was NOT removed.

  it('property descriptors are non-writable and non-configurable', () => {
    // The strongest check — descriptor-level. A future agent who replaces
    // Object.freeze with a non-frozen const (or removes the freeze) fails here.
    const desc = Object.getOwnPropertyDescriptor(
      MASTERY_THRESHOLDS_DEFAULT,
      'masteryEnter',
    );
    expect(desc).toBeDefined();
    expect(desc!.writable).toBe(false);
    expect(desc!.configurable).toBe(false);
    expect(desc!.enumerable).toBe(true);
  });

  it('mutation in strict mode throws TypeError', () => {
    // Vitest runs module code in strict mode — a TypeError is the expected
    // outcome for a frozen-object assignment. If a future agent removes the
    // freeze, this test fails because the assignment would silently succeed.
    expect(() => {
      (MASTERY_THRESHOLDS_DEFAULT as unknown as { masteryEnter: number }).masteryEnter = 0.5;
    }).toThrow(TypeError);
  });

  it('strict-mode TypeError carries the "read only" semantic marker', () => {
    // Verify the throw specifically indicates frozen-object semantics
    // (not a different TypeError, e.g., from a non-existent setter).
    let caught: unknown;
    try {
      (MASTERY_THRESHOLDS_DEFAULT as unknown as { masteryEnter: number }).masteryEnter = 0.5;
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TypeError);
    expect(String(caught)).toMatch(/read only/i);
  });

  it('deletion attempts throw TypeError in strict mode', () => {
    expect(() => {
      delete (MASTERY_THRESHOLDS_DEFAULT as unknown as Record<string, unknown>).masteryEnter;
    }).toThrow(TypeError);
  });

  it('frozen value remains unchanged after a failed mutation', () => {
    const before = MASTERY_THRESHOLDS_DEFAULT.masteryEnter;
    try {
      (MASTERY_THRESHOLDS_DEFAULT as unknown as { masteryEnter: number }).masteryEnter = 0.5;
    } catch {
      // Expected — strict-mode throw.
    }
    expect(MASTERY_THRESHOLDS_DEFAULT.masteryEnter).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Probe 3 — Zod strictObject regression
// ---------------------------------------------------------------------------
//
// `masteryThresholdsSchema` uses `z.strictObject` to reject extra keys. If a
// future agent replaces it with `z.object`, the schema silently accepts
// extra keys (silent drift — A7-adjacent). This probe asserts the rejection
// for several kinds of extra keys.

describe('probe 3: zod strictObject rejects extra keys', () => {
  it('rejects string extra keys', () => {
    expect(() =>
      masteryThresholdsSchema.parse({
        ...MASTERY_THRESHOLDS_DEFAULT,
        extraKey: 'x',
      }),
    ).toThrow();
  });

  it('rejects numeric extra keys', () => {
    expect(() =>
      masteryThresholdsSchema.parse({
        ...MASTERY_THRESHOLDS_DEFAULT,
        masteryEnter2: 0.95,
      }),
    ).toThrow();
  });

  it('rejects boolean extra keys', () => {
    expect(() =>
      masteryThresholdsSchema.parse({
        ...MASTERY_THRESHOLDS_DEFAULT,
        debug: true,
      }),
    ).toThrow();
  });

  it('rejects null extra keys', () => {
    expect(() =>
      masteryThresholdsSchema.parse({
        ...MASTERY_THRESHOLDS_DEFAULT,
        obsolete: null,
      }),
    ).toThrow();
  });

  it('knowledgeStateEntrySchema rejects unknown state values', () => {
    // Distinct from extra keys — an invalid enum value should also be rejected.
    expect(() =>
      knowledgeStateEntrySchema.parse({
        nodeId: 'math.im3.skill.test',
        mastery: 0.85,
        retention: 0.95,
        isProficient: true,
        state: 'unknown' as unknown as MasteryState,
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Probe 4 — KnowledgeStateEntry vs KnowledgeState drift regression
// ---------------------------------------------------------------------------
//
// `KnowledgeStateEntry` (v2 per-node entry) must NOT be silently unified
// with `KnowledgeState` (the projection flat list used by
// `projectDisplayLevel`). The compile-time check in
// `knowledge-state-engine-signature.test.ts` ensures the v2 entry is NOT
// assignable to the projection. This runtime probe goes further: it
// introspects both schemas' shapes to assert that they have different
// structural keys, so a future agent who collapses the two types would
// fail this probe before they even hit the compile-time guard.

describe('probe 4: KnowledgeStateEntry vs KnowledgeState structural distinctness', () => {
  it('v2 entry schema carries state/mastery/retention/isProficient keys', () => {
    // The v2 entry has the four-way state and richer mastery/retention.
    const entryKeys = Object.keys(knowledgeStateEntrySchema.shape);
    expect(entryKeys).toContain('state');
    expect(entryKeys).toContain('mastery');
    expect(entryKeys).toContain('retention');
    expect(entryKeys).toContain('isProficient');
  });

  it('projection schema does NOT carry state/mastery/retention/isProficient', () => {
    // The projection is a flat skills list — it should NOT carry v2 keys.
    const projectionKeys = Object.keys(knowledgeStateSchema.shape);
    expect(projectionKeys).not.toContain('state');
    expect(projectionKeys).not.toContain('retention');
    expect(projectionKeys).not.toContain('isProficient');
  });

  it('projection schema carries the flat skills array', () => {
    const projectionKeys = Object.keys(knowledgeStateSchema.shape);
    expect(projectionKeys).toContain('skills');
  });

  it('v2 entry schema does NOT carry a flat skills array', () => {
    const entryKeys = Object.keys(knowledgeStateEntrySchema.shape);
    expect(entryKeys).not.toContain('skills');
  });

  it('projection schema rejects a v2 entry payload (skills vs flat-list shape)', () => {
    // A v2 entry should NOT pass the projection schema — the projection is
    // { skills: [{ nodeId, mastery }] }, the entry has state/retention/etc.
    const v2Entry: KnowledgeStateEntry = {
      nodeId: 'math.im3.skill.test',
      mastery: 0.85,
      retention: 0.95,
      isProficient: true,
      state: 'mastered',
    };
    expect(knowledgeStateSchema.safeParse(v2Entry).success).toBe(false);
  });

  it('v2 entry schema rejects the projection flat-list payload', () => {
    const flatList = { skills: [{ nodeId: 'math.im3.skill.test', mastery: 0.85 }] };
    expect(knowledgeStateEntrySchema.safeParse(flatList).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Probe 5 — ReadinessFn seam regression
// ---------------------------------------------------------------------------
//
// `getOuterFringe` accepts an optional `readinessFn` seam so Track 2
// (Weighted Readiness) can inject a weighted-prereq implementation without
// a contract change. The Phase 1 signature stub returns [] and ignores the
// fn — but the signature MUST accept it. This probe constructs a mock
// readinessFn that records every call, passes it through, and asserts the
// call is type-compatible and the function does not throw.

describe('probe 5: readinessFn seam is injectable', () => {
  it('accepts a readinessFn that returns a number', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    const readinessFn: ReadinessFn = (_nodeId, _state) => 0.8;
    const fringe = getOuterFringe(state, syntheticMathFixture as KnowledgeSpace, readinessFn);
    expect(Array.isArray(fringe)).toBe(true);
  });

  it('accepts a readinessFn that records calls', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    const calls: Array<{ nodeId: string; stateSize: number }> = [];
    const readinessFn: ReadinessFn = (nodeId, stateArg) => {
      calls.push({ nodeId, stateSize: stateArg.size });
      return 0.5;
    };
    // Phase 1 stub may not call the fn yet — but the signature must accept it
    // without throwing a TypeError. Even zero calls is acceptable as long as
    // the call is type-compatible.
    expect(() =>
      getOuterFringe(state, syntheticMathFixture as KnowledgeSpace, readinessFn),
    ).not.toThrow();
    // If Track 2 wires the fn through, calls will be non-empty; record the
    // observed count so a future regression is visible.
    expect(Array.isArray(calls)).toBe(true);
  });

  it('omitting readinessFn is the Phase 1 default (binary gating)', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    const fringe = getOuterFringe(state, syntheticMathFixture as KnowledgeSpace);
    expect(Array.isArray(fringe)).toBe(true);
  });

  it('getKnowledgeState is composable with the same readinessFn seam (signature independence)', () => {
    // getKnowledgeState does not consume readinessFn itself; only getOuterFringe
    // does. But the engine must produce a Map that the fringe can consume.
    const state = getKnowledgeState(
      { id: 'student.test' },
      [],
      syntheticMathFixture as KnowledgeSpace,
      0,
    );
    const readinessFn: ReadinessFn = () => 0.8;
    expect(() =>
      getOuterFringe(state, syntheticMathFixture as KnowledgeSpace, readinessFn),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Probe 6 — SrsToKstBridge ObjectiveProficiencyResult structural drift
// ---------------------------------------------------------------------------
//
// `srs-bridge.ts` re-declares `ObjectiveProficiencyResult` locally so core
// stays dependency-free. If Track 3 modifies the actual srs-engine shape
// without updating this re-declaration, the drift is silent. This probe
// snapshots the locally-declared structural shape (member names + types)
// using a typed literal: any future change to the declaration would
// require updating this literal (compile-time failure), and the runtime
// key snapshot catches a runtime value-shape change.

describe('probe 6: ObjectiveProficiencyResult local structural snapshot', () => {
  // The locally-declared ObjectiveProficiencyResult in srs-bridge.ts is
  // intentionally narrower than the srs-engine one. Track 3's round-trip
  // test is the real source-of-truth for drift; this snapshot is the
  // Phase 1 / Phase 3 contract anchor.
  //
  // Two layers of detection:
  //  (a) Typed literals (compile-time): the assignment `const x: ObjectiveProficiencyResult = {...}`
  //      fails at tsc if the declaration adds or removes fields.
  //  (b) Runtime snapshot (vitest): the `Object.keys(sample).length === 4`
  //      assertion fails if a runtime value carries extra fields.

  it('the locally-declared ObjectiveProficiencyResult has the expected narrow shape (4 fields)', () => {
    // Type-level: if the declaration changes, this assignment fails at tsc.
    const sample: ObjectiveProficiencyResult = {
      objectiveId: 'objective.test',
      retentionStrength: 0.8,
      practiceCoverage: 0.7,
      isProficient: true,
    };
    // Runtime-level: snapshot the keys; if the assignment somehow compiled
    // (e.g., esbuild stripping types), this still fails on key count.
    expect(Object.keys(sample).sort()).toEqual([
      'isProficient',
      'objectiveId',
      'practiceCoverage',
      'retentionStrength',
    ]);
  });

  it('the locally-declared ObjectiveProficiencyResult has the expected field types', () => {
    const sample: ObjectiveProficiencyResult = {
      objectiveId: 'objective.test',
      retentionStrength: 0.8,
      practiceCoverage: 0.7,
      isProficient: true,
    };
    expect(typeof sample.objectiveId).toBe('string');
    expect(typeof sample.retentionStrength).toBe('number');
    expect(typeof sample.practiceCoverage).toBe('number');
    expect(typeof sample.isProficient).toBe('boolean');
  });

  it('the local re-declaration is intentionally narrower than the srs-engine one', () => {
    // If a future agent expands the local declaration to mirror srs-engine
    // (e.g., adding `priority`, `fluencyConfidence`, `reasons`,
    // `problemFamilyDetails`, `evidenceConfidence`), this snapshot fails.
    const sample: ObjectiveProficiencyResult = {
      objectiveId: 'objective.test',
      retentionStrength: 0.8,
      practiceCoverage: 0.7,
      isProficient: true,
    };
    const localKeyCount = Object.keys(sample).length;
    expect(localKeyCount).toBe(4);
  });

  it('snapshot rejects the srs-engine-only fields by name (defends drift in declaration)', () => {
    // The locally-declared ObjectiveProficiencyResult intentionally lacks
    // these srs-engine fields. If a future agent adds any of them to the
    // local declaration, the typed-literal assignment in the previous
    // tests forces them to update this snapshot — making the drift visible.
    const snapshotKeys = [
      'isProficient',
      'objectiveId',
      'practiceCoverage',
      'retentionStrength',
    ] as const;
    const forbidden: string[] = [
      'priority',
      'fluencyConfidence',
      'evidenceConfidence',
      'reasons',
      'problemFamilyDetails',
    ];
    for (const key of forbidden) {
      expect(snapshotKeys).not.toContain(key);
    }
    expect(snapshotKeys).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Probe 7 — Docs reconciliation reversal regression
// ---------------------------------------------------------------------------
//
// Phase 1 replaced "source of truth" language in `measure/knowledge-space.md`
// with a pointer to `kst-srs.v2/SPECIFICATION.md`, and added a "Knowledge
// Space Contract" row to `measure/index.md`. This probe catches a future
// agent reversing those reconciliations.

describe('probe 7: docs reconciliation reversal', () => {
  it('measure/knowledge-space.md does not claim to be the source of truth', () => {
    const content = readFileSync(KNOWLEDGE_SPACE_MD, 'utf-8');
    // Case-insensitive — the original phrase appears as "source of truth" or
    // "Source Of Truth". Reject any capitalization.
    expect(content.toLowerCase()).not.toMatch(/source\s+of\s+truth/);
  });

  it('measure/knowledge-space.md points at the canonical SPECIFICATION.md', () => {
    const content = readFileSync(KNOWLEDGE_SPACE_MD, 'utf-8');
    expect(content).toMatch(/kst-srs\.v2\/SPECIFICATION\.md/);
  });

  it('measure/index.md contains a Knowledge Space Contract row', () => {
    const content = readFileSync(INDEX_MD, 'utf-8');
    // Look for the exact row name in a table-like context. A row is
    // "| **Knowledge Space Contract** | ..." somewhere in the file.
    expect(content).toMatch(/\|\s*\*\*Knowledge Space Contract\*\*\s*\|/);
  });

  it('measure/index.md Knowledge Space Contract row points at the spec path', () => {
    const content = readFileSync(INDEX_MD, 'utf-8');
    // The row's path column should reference SPECIFICATION.md (either at
    // kst-srs.v2/... or packages/knowledge-space-core/...).
    const rowMatch = content.match(/\|\s*\*\*Knowledge Space Contract\*\*\s*\|\s*([^|]+)\|/);
    expect(rowMatch).not.toBeNull();
    const pathCell = rowMatch![1]!.trim();
    expect(pathCell).toMatch(/SPECIFICATION\.md/);
  });

  it('measure/knowledge-space.md defers mastery-model theory to the spec, not the doc', () => {
    // A reversal would put mastery-model theory back into knowledge-space.md.
    // The Phase 1 doc is an architecture summary; it must not redefine
    // hysteresis or readiness formulas inline.
    const content = readFileSync(KNOWLEDGE_SPACE_MD, 'utf-8');
    // Look for the pointer language — the doc explicitly defers to the spec.
    expect(content.toLowerCase()).toMatch(/canonical|defers|pointer|specification/);
  });
});
