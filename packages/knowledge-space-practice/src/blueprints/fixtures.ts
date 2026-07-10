// Synthetic fixtures for testing only
// No real math/GSE data — uses synthetic node IDs from syntheticMathFixture and syntheticEnglishGseFixture

import type {
  KnowledgeBlueprint,
  GeneratorOutput,
} from './types.js';

// ---------------------------------------------------------------------------
// Algebraic blueprint — factoring skill
// ---------------------------------------------------------------------------

export const syntheticAlgebraicBlueprint: KnowledgeBlueprint = {
  nodeId: 'math.im3.task-blueprint.m1.l2.factoring-drill',
  sourceNodeIds: [
    'math.im3.skill.m1.l2.solve-quadratic-by-factoring',
    'math.im3.workout-example.m1.l2.factoring-basic',
  ],
  alignmentNodeIds: [
    'math.im3.standard.ccss.hsa.rei.b.4b',
  ],
  rendererKey: 'algebraic-solver',
  rendererModeMap: {
    worked: 'algebraic-solver',
    guidedPractice: 'algebraic-solver',
    independentPractice: 'algebraic-solver',
  },
  workedExampleSpec: {
    prompt: 'Factor x^2 + 5x + 6',
    givens: ['x^2 + 5x + 6'],
    target: { factoredForm: '(x+2)(x+3)', roots: [-2, -3] },
    steps: [
      {
        description: 'Identify the coefficients: a=1, b=5, c=6',
        expression: 'ax^2 + bx + c',
      },
      {
        description: 'Find two numbers that multiply to ac=6 and add to b=5',
        expression: 'm*n = 6, m+n = 5',
        result: '2, 3',
      },
      {
        description: 'Write the factored form using the two numbers',
        expression: '(x + m)(x + n)',
        result: '(x+2)(x+3)',
      },
    ],
    explanation:
      'We find two numbers that multiply to the constant term (6) and add to the coefficient of x (5). Those numbers are 2 and 3, so the factored form is (x+2)(x+3).',
  },
  guidedPracticeSpec: {
    scaffoldedPrompt:
      'Let\'s factor x^2 + bx + c step by step. First, identify the values of b and c.',
    stepPrompts: [
      'What is the value of b?',
      'What is the value of c?',
      'Find two numbers whose product is c and sum is b.',
      'Write the expression in factored form (x + m)(x + n).',
    ],
    hints: [
      'b is the coefficient of x.',
      'c is the constant term.',
      'List the factor pairs of c.',
      'The factored form uses the two numbers in (x + m)(x + n).',
    ],
    checksPerStep: [
      { check: 'Identify b', answerPattern: '\\d+' },
      { check: 'Identify c', answerPattern: '\\d+' },
      { check: 'Find factor pair' },
      { check: 'Write factored form' },
    ],
    revealPolicy: 'one_at_a_time',
  },
  independentPracticeSpec: {
    variantParameters: {
      a: { type: 'integer', min: 1, max: 10, description: 'Leading coefficient' },
      b: { type: 'integer', min: -20, max: 20, description: 'Linear coefficient' },
      c: { type: 'integer', min: -50, max: 50, description: 'Constant term' },
    },
    generatorInputConstraints: {
      discriminant: { min: 0, description: 'Ensure real rational roots' },
    },
    answerSchema: {
      factoredForm: {},
      roots: {},
    },
    gradingRules: [
      { partId: 'factoredForm', ruleType: 'expression_equivalence', maxScore: 1 },
      { partId: 'roots', ruleType: 'exact_match', maxScore: 1 },
    ],
    replayPolicy: 'any_seed',
  },
  generatorKey: 'algebraic-factoring-gen',
  gradingSpec: {
    partIds: ['factoredForm', 'roots'],
    passingScore: 2,
    partialCredit: true,
    rubric: [
      { criteria: 'Correct factored form', points: 1, partId: 'factoredForm' },
      { criteria: 'Correct roots', points: 1, partId: 'roots' },
    ],
  },
  misconceptionTags: ['sign-error', 'factor-order'],
  reviewStatus: 'draft',
  metadata: {
    domain: 'math.im3',
    difficulty: 0.5,
    bloomsLevel: 'apply',
    practiceMode: 'independent',
    description: 'Synthetic algebraic factoring blueprint for testing',
  },
};

