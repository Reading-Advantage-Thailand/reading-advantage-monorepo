// Synthetic projection fixtures for testing only
// Uses synthetic placeholder content; no proprietary maps, descriptors, or curriculum data.

import { syntheticMathFixture, syntheticEnglishGseFixture } from '@reading-advantage/knowledge-space-core';
import type { KnowledgeBlueprint } from '../blueprints/index.js';

export { syntheticMathFixture as syntheticMathKnowledgeSpace };
export { syntheticEnglishGseFixture as syntheticEnglishGseKnowledgeSpace };

export const syntheticBlueprint: KnowledgeBlueprint = {
  nodeId: 'math.im3.task-blueprint.m1.l2.factoring-drill',
  sourceNodeIds: [
    'math.im3.skill.m1.l2.solve-quadratic-by-factoring',
  ],
  alignmentNodeIds: [
    'math.im3.standard.ccss.hsa.rei.b.4b',
  ],
  rendererKey: 'step-by-step-solver',
  rendererModeMap: { independentPractice: 'step-by-step-solver' },
  independentPracticeSpec: {
    variantParameters: {
      a: { type: 'integer', min: 1, max: 10, description: 'Coefficient a' },
    },
    answerSchema: { factoredForm: {} },
    gradingRules: [{ partId: 'factoredForm', ruleType: 'expression_equivalence', maxScore: 1 }],
    replayPolicy: 'any_seed',
  },
  generatorKey: 'quadratic-factoring',
  reviewStatus: 'draft',
  metadata: { domain: 'math.im3', difficulty: 0.5 },
};

export const syntheticEnglishBlueprintProjection: KnowledgeBlueprint = {
  nodeId: 'english.gse.skill.b1.reading.identify-main-idea.short-text',
  sourceNodeIds: [],
  alignmentNodeIds: [],
  rendererKey: 'comprehension-quiz',
  rendererModeMap: { independentPractice: 'comprehension-quiz' },
  independentPracticeSpec: {
    variantParameters: {
      passageLength: { type: 'enum', options: ['short'], description: 'Passage length' },
    },
    answerSchema: { answer: {} },
    gradingRules: [{ partId: 'answer', ruleType: 'exact_match', maxScore: 1 }],
    replayPolicy: 'any_seed',
  },
  reviewStatus: 'draft',
  metadata: { domain: 'english.gse', difficulty: 0.4 },
};

export const syntheticLearnerState: Record<
  string,
  'mastered' | 'ready' | 'blocked' | 'review_due'
> = {
  'math.im3.skill.m1.l2.identify-roots': 'mastered',
  'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'ready',
};
