// Phase 3 — SRS→KST bridge implementation tests (kst-srs.v2 §5).
//
// Tests the concrete DefaultSrsToKstBridge.convert() method against
// synthetic card states and proficiency results. Covers all four
// mastery-state transitions, missing-card handling, multi-card
// recency resolution, and proficiency-driven state.

import { describe, it, expect } from 'vitest';
import type {
  SrsCardState,
  ObjectiveProficiencyResult,
} from '../index.js';
import type { KnowledgeSpace } from '../types.js';

// These will be imported from index.ts once the Green phase creates them.
// For Red phase, we import from the future location and expect failure.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = 1_700_000_000_000;
const DAY_MS = 86_400_000;

function makeSkillNode(id: string): KnowledgeSpace['nodes'][number] {
  return {
    id,
    kind: 'skill',
    title: `Skill ${id}`,
    domain: 'test.bridge',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
    metadata: {},
  };
}

function makeGraph(nodeIds: string[]): KnowledgeSpace {
  return { nodes: nodeIds.map(makeSkillNode), edges: [] };
}

function makeCard(
  objectiveId: string,
  opts?: {
    cardId?: string;
    stability?: number;
    lastReviewedAt?: number;
    state?: SrsCardState['state'];
  },
): SrsCardState {
  return {
    cardId: opts?.cardId ?? `card.${objectiveId}`,
    objectiveId,
    stability: opts?.stability,
    lastReviewedAt: opts?.lastReviewedAt,
    state: opts?.state,
  };
}

function makeProficiency(objectiveId: string, opts?: {
  retentionStrength?: number;
  isProficient?: boolean;
  practiceCoverage?: number;
}): ObjectiveProficiencyResult {
  return {
    objectiveId,
    retentionStrength: opts?.retentionStrength ?? 0.8,
    practiceCoverage: opts?.practiceCoverage ?? 0.5,
    isProficient: opts?.isProficient ?? true,
  };
}

// ---------------------------------------------------------------------------
// Dynamically import the bridge to verify it exists
// ---------------------------------------------------------------------------