// ---------------------------------------------------------------------------
// Graphing blueprint — coordinate-plane skill
// ---------------------------------------------------------------------------

export const syntheticGraphingBlueprint: KnowledgeBlueprint = {
  nodeId: 'math.im3.task-blueprint.m2.l1.graphing-parabolas',
  sourceNodeIds: [
    'math.im3.skill.m1.l2.identify-roots',
  ],
  alignmentNodeIds: [
    'math.im3.standard.ccss.hsa.rei.b.4b',
  ],
  rendererKey: 'coordinate-plane',
  rendererModeMap: {
    worked: 'coordinate-plane',
    independentPractice: 'coordinate-plane',
  },
  workedExampleSpec: {
    prompt: 'Graph the parabola y = x^2 - 4x + 3',
    givens: ['y = x^2 - 4x + 3'],
    target: { vertex: [2, -1], roots: [1, 3], yIntercept: 3 },
    steps: [
      {
        description: 'Find the vertex using x = -b/(2a) = 4/2 = 2',
        expression: 'x = -b/(2a)',
        result: 'x = 2',
      },
      {
        description: 'Substitute x=2 to find y: y = 4 - 8 + 3 = -1',
        expression: 'y = (2)^2 - 4(2) + 3',
        result: 'y = -1',
      },
      {
        description: 'Plot the vertex at (2, -1)',
      },
      {
        description: 'Find roots by factoring: (x-1)(x-3) = 0 so x = 1 or x = 3',
        expression: '(x-1)(x-3) = 0',
        result: 'x = 1, x = 3',
      },
      {
        description: 'Plot y-intercept at (0, 3) and sketch the parabola',
      },
    ],
    explanation:
      'The vertex form reveals the minimum point, and the roots show where the parabola crosses the x-axis.',
    visualArtifact: {
      type: 'svg',
      viewBox: '-2 -5 8 10',
      elements: [],
    },
  },
  independentPracticeSpec: {
    variantParameters: {
      a: { type: 'integer', min: 1, max: 5, description: 'Coefficient of x^2' },
      b: { type: 'integer', min: -10, max: 10, description: 'Coefficient of x' },
      c: { type: 'integer', min: -20, max: 20, description: 'Constant term' },
    },
    answerSchema: {
      vertex: {},
      roots: {},
      yIntercept: {},
    },
    gradingRules: [
      { partId: 'vertex', ruleType: 'exact_match', maxScore: 1 },
      { partId: 'roots', ruleType: 'numeric_tolerance', tolerance: 0.01, maxScore: 1 },
      { partId: 'yIntercept', ruleType: 'exact_match', maxScore: 1 },
    ],
    replayPolicy: 'unique_seeds',
  },
  generatorKey: 'graphing-parabola-gen',
  gradingSpec: {
    partIds: ['vertex', 'roots', 'yIntercept'],
    passingScore: 3,
    partialCredit: true,
  },
  misconceptionTags: ['vertex-sign-error', 'root-order'],
  reviewStatus: 'draft',
  metadata: {
    domain: 'math.im3',
    difficulty: 0.6,
    rendererType: 'graphing-explorer',
    description: 'Synthetic coordinate-plane graphing blueprint for testing',
  },
};

// ---------------------------------------------------------------------------
// English/GSE-style blueprint — reading comprehension skill
// ---------------------------------------------------------------------------

