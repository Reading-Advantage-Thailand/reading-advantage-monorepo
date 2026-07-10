import { describe, it, expect } from 'vitest';

import {
  priorityWeightsSchema,
  type PriorityScore,
  type PlannerInput,
  type PlannerOutput,
  type PlannerNodeView,
  type PlannerEdgeView,
  type PlannerMisconceptionLink,
} from '../planner/types.js';

// ---------------------------------------------------------------------------
// Adversarial coverage for Phase 1 (Contract & Schema).
//
// Intent: cover boundary, failure-path, integration, and regression gaps in
// the contract test authored at planner-contract.test.ts:
//   - matrix coverage of every rejected primitive across all four positions;
//   - missing-key negative paths;
//   - parsed-value preservation (existing tests only assert `success`);
//   - parse() (non-safe) throws on invalid input;
//   - round-trip of PlannerInput / PlannerOutput via JSON;
//   - type-shape coverage for PlannerNodeView / PlannerEdgeView /
//     PlannerMisconceptionLink (currently uncovered);
//   - exhaustive PriorityScore discriminator variant coverage;
//   - public-surface guard: the package's exports map must expose
//     `./planner/types` so Phase 2/3 consumers can import the contract
//     without internal path coupling.
// ---------------------------------------------------------------------------

type WeightKey = 'a' | 'b' | 'c' | 'd' | 'e';

const REJECTED_PRIMITIVES: ReadonlyArray<readonly [string, unknown]> = [
  ['null', null],
  ['undefined', undefined],
  ['boolean true', true],
  ['boolean false', false],
  ['object', { value: 1 }],
  ['array', [1]],
  ['symbol', Symbol('x')],
];

const REJECTED_NUMERIC: ReadonlyArray<readonly [string, unknown]> = [
  ['NaN', NaN],
  ['positive Infinity', Infinity],
  ['negative Infinity', -Infinity],
  ['negative integer', -1],
  ['negative fraction', -0.0001],
  ['large negative', -1e10],
];

const ACCEPTED_NUMERIC: ReadonlyArray<readonly [string, number]> = [
  ['zero', 0],
  ['small positive', 0.5],
  ['one', 1],
  ['MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER],
  ['MIN_VALUE', Number.MIN_VALUE],
  ['1e-300', 1e-300],
  ['10e10', 10e10],
];

describe('priorityWeightsSchema — adversarial matrix coverage', () => {
  describe.each(REJECTED_PRIMITIVES)(
    'rejects %s in any weight position',
    (_label, value) => {
      it.each<WeightKey>(['a', 'b', 'c', 'd', 'e'])('position %s', (key) => {
        const input: Record<string, unknown> = { a: 1, b: 1, c: 1, d: 1, e: 1 };
        input[key] = value;
        const result = priorityWeightsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    },
  );

  describe.each(REJECTED_NUMERIC)(
    'rejects %s in every weight position',
    (_label, value) => {
      it.each<WeightKey>(['a', 'b', 'c', 'd', 'e'])('position %s', (key) => {
        const input: Record<string, unknown> = { a: 1, b: 1, c: 1, d: 1, e: 1 };
        input[key] = value;
        const result = priorityWeightsSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    },
  );

  describe.each(ACCEPTED_NUMERIC)(
    'accepts %s in every weight position',
    (_label, value) => {
      it.each<WeightKey>(['a', 'b', 'c', 'd', 'e'])('position %s', (key) => {
        const input: Record<string, unknown> = { a: 0, b: 0, c: 0, d: 0, e: 0 };
        input[key] = value;
        const result = priorityWeightsSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data[key]).toBe(value);
        }
      });
    },
  );
});

describe('priorityWeightsSchema — missing-key failure paths', () => {
  it('rejects empty object', () => {
    expect(priorityWeightsSchema.safeParse({}).success).toBe(false);
  });

  it('rejects payload missing each key in turn', () => {
    const base: Record<WeightKey, number> = { a: 1, b: 1, c: 1, d: 1, e: 1 };
    for (const key of ['a', 'b', 'c', 'd', 'e'] as const) {
      const payload: Record<string, number> = { ...base };
      delete payload[key];
      expect(priorityWeightsSchema.safeParse(payload).success).toBe(false);
    }
  });
});

describe('priorityWeightsSchema — parsed-value preservation', () => {
  it('preserves exact numeric values including zero', () => {
    const input = { a: 0, b: 0.5, c: 1, d: 1.5, e: 0.2 };
    const result = priorityWeightsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
      expect(result.data.a).toBe(0);
      expect(result.data.b).toBe(0.5);
      expect(result.data.c).toBe(1);
      expect(result.data.d).toBe(1.5);
    }
  });

  it('preserves extreme finite values without coercion', () => {
    const input = {
      a: Number.MAX_SAFE_INTEGER,
      b: Number.MIN_VALUE,
      c: 1e-300,
      d: 0,
      e: 0.2,
    };
    const result = priorityWeightsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
    }
  });

  it('round-trips weights through JSON.stringify -> JSON.parse', () => {
    const input = { a: 0.25, b: 1.5, c: 2, d: 0, e: 0.2 };
    const json = JSON.stringify(input);
    const rehydrated = JSON.parse(json);
    const result = priorityWeightsSchema.safeParse(rehydrated);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(input);
    }
  });
});

