import { describe, it, expect } from 'vitest';
import { annotateNextSkillPath } from '../transfer-eligibility.js';
import type {
  TransferEligibleSkill,
  AnnotatedPathEntry,
  NextSkillPathItem,
} from '../transfer-eligibility.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEligible(skillId: string, sourceCourse: string): TransferEligibleSkill {
  return {
    skillId,
    eligible: true,
    sourceCourse,
    seededMastery: 0.76,
    componentId: 'eq-001',
    componentMastery: 0.95,
    reason: 'transfer-credit',
  };
}

function makeIneligible(skillId: string): TransferEligibleSkill {
  return {
    skillId,
    eligible: false,
    reason: 'insufficient-mastery',
  };
}

function makePathItem(skillId: string, extras: Record<string, unknown> = {}): NextSkillPathItem {
  return { skillId, ...extras };
}

// ---------------------------------------------------------------------------
// annotateNextSkillPath
// ---------------------------------------------------------------------------

describe('annotateNextSkillPath', () => {
  it('returns an empty array for an empty path', () => {
    expect(annotateNextSkillPath([], [])).toEqual([]);
  });

  it('flags an eligible entry with transferEligible: true and source course', () => {
    const path = [makePathItem('math.im3.skill.solve-quadratic')];
    const eligibility = [makeEligible('math.im3.skill.solve-quadratic', 'math.im2')];
    const result = annotateNextSkillPath(path, eligibility);

    expect(result).toHaveLength(1);
    expect(result[0].skillId).toBe('math.im3.skill.solve-quadratic');
    expect(result[0].transferEligible).toBe(true);
    expect(result[0].sourceCourse).toBe('math.im2');
    expect(result[0].seededMastery).toBe(0.76);
  });

  it('flags an ineligible entry with transferEligible: false and no sourceCourse', () => {
    const path = [makePathItem('math.im3.skill.factored-form')];
    const eligibility = [makeIneligible('math.im3.skill.factored-form')];
    const result = annotateNextSkillPath(path, eligibility);

    expect(result).toHaveLength(1);
    expect(result[0].skillId).toBe('math.im3.skill.factored-form');
    expect(result[0].transferEligible).toBe(false);
    expect(result[0].sourceCourse).toBeUndefined();
  });

  it('preserves extra path fields on the output entries', () => {
    const path = [
      makePathItem('math.im3.skill.solve-quadratic', {
        readiness: 0.92,
        readinessState: 'ready',
        lessonId: 'lesson-1',
      }),
    ];
    const eligibility = [makeEligible('math.im3.skill.solve-quadratic', 'math.im2')];
    const result = annotateNextSkillPath(path, eligibility);

    expect(result[0]).toMatchObject({
      skillId: 'math.im3.skill.solve-quadratic',
      readiness: 0.92,
      readinessState: 'ready',
      lessonId: 'lesson-1',
      transferEligible: true,
    });
  });

  it('extracts the source course as the first two dot-separated segments (AD9)', () => {
    const path = [makePathItem('math.im3.skill.precalc-prep')];
    const eligibility = [
      makeEligible('math.im3.skill.precalc-prep', 'math.precalc'),
    ];
    const result = annotateNextSkillPath(path, eligibility);

    expect(result[0].sourceCourse).toBe('math.precalc');
  });

  it('handles a path with all eligible and all ineligible entries', () => {
    const path = [
      makePathItem('math.im3.skill.solve-quadratic'),
      makePathItem('math.im3.skill.factored-form'),
      makePathItem('math.im3.skill.vertex-form'),
    ];
    const eligibility = [
      makeEligible('math.im3.skill.solve-quadratic', 'math.im2'),
      makeIneligible('math.im3.skill.factored-form'),
      makeEligible('math.im3.skill.vertex-form', 'math.im2'),
    ];
    const result = annotateNextSkillPath(path, eligibility);

    expect(result).toHaveLength(3);
    const byId = new Map(result.map((r) => [r.skillId, r]));

    expect(byId.get('math.im3.skill.solve-quadratic')?.transferEligible).toBe(true);
    expect(byId.get('math.im3.skill.factored-form')?.transferEligible).toBe(false);
    expect(byId.get('math.im3.skill.vertex-form')?.transferEligible).toBe(true);
    expect(byId.get('math.im3.skill.vertex-form')?.sourceCourse).toBe('math.im2');
  });

  it('flags an unknown path skill as not eligible when no eligibility record exists (AD10)', () => {
    const path = [makePathItem('math.im3.skill.unknown')];
    const result = annotateNextSkillPath(path, []);

    expect(result).toHaveLength(1);
    expect(result[0].skillId).toBe('math.im3.skill.unknown');
    expect(result[0].transferEligible).toBe(false);
    expect(result[0].sourceCourse).toBeUndefined();
  });

  it('does not mutate the input path (AD13)', () => {
    const path = [makePathItem('math.im3.skill.solve-quadratic', { readiness: 0.9 })];
    const eligibility = [makeEligible('math.im3.skill.solve-quadratic', 'math.im2')];
    const snapshot = JSON.stringify(path);

    annotateNextSkillPath(path, eligibility);

    expect(JSON.stringify(path)).toBe(snapshot);
  });

  it('does not mutate the input eligibility list (AD13)', () => {
    const path = [makePathItem('math.im3.skill.solve-quadratic')];
    const eligibility = [makeEligible('math.im3.skill.solve-quadratic', 'math.im2')];
    const snapshot = JSON.stringify(eligibility);

    annotateNextSkillPath(path, eligibility);

    expect(JSON.stringify(eligibility)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Boundary — source imports
// ---------------------------------------------------------------------------

describe('transfer-eligibility boundary', () => {
  it('module source does not import from apps/ or convex/_generated/', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const sourcePath = resolve(__dirname, '../transfer-eligibility.ts');
    const content = readFileSync(sourcePath, 'utf-8');

    const forbidden = [
      /from\s+['"]apps\//,
      /from\s+['"]\.\.\/\.\.\/apps\//,
      /from\s+['"]convex\/_generated/,
      /from\s+['"]@math-platform\/math-content/,
      /from\s+['"]packages\/math-content/,
      /from\s+['"]\.\.\/math-content/,
      /from\s+['"]curriculum\//,
      /from\s+['"]packages\/srs-engine/,
      /from\s+['"]@math-platform\/srs-engine/,
    ];

    for (const pattern of forbidden) {
      expect(pattern.test(content)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Compile-time type assertions
// ---------------------------------------------------------------------------

function _typeChecks() {
  const _pathItem: NextSkillPathItem = { skillId: 'math.im3.skill.foo' };
  const _annotated: AnnotatedPathEntry | undefined = undefined;
  void _pathItem;
  void _annotated;
}
void _typeChecks;
