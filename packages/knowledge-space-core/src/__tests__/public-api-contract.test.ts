import { describe, expect, it } from 'vitest';
import {
  displayLevelSchema,
  knowledgeStateSchema,
  masterySnapshotSchema,
  progressTrendHistorySchema,
  projectDisplayLevel,
  type LevelProjectionFn,
} from '@reading-advantage/knowledge-space-core';
import { progressTrendHistorySchema as progressTrendHistorySubpathSchema } from '@reading-advantage/knowledge-space-core/progress-trend';
import {
  knowledgeStateSchema as knowledgeStateSubpathSchema,
  displayLevelSchema as displayLevelSubpathSchema,
  projectDisplayLevel as projectDisplayLevelSubpath,
  type LevelProjectionFn as LevelProjectionFnSubpath,
} from '@reading-advantage/knowledge-space-core/level-projection';

describe('knowledge-space-core public API — lesser holes Phase 1 contracts', () => {
  it('exports Level Projection schemas, function, and type from the package entrypoint and subpath', () => {
    const state = {
      skills: [
        { nodeId: 'math.im3.skill.alpha', mastery: 1 },
      ],
    };
    const levels = [
      { id: 'level.0', title: 'Level 0', minMastery: 0 },
      { id: 'level.1', title: 'Level 1', minMastery: 0.5 },
    ];

    expect(knowledgeStateSchema.safeParse(state).success).toBe(true);
    expect(knowledgeStateSubpathSchema.safeParse(state).success).toBe(true);
    expect(displayLevelSchema.safeParse(levels).success).toBe(true);
    expect(displayLevelSubpathSchema.safeParse(levels).success).toBe(true);
    expect(typeof projectDisplayLevel).toBe('function');
    expect(typeof projectDisplayLevelSubpath).toBe('function');

    const project: LevelProjectionFn = (input) =>
      input.skills[0]?.mastery === 1 ? 'level.1' : 'level.0';
    expect(project(state)).toBe('level.1');

    const projectSubpath: LevelProjectionFnSubpath = project;
    expect(projectSubpath(state)).toBe('level.1');
  });

  it('exports progressTrend history schemas from the package entrypoint and subpath', () => {
    const snapshot = {
      timestamp: 1_700_000_000_000,
      masteredNodeIds: ['math.im3.skill.alpha'],
    };
    const history = [
      snapshot,
      { timestamp: 1_700_000_060_000, masteredNodeIds: ['math.im3.skill.alpha', 'math.im3.skill.beta'] },
    ];

    expect(masterySnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(progressTrendHistorySchema.safeParse(history).success).toBe(true);
    expect(progressTrendHistorySubpathSchema.safeParse(history).success).toBe(true);
  });

  it('projectDisplayLevel returns a valid level id from the supplied band', () => {
    const state = {
      skills: [
        { nodeId: 'math.im3.skill.alpha', mastery: 0.75 },
        { nodeId: 'math.im3.skill.beta', mastery: 0.85 },
      ],
    };
    const levels = [
      { id: 'beginner', title: 'Beginner', minMastery: 0 },
      { id: 'proficient', title: 'Proficient', minMastery: 0.6 },
      { id: 'advanced', title: 'Advanced', minMastery: 0.9 },
    ];

    const result = projectDisplayLevel(state, levels);
    expect(levels.map((l) => l.id)).toContain(result);
  });

  it('rejects invalid display-level bands through the public API schemas', () => {
    expect(displayLevelSchema.safeParse([]).success).toBe(false);
    expect(displayLevelSchema.safeParse([
      { id: 'dup', title: 'A', minMastery: 0 },
      { id: 'dup', title: 'B', minMastery: 0.5 },
    ]).success).toBe(false);
    expect(displayLevelSchema.safeParse([
      { id: 'a', title: 'A', minMastery: 0.75 },
      { id: 'b', title: 'B', minMastery: 0.5 },
    ]).success).toBe(false);
    expect(displayLevelSubpathSchema.safeParse([]).success).toBe(false);
  });

  it('rejects invalid progressTrend history through the public API schemas', () => {
    expect(progressTrendHistorySchema.safeParse([]).success).toBe(false);
    expect(progressTrendHistorySchema.safeParse([
      { timestamp: 2, masteredNodeIds: ['a'] },
      { timestamp: 1, masteredNodeIds: ['a', 'b'] },
    ]).success).toBe(false);
    expect(progressTrendHistorySchema.safeParse([
      { timestamp: 1, masteredNodeIds: ['a', 'a'] },
    ]).success).toBe(false);
    expect(progressTrendHistorySubpathSchema.safeParse([]).success).toBe(false);
  });
});