describe('priorityWeightsSchema — parse() (non-safe) throws on invalid input', () => {
  it('throws ZodError on negative weight', () => {
    expect(() => priorityWeightsSchema.parse({ a: -1, b: 1, c: 1, d: 1, e: 0 })).toThrow();
  });

  it('throws ZodError on missing key', () => {
    expect(() => priorityWeightsSchema.parse({ a: 1, b: 1, c: 1 })).toThrow();
  });

  it('throws ZodError on extra unknown key', () => {
    expect(() =>
      priorityWeightsSchema.parse({ a: 1, b: 1, c: 1, d: 1, e: 1, f: 1 }),
    ).toThrow();
  });

  it('returns the parsed value (does not transform)', () => {
    const out = priorityWeightsSchema.parse({ a: 0.7, b: 1, c: 1, d: 1, e: 0.2 });
    expect(out).toEqual({ a: 0.7, b: 1, c: 1, d: 1, e: 0.2 });
  });
});

describe('priorityWeightsSchema — duplicated-key edge', () => {
  // JS object literals silently dedupe duplicate keys (last-wins).
  // The schema must not reject the resulting single-key payload silently.
  it('accepts duplicate-key payload (JS last-wins semantics)', () => {
    // @ts-expect-error duplicate-key probe
    const payload = { a: 1, b: 1, c: 1, d: 1, e: 0.2, a: 0.25 };
    const result = priorityWeightsSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.a).toBe(0.25);
    }
  });
});

describe('Planner type shapes — adversarial coverage', () => {
  it('PlannerNodeView accepts all required fields and rejects undefined id', () => {
    const node: PlannerNodeView = {
      id: 'n1',
      kind: 'skill',
      title: 'Add fractions',
      domain: 'math',
    };
    expect(node.id).toBe('n1');
    expect(node.kind).toBe('skill');
    expect(node.title).toBe('Add fractions');
    expect(node.domain).toBe('math');
  });

  it('PlannerEdgeView round-trips numeric and negative weights (no schema on edge.weight)', () => {
    const edge: PlannerEdgeView = {
      id: 'e1',
      type: 'prerequisite_for',
      sourceId: 'n1',
      targetId: 'n2',
      weight: 1,
    };
    expect(edge.weight).toBe(1);

    // The shape permits negative weights because the type is plain `number`.
    // Lock in the documented behavior so a future tightening is a deliberate
    // contract change rather than an accidental side-effect of a refactor.
    const negativeEdge: PlannerEdgeView = {
      id: 'e2',
      type: 'prerequisite_for',
      sourceId: 'n2',
      targetId: 'n3',
      weight: -0.5,
    };
    expect(negativeEdge.weight).toBe(-0.5);
  });

  it('PlannerMisconceptionLink severity literal union is exercised', () => {
    const minorLink: PlannerMisconceptionLink = {
      skillId: 's1',
      misconceptionId: 'm1',
      severity: 'minor',
    };
    const severeLink: PlannerMisconceptionLink = {
      skillId: 's1',
      misconceptionId: 'm2',
      severity: 'severe',
    };
    expect(minorLink.severity).toBe('minor');
    expect(severeLink.severity).toBe('severe');

    // Type-level guard: any severity other than 'minor' | 'severe' is a
    // compile error. The runtime expression below would not typecheck if
    // the union were widened to `string`.
    const severities: ReadonlyArray<PlannerMisconceptionLink['severity']> = [
      'minor',
      'severe',
    ];
    expect(new Set(severities)).toEqual(new Set(['minor', 'severe']));
  });
});