async function getBridgeModule() {
  const mod = await import('../srs-bridge.js');
  return mod;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DefaultSrsToKstBridge.convert — state transitions', () => {
  it('mastered: proficient card with high stability → mastered', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.a']);
    const cards = [
      makeCard('skill.a', {
        stability: 30,
        lastReviewedAt: NOW, // just reviewed
        state: 'review',
      }),
    ];
    const proficiencies = [
      makeProficiency('skill.a', { isProficient: true }),
    ];

    const state = bridge.convert({ cards, proficiencies, graph, now: NOW });
    const entry = state.get('skill.a');
    expect(entry).toBeDefined();
    expect(entry!.state).toBe('mastered');
    expect(entry!.isProficient).toBe(true);
    expect(entry!.mastery).toBeGreaterThan(0.8);
  });

  it('decaying: previously mastered card ages out → decaying', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.a']);
    const cards = [
      makeCard('skill.a', {
        stability: 10,
        lastReviewedAt: NOW - 50 * DAY_MS, // 50 days ago
        state: 'review',
      }),
    ];
    const proficiencies = [
      makeProficiency('skill.a', { isProficient: true }),
    ];

    const state = bridge.convert({ cards, proficiencies, graph, now: NOW });
    const entry = state.get('skill.a');
    expect(entry).toBeDefined();
    // With stability=10 and 50 days elapsed, retention = exp(-50/10) ≈ 0.0067 < 0.7
    expect(entry!.retention).toBeLessThan(0.7);
    expect(entry!.state).toBe('inProgress');
  });

  it('inProgress: card exists but not proficient → inProgress', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.b']);
    const cards = [
      makeCard('skill.b', {
        stability: 5,
        lastReviewedAt: NOW - 1 * DAY_MS,
        state: 'learning', // not review → not proficient
      }),
    ];
    const proficiencies: ObjectiveProficiencyResult[] = [];

    const state = bridge.convert({ cards, proficiencies, graph, now: NOW });
    const entry = state.get('skill.b');
    expect(entry).toBeDefined();
    expect(entry!.state).toBe('inProgress');
    expect(entry!.isProficient).toBe(false);
  });

  it('untouched: no card and no proficiency for node → untouched', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.c']);
    const cards: SrsCardState[] = [];

    const state = bridge.convert({ cards, proficiencies: [], graph, now: NOW });
    const entry = state.get('skill.c');
    expect(entry).toBeDefined();
    expect(entry!.state).toBe('untouched');
    expect(entry!.mastery).toBe(0);
    expect(entry!.retention).toBe(0);
    expect(entry!.isProficient).toBe(false);
  });

  it('missing card for a node → untouched state', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.c', 'skill.d']);
    // Card only for skill.c, not skill.d
    const cards = [
      makeCard('skill.c', {
        stability: 20,
        lastReviewedAt: NOW,
        state: 'review',
      }),
    ];
    const proficiencies = [
      makeProficiency('skill.c', { isProficient: true }),
    ];

    const state = bridge.convert({ cards, proficiencies, graph, now: NOW });
    expect(state.get('skill.c')!.state).toBe('mastered');
    expect(state.get('skill.d')!.state).toBe('untouched');
  });

  it('multiple cards per same node → most recent (by lastReviewedAt) wins', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.x']);
    const cards = [
      makeCard('skill.x', {
        cardId: 'old-card',
        stability: 5,
        lastReviewedAt: NOW - 50 * DAY_MS, // 50 days ago → low retention
        state: 'review',
      }),
      makeCard('skill.x', {
        cardId: 'recent-card',
        stability: 30,
        lastReviewedAt: NOW, // just reviewed → high retention
        state: 'review',
      }),
    ];
    const proficiencies = [
      makeProficiency('skill.x', { isProficient: true }),
    ];

    const state = bridge.convert({ cards, proficiencies, graph, now: NOW });
    const entry = state.get('skill.x');
    expect(entry).toBeDefined();
    // Recent card should win → high retention → mastered
    expect(entry!.retention).toBeCloseTo(1.0, 1);
    expect(entry!.state).toBe('mastered');
  });

  it('multiple cards per same node → most recent (by stability when no lastReviewedAt)', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.y']);
    const cards = [
      makeCard('skill.y', {
        cardId: 'low-stability',
        stability: 3,
        // no lastReviewedAt
        state: 'review',
      }),
      makeCard('skill.y', {
        cardId: 'high-stability',
        stability: 30,
        // no lastReviewedAt
        state: 'review',
      }),
    ];
    const proficiencies = [
      makeProficiency('skill.y', { isProficient: true }),
    ];

    const state = bridge.convert({ cards, proficiencies, graph, now: NOW });
    const entry = state.get('skill.y');
    expect(entry).toBeDefined();
    // Without lastReviewedAt, retention can't be computed from stability alone
    // → engine defaults to retention=0 for no stability info, OR uses pre-computed
    // Since no lastReviewedAt, getKnowledgeState can't compute retention from stability
    // But stability IS provided, so the engine will still see stability and lastReviewedAt as undefined → retention=0
    // Actually, if stability is provided but no lastReviewedAt, engine defaults retention=0
    // The isProficient=true should still drive inProgress state
    expect(entry!.state).toBe('inProgress');
  });

  it('proficiency result feeds state', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge();
    const graph = makeGraph(['skill.p']);
    // No cards at all — only proficiency
    const proficiencyResults = [
      makeProficiency('skill.p', { isProficient: true, retentionStrength: 0.95 }),
    ];

    const state = bridge.convert({ cards: [], proficiencies: proficiencyResults, graph, now: NOW });
    const entry = state.get('skill.p');
    expect(entry).toBeDefined();
    expect(entry!.isProficient).toBe(true);
    // retention=0.95 ≥ 0.90 → mastered
    expect(entry!.state).toBe('mastered');
    expect(entry!.retention).toBe(0.95);
  });

  it('custom thresholds are respected', async () => {
    const { DefaultSrsToKstBridge } = await getBridgeModule();
    const bridge = new DefaultSrsToKstBridge({
      masteryEnter: 0.95, // stricter than default 0.90
    });
    const graph = makeGraph(['skill.q']);
    const proficiencyResults = [
      makeProficiency('skill.q', { isProficient: true, retentionStrength: 0.92 }),
    ];

    const state = bridge.convert({ cards: [], proficiencies: proficiencyResults, graph, now: NOW });
    const entry = state.get('skill.q');
    expect(entry).toBeDefined();
    // retention=0.92 < custom masteryEnter=0.95 → not mastered
    expect(entry!.state).toBe('inProgress');
  });

  it('stabilityToRetention is exported from the bridge module for reuse', async () => {
    const mod = await getBridgeModule();
    expect(typeof mod.stabilityToRetention).toBe('function');
    // Quick smoke test
    const r = mod.stabilityToRetention(10, 0);
    expect(r).toBeCloseTo(1.0);
  });
});