export const syntheticEnglishBlueprint: KnowledgeBlueprint = {
  nodeId: 'english.gse.blueprint.b1.main-idea',
  sourceNodeIds: [
    'english.gse.skill.b1.reading.identify-main-idea.short-text',
  ],
  alignmentNodeIds: [],
  rendererKey: 'reading-passage',
  rendererModeMap: {
    worked: 'reading-passage',
    guidedPractice: 'reading-passage',
    independentPractice: 'reading-passage',
  },
  workedExampleSpec: {
    prompt: 'Read the passage and identify the main idea.',
    givens: [
      'The Amazon rainforest is home to millions of species. Many of these animals are found nowhere else on Earth. Scientists continue to discover new species in the rainforest each year.',
    ],
    target: {
      mainIdea: 'The Amazon rainforest contains unique biodiversity that scientists are still discovering.',
    },
    steps: [
      {
        description: 'Read the passage carefully.',
      },
      {
        description: 'Identify the topic: The Amazon rainforest.',
        result: 'Topic: Amazon rainforest',
      },
      {
        description: 'Ask: What is the author saying about the topic?',
        explanation: 'The author emphasizes the unique species and ongoing scientific discoveries.',
      },
      {
        description: 'Combine the topic and main point into one sentence.',
        result: 'Main idea: The Amazon rainforest contains unique biodiversity.',
      },
    ],
    explanation:
      'The main idea combines the topic (Amazon rainforest) with the author\'s primary point about it (its unique biodiversity).',
  },
  guidedPracticeSpec: {
    scaffoldedPrompt:
      'Let\'s identify the main idea together. First, read the passage and tell me what the general topic is.',
    stepPrompts: [
      'What is the topic of the passage?',
      'What details does the author provide about this topic?',
      'What is the single most important idea the author wants you to know?',
    ],
    hints: [
      'Look for the word or phrase that appears most often.',
      'Focus on what is unique or important about the topic.',
      'Try to summarize the passage in one sentence.',
    ],
    checksPerStep: [
      { check: 'Identify topic' },
      { check: 'List supporting details' },
      { check: 'State main idea' },
    ],
    revealPolicy: 'after_attempt',
  },
  independentPracticeSpec: {
    variantParameters: {
      passageLength: { type: 'enum', options: ['short', 'medium'], description: 'Length of reading passage' },
      topicDomain: { type: 'enum', options: ['science', 'history', 'arts'], description: 'Subject area of passage' },
      cefrLevel: { type: 'enum', options: ['A2', 'B1', 'B2'], description: 'CEFR difficulty level' },
    },
    answerSchema: {
      mainIdea: {},
    },
    gradingRules: [
      { partId: 'mainIdea', ruleType: 'custom', maxScore: 2 },
    ],
    replayPolicy: 'uniq_seeds_per_learner',
  },
  generatorKey: 'reading-comp-gen',
  gradingSpec: {
    partIds: ['mainIdea'],
    passingScore: 1,
    partialCredit: true,
    rubric: [
      { criteria: 'Identifies the correct topic', points: 1, partId: 'mainIdea' },
      { criteria: 'Captures the author\'s main point', points: 1, partId: 'mainIdea' },
    ],
  },
  reviewStatus: 'draft',
  metadata: {
    domain: 'english.gse',
    cefr: 'B1',
    gseRange: '43-50',
    modality: 'reading',
    languageFunction: 'comprehension',
    description: 'Synthetic English/GSE reading comprehension blueprint for testing',
  },
};

// ---------------------------------------------------------------------------
// Synthetic generator output — from a deterministic generator
// ---------------------------------------------------------------------------

export const syntheticGeneratorOutput: GeneratorOutput = {
  prompt: 'Factor the quadratic expression: x^2 + 7x + 12',
  data: {
    a: 1,
    b: 7,
    c: 12,
    discriminant: 1,
    root1: -3,
    root2: -4,
  },
  expectedAnswer: {
    factoredForm: '(x+3)(x+4)',
    roots: [-3, -4],
  },
  solutionSteps: [
    {
      description: 'Find two numbers that multiply to 12 and add to 7',
      expression: 'm * n = 12, m + n = 7',
    },
    {
      description: 'The numbers are 3 and 4',
      value: { m: 3, n: 4 },
    },
    {
      description: 'Write the factored form (x + m)(x + n) = (x+3)(x+4)',
      expression: '(x+3)(x+4)',
    },
  ],
  gradingMetadata: {
    partAnswers: {
      factoredForm: '(x+3)(x+4)',
      roots: [-3, -4],
    },
    partMaxScores: {
      factoredForm: 1,
      roots: 1,
    },
    partGradingRules: {
      factoredForm: 'expression_equivalence',
      roots: 'exact_match',
    },
    partTolerances: {
      roots: 0.001,
    },
  },
};