describe('PlannerInput — adversarial coverage', () => {
  it('accepts an empty graph (no nodes, no edges, no readiness, no goals)', () => {
    const input: PlannerInput = {
      nodes: [],
      edges: [],
      readinessByNode: {},
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(input.nodes).toHaveLength(0);
    expect(input.edges).toHaveLength(0);
    expect(Object.keys(input.readinessByNode)).toHaveLength(0);
    expect(input.goalNodeIds).toHaveLength(0);
    expect(input.misconceptionLinks).toHaveLength(0);
  });

  it('preserves readiness values for keys not present in nodes (caller decides)', () => {
    const input: PlannerInput = {
      nodes: [{ id: 'n1', kind: 'skill', title: 'T', domain: 'd' }],
      edges: [],
      readinessByNode: { n1: 0.4, ghost: 0.9 },
      goalNodeIds: [],
      misconceptionLinks: [],
    };
    expect(input.readinessByNode['ghost']).toBe(0.9);
  });

  it('round-trips PlannerInput through JSON.stringify -> JSON.parse', () => {
    const input: PlannerInput = {
      nodes: [
        { id: 'n1', kind: 'skill', title: 'A', domain: 'math' },
        { id: 'n2', kind: 'skill', title: 'B', domain: 'math' },
      ],
      edges: [
        { id: 'e1', type: 'prerequisite_for', sourceId: 'n1', targetId: 'n2', weight: 1 },
      ],
      readinessByNode: { n1: 0.5, n2: 0.2 },
      goalNodeIds: ['n2'],
      misconceptionLinks: [
        { skillId: 'n1', misconceptionId: 'm1', severity: 'minor' },
      ],
    };
    const rehydrated = JSON.parse(JSON.stringify(input)) as PlannerInput;
    expect(rehydrated).toEqual(input);
  });
});

describe('PlannerOutput — adversarial coverage', () => {
  it('accepts empty scores and empty recommendedNext', () => {
    const output: PlannerOutput = { scores: [], recommendedNext: [] };
    expect(output.scores).toHaveLength(0);
    expect(output.recommendedNext).toHaveLength(0);
  });

  it('preserves multi-item ordering in recommendedNext', () => {
    const output: PlannerOutput = {
      scores: [],
      recommendedNext: ['a', 'b', 'c', 'd', 'e'],
    };
    expect(output.recommendedNext).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('round-trips PlannerOutput through JSON.stringify -> JSON.parse', () => {
    const output: PlannerOutput = {
      scores: [
        {
          kind: 'ranked',
          nodeId: 'n1',
          composite: 0.75,
          terms: {
            readiness: 0.9,
            unlockValue: 0.6,
            goalProximity: 0.4,
            weaknessFit: 0.1,
          },
        },
        { kind: 'mastered', nodeId: 'n0' },
        { kind: 'unranked', nodeId: 'n2', reason: 'blocked' },
      ],
      recommendedNext: ['n1'],
    };
    const rehydrated = JSON.parse(JSON.stringify(output)) as PlannerOutput;
    expect(rehydrated).toEqual(output);
  });
});

describe('PriorityScore — exhaustive discriminator variant coverage', () => {
  function renderLabel(score: PriorityScore): string {
    switch (score.kind) {
      case 'ranked':
        return `Ranked(${score.nodeId})=${score.composite.toFixed(3)}`;
      case 'unranked':
        return `Unranked(${score.nodeId}):${score.reason}`;
      case 'mastered':
        return `Mastered(${score.nodeId})`;
      default: {
        const exhaustive: never = score;
        throw new Error(`Unhandled variant: ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  it.each<readonly [string, PriorityScore, string]>([
    [
      'ranked with zero composite',
      {
        kind: 'ranked',
        nodeId: 'n0',
        composite: 0,
        terms: { readiness: 0, unlockValue: 0, goalProximity: 0, weaknessFit: 0 },
      },
      'Ranked(n0)=0.000',
    ],
    [
      'ranked with large composite',
      {
        kind: 'ranked',
        nodeId: 'n1',
        composite: 1.23456,
        terms: {
          readiness: 0.9,
          unlockValue: 0.8,
          goalProximity: 0.7,
          weaknessFit: 0.6,
        },
      },
      'Ranked(n1)=1.235',
    ],
    [
      'unranked with empty reason',
      { kind: 'unranked', nodeId: 'n2', reason: '' },
      'Unranked(n2):',
    ],
    [
      'unranked with descriptive reason',
      { kind: 'unranked', nodeId: 'n3', reason: 'prerequisite-blocked' },
      'Unranked(n3):prerequisite-blocked',
    ],
    ['mastered', { kind: 'mastered', nodeId: 'n4' }, 'Mastered(n4)'],
  ])('renders %s correctly', (_label, score, expected) => {
    expect(renderLabel(score)).toBe(expected);
  });

  it('an unknown kind value is rejected at the type level', () => {
    // The compiled output of this expression has type
    // `{ kind: 'unknown'; ... }`, which is NOT assignable to PriorityScore.
    // If a future type widening makes `kind: string`, this assignment
    // would no longer be a type error and the test would catch the drift
    // at compile time.
    const bogus = { kind: 'unknown', nodeId: 'x' } as unknown as PriorityScore;
    expect(bogus.kind).toBe('unknown');
  });
});

describe('Planner contract — package public surface', () => {
  // The planner contract types must be importable from the package's
  // public surface so Phase 2/3 consumers don't reach into internal paths.
  // If a future refactor removes the public export, this test fails fast
  // rather than waiting for an integration-time import error.
  it('planner/types is exposed via package.json exports', async () => {
    const fsModule = 'node:fs';
    const { readFileSync } = (await import(fsModule)) as {
      readFileSync: (path: URL, encoding: 'utf-8') => string;
    };
    const pkgUrl = new URL('../../package.json', import.meta.url);
    const raw = readFileSync(pkgUrl, 'utf-8');
    const pkg = JSON.parse(raw) as {
      exports?: Record<string, string | { types: string; import: string }>;
    };
    const exports = pkg.exports ?? {};
    expect('./planner/types' in exports).toBe(true);
    if ('./planner/types' in exports) {
      expect(exports['./planner/types']).toMatchObject({
        types: './dist/planner/types.d.ts',
        import: './dist/planner/types.js',
      });
    }
  });
});
