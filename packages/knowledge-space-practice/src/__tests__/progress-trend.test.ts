/**
 * Phase 3 — progressTrend Fix (kst-lesser-holes_20260521).
 *
 * Drives `projectParentVisualization` with synthetic `ProgressTrendHistory`
 * snapshots and asserts the new time-delta trend computation:
 *
 *   - count grew over the 7-day window  → 'improving'
 *   - count unchanged                   → 'stable'
 *   - count shrank                      → 'declining'
 *   - fewer than 2 snapshots in window  → 'unknown'
 *   - totalSkillNodes === 0 (regression → 'unknown')
 *
 * The fourth arg to `projectParentVisualization` is the new
 * `history: ProgressTrendHistory` input. At HEAD the function signature has
 * three parameters and ignores any extra positional argument at runtime, so
 * the static-ratio code path runs and the new contract-gap assertions fail
 * (the static ratio mislabels a beginner as 'declining' and labels a flat
 * history as 'improving' or 'stable' depending on the static ratio).
 *
 * These are LIVE-BEHAVIOR tests against `projectParentVisualization` — the
 * end-to-end parent-viz payload, not an internal helper. The parent
 * `parentVisualizationV1Schema` regression is also asserted so the
 * `unknown` branch does not break downstream Zod consumers.
 */
import { describe, it, expect } from 'vitest';
import { syntheticMathFixture } from '@reading-advantage/knowledge-space-core';
import type { KnowledgeSpaceNode, KnowledgeSpaceEdge } from '@reading-advantage/knowledge-space-core';

import { projectParentVisualization } from '../projections/visualization.js';
import { parentVisualizationV1Schema } from '../projections/schemas.js';

import {
  improvingHistory,
  flatHistory,
  decliningHistory,
  insufficientHistory,
  singleSnapshotHistory,
} from './progressTrendFixtures.js';

const nodes: KnowledgeSpaceNode[] = syntheticMathFixture.nodes;
const edges: KnowledgeSpaceEdge[] = syntheticMathFixture.edges;

describe('progressTrend time-delta (FR3)', () => {
  describe('Improving history', () => {
    it('returns progressTrend "improving" when mastered count grew over the window', () => {
      // learnerState has zero mastered skills so the static-ratio path would
      // return 'declining' (0 / 3 = 0.0 < 0.3). The time-delta must read the
      // history and return 'improving' regardless of the current snapshot.
      const learnerState: Record<string, string> = {};

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        improvingHistory,
      );

      expect(viz.progressTrend).toBe('improving');
    });

    it('parent viz payload still passes the v1 Zod schema (improving branch)', () => {
      const learnerState: Record<string, string> = {};

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        improvingHistory,
      );

      const result = parentVisualizationV1Schema.safeParse(viz);
      expect(result.success).toBe(true);
    });
  });

  describe('Flat history', () => {
    it('returns progressTrend "stable" when mastered count is unchanged over the window', () => {
      // learnerState has zero mastered skills so the static-ratio path would
      // return 'declining' (0 / 3 = 0.0 < 0.3). The time-delta must read the
      // history (delta = 0) and return 'stable' regardless of the current
      // snapshot.
      const learnerState: Record<string, string> = {};

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        flatHistory,
      );

      expect(viz.progressTrend).toBe('stable');
    });

    it('ignores mastered ids outside the visualized knowledge-space graph', () => {
      const learnerState: Record<string, string> = {};
      const historyWithExternalGrowth = flatHistory.map((snapshot, index) => ({
        ...snapshot,
        masteredNodeIds:
          index === 0
            ? snapshot.masteredNodeIds
            : [...snapshot.masteredNodeIds, 'external.skill.not-in-this-graph'],
      }));

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        historyWithExternalGrowth,
      );

      expect(viz.progressTrend).toBe('stable');
    });
  });

  describe('Declining history', () => {
    it('returns progressTrend "declining" when mastered count shrank over the window', () => {
      // learnerState has both skills + the task_blueprint mastered, so the
      // static-ratio path would return 'improving' (3 / 3 = 1.0 >= 0.7). The
      // time-delta must read the history (delta = -1) and return 'declining'
      // regardless of the current snapshot.
      const learnerState: Record<string, string> = {
        'math.im3.skill.m1.l2.identify-roots': 'mastered',
        'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'mastered',
        'math.im3.task-blueprint.m1.l2.factoring-drill': 'mastered',
      };

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        decliningHistory,
      );

      expect(viz.progressTrend).toBe('declining');
    });
  });

  describe('Insufficient history', () => {
    it('returns progressTrend "unknown" when the history array is empty', () => {
      // learnerState has every skill mastered, so the static-ratio path would
      // return 'improving' (3 / 3 = 1.0). The new contract says the trend
      // cannot be computed without >= 2 snapshots in the window — return
      // 'unknown'.
      const learnerState: Record<string, string> = {
        'math.im3.skill.m1.l2.identify-roots': 'mastered',
        'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'mastered',
        'math.im3.task-blueprint.m1.l2.factoring-drill': 'mastered',
      };

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        insufficientHistory,
      );

      expect(viz.progressTrend).toBe('unknown');
    });

    it('returns progressTrend "unknown" when the history has a single snapshot (no delta possible)', () => {
      const learnerState: Record<string, string> = {
        'math.im3.skill.m1.l2.identify-roots': 'mastered',
        'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'mastered',
        'math.im3.task-blueprint.m1.l2.factoring-drill': 'mastered',
      };

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        singleSnapshotHistory,
      );

      expect(viz.progressTrend).toBe('unknown');
    });
  });

  describe('Static-ratio bug fix (FR3 acceptance criterion)', () => {
    it('returns progressTrend "unknown" for a beginner with no history (was mislabeled "declining" by the static ratio)', () => {
      const learnerState: Record<string, string> = {};

      const viz = projectParentVisualization(
        nodes,
        edges,
        learnerState,
        insufficientHistory,
      );

      expect(viz.progressTrend).toBe('unknown');
    });
  });

  describe('Regression — totalSkillNodes === 0', () => {
    it('returns progressTrend "unknown" when the knowledge space has no skill nodes (existing branch must still pass)', () => {
      const learnerState: Record<string, string> = {};

      const viz = projectParentVisualization(
        [] as KnowledgeSpaceNode[],
        [] as KnowledgeSpaceEdge[],
        learnerState,
        improvingHistory,
      );

      expect(viz.progressTrend).toBe('unknown');
    });

    it('empty-graph payload still passes the v1 Zod schema', () => {
      const learnerState: Record<string, string> = {};

      const viz = projectParentVisualization(
        [] as KnowledgeSpaceNode[],
        [] as KnowledgeSpaceEdge[],
        learnerState,
        improvingHistory,
      );

      const result = parentVisualizationV1Schema.safeParse(viz);
      expect(result.success).toBe(true);
    });
  });
});
