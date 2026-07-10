import { describe, it, expect, vi } from 'vitest';
import {
  resolveEquivalenceComponent,
  aggregateComponentMastery,
} from '../transfer-credit.js';
import type { EquivalenceComponent } from '../cross-course-equivalence.js';
import type { KnowledgeStateEntry } from '../mastery-state.js';
import * as engine from '../knowledge-state-engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponent(
  componentId: string,
  nodeIds: string[],
): EquivalenceComponent {
  const courses = [...new Set(nodeIds.map(courseFromId))].sort();
  return {
    componentId,
    nodeIds: [...nodeIds].sort(),
    courses,
    edges: [],
  };
}

function courseFromId(nodeId: string): string {
  return nodeId.split('.').slice(0, 2).join('.');
}

function makeEntry(
  nodeId: string,
  mastery: number,
  retention: number,
): KnowledgeStateEntry {
  return {
    nodeId,
    mastery,
    retention,
    isProficient: mastery >= 0.9,
    state: mastery >= 0.9 ? 'mastered' : 'inProgress',
  };
}

// ---------------------------------------------------------------------------
// Equivalence component resolution
// ---------------------------------------------------------------------------

describe('resolveEquivalenceComponent', () => {
  it('returns the component containing the requested skill id', () => {
    const comp = makeComponent('eq-001', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const result = resolveEquivalenceComponent(
      'math.im3.skill.solve-quadratic',
      [comp],
    );
    expect(result).toBeDefined();
    expect(result?.componentId).toBe('eq-001');
  });

  it('returns undefined for a skill not present in any component', () => {
    const comp = makeComponent('eq-001', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    expect(
      resolveEquivalenceComponent('math.im1.skill.unknown', [comp]),
    ).toBeUndefined();
  });

  it('returns undefined when components array is empty', () => {
    expect(
      resolveEquivalenceComponent('math.im3.skill.solve-quadratic', []),
    ).toBeUndefined();
  });

  it('does not mutate the components array or its members', () => {
    const comp = makeComponent('eq-001', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const snapshot = JSON.stringify([comp]);
    resolveEquivalenceComponent('math.im3.skill.solve-quadratic', [comp]);
    expect(JSON.stringify([comp])).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Component mastery aggregation
// ---------------------------------------------------------------------------

describe('aggregateComponentMastery', () => {
  it('returns componentId, mastery, retention, contributingNodeIds and courses', () => {
    const comp = makeComponent('eq-001', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const state = new Map<string, KnowledgeStateEntry>([
      ['math.im2.skill.solve-quadratic', makeEntry('math.im2.skill.solve-quadratic', 0.95, 0.92)],
      ['math.im3.skill.solve-quadratic', makeEntry('math.im3.skill.solve-quadratic', 0.85, 0.80)],
    ]);

    const result = aggregateComponentMastery(comp, state);

    expect(result.componentId).toBe('eq-001');
    expect(result.mastery).toBeCloseTo(0.9, 5);
    expect(result.retention).toBeCloseTo(0.86, 5);
    expect(result.courses).toEqual(['math.im2', 'math.im3']);
    expect(result.contributingNodeIds.sort()).toEqual([
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
  });

  it('aggregates cross-course members', () => {
    const comp = makeComponent('eq-002', [
      'math.im1.skill.factor-quadratic',
      'math.im2.skill.factor-quadratic',
      'math.im3.skill.factor-quadratic',
    ]);
    const state = new Map<string, KnowledgeStateEntry>([
      ['math.im1.skill.factor-quadratic', makeEntry('math.im1.skill.factor-quadratic', 0.8, 0.78)],
      ['math.im2.skill.factor-quadratic', makeEntry('math.im2.skill.factor-quadratic', 0.9, 0.88)],
      ['math.im3.skill.factor-quadratic', makeEntry('math.im3.skill.factor-quadratic', 0.7, 0.65)],
    ]);

    const result = aggregateComponentMastery(comp, state);
    expect(result.mastery).toBeCloseTo(0.8, 5);
    expect(result.retention).toBeCloseTo(0.77, 5);
    expect(result.courses).toEqual(['math.im1', 'math.im2', 'math.im3']);
  });

  it('excludes 0-evidence nodes from contributingNodeIds without zeroing the aggregate', () => {
    const comp = makeComponent('eq-003', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
      'math.precalc.skill.solve-quadratic',
    ]);
    const state = new Map<string, KnowledgeStateEntry>([
      ['math.im2.skill.solve-quadratic', makeEntry('math.im2.skill.solve-quadratic', 0.9, 0.9)],
      ['math.im3.skill.solve-quadratic', makeEntry('math.im3.skill.solve-quadratic', 0.7, 0.7)],
    ]);

    const result = aggregateComponentMastery(comp, state);
    expect(result.mastery).toBeCloseTo(0.8, 5);
    expect(result.contributingNodeIds).not.toContain(
      'math.precalc.skill.solve-quadratic',
    );
    expect(result.contributingNodeIds).toHaveLength(2);
  });

  it('returns a no-mastery result for an empty component', () => {
    const comp = makeComponent('eq-empty', []);
    const state = new Map<string, KnowledgeStateEntry>();

    const result = aggregateComponentMastery(comp, state);
    expect(result.componentId).toBe('eq-empty');
    expect(result.mastery).toBe(0);
    expect(result.retention).toBe(0);
    expect(result.contributingNodeIds).toEqual([]);
    expect(result.courses).toEqual([]);
  });

  it('returns a no-mastery result when the state map has no matching entries', () => {
    const comp = makeComponent('eq-001', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);

    const result = aggregateComponentMastery(comp, new Map());
    expect(result.mastery).toBe(0);
    expect(result.retention).toBe(0);
    expect(result.contributingNodeIds).toEqual([]);
  });

  it('does not call getKnowledgeState — reads from the supplied map only (AD1)', () => {
    const spy = vi
      .spyOn(engine, 'getKnowledgeState')
      .mockImplementation(() => new Map());

    const comp = makeComponent('eq-001', [
      'math.im2.skill.solve-quadratic',
      'math.im3.skill.solve-quadratic',
    ]);
    const state = new Map<string, KnowledgeStateEntry>([
      ['math.im2.skill.solve-quadratic', makeEntry('math.im2.skill.solve-quadratic', 0.9, 0.9)],
      ['math.im3.skill.solve-quadratic', makeEntry('math.im3.skill.solve-quadratic', 0.8, 0.8)],
    ]);

    aggregateComponentMastery(comp, state);
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('does not mutate the input state map or its entries (AD13)', () => {
    const comp = makeComponent('eq-001', [
      'math.im2.skill.solve-quadratic',
    ]);
    const entry = makeEntry('math.im2.skill.solve-quadratic', 0.9, 0.9);
    const state = new Map<string, KnowledgeStateEntry>([
      ['math.im2.skill.solve-quadratic', entry],
    ]);
    const snapshot = JSON.stringify({
      comp,
      state: Array.from(state.entries()),
    });

    aggregateComponentMastery(comp, state);
    expect(
      JSON.stringify({ comp, state: Array.from(state.entries()) }),
    ).toBe(snapshot);
  });
});
