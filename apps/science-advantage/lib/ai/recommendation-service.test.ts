/**
 * Phase 6 Red-phase tests: refactor `lib/ai/recommendation-service.ts`
 * to depend on the shared `@reading-advantage/ai` `AIClient` interface.
 *
 * See `measure/tracks/ai_adapter_package_20260603/plan.md` Phase 6 task 1:
 *   "Write a failing test for the new `RecommendationService` class
 *    (constructor takes `AIClient`; `getRecommendation(input)` calls
 *    `client.generateObject(...)`)."
 *
 * RED expectations on first run (pre-implementation):
 *   - `RecommendationService` is not yet exported from
 *     `./recommendation-service`. Every test in this file fails with the
 *     `Phase 6 RED:` `TypeError` thrown by `resolveRecommendationService`.
 *   - The legacy `generateRecommendation(input)` wrapper is still
 *     exported and must continue to be exported by Green, because
 *     Phase 6 task 3 ("Refactor the existing `generateRecommendation(input)`
 *     exported function into a thin wrapper that calls the service")
 *     requires the public surface to be preserved for the existing
 *     route handler at `app/api/ai/recommendations/route.ts:6`.
 *
 * GREEN expectations after the implementer lands the refactor:
 *   - The new `RecommendationService` class is exported and accepts an
 *     `AIClient` in its constructor.
 *   - `service.getRecommendation(context)` delegates to
 *     `client.generateObject(...)` with the built recommendation prompt
 *     and the Zod `recommendationSchema`.
 *   - The returned `GenerateResult` shape (Phase 6 task 3) preserves
 *     `{ recommendation, modelUsed, fallbackUsed }` so the existing
 *     call sites keep working without edits.
 *   - The Redis cache short-circuits repeat calls (test-strategy §3.5):
 *     two `getRecommendation` calls with the same context invoke
 *     `client.generateObject` exactly once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Stubs so the existing module can load in unit mode.
// ---------------------------------------------------------------------------
// The pre-refactor file imports `ai`, `@ai-sdk/openai`, and `@ai-sdk/google`
// at module top-level. The Red-phase test only needs the module to load so
// the missing-class assertion can run — we never call the legacy code paths.
// `vi.mock` is hoisted by Vitest above the imports below.

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(),
}));

// In-memory replacement for the Redis client used by the recommendation
// cache (lib/platform/cache-adapter.ts: RedisCacheAdapter uses
// `getRedisClient()`). Keeps the cache observable in unit tests and lets
// the Phase 6 cache short-circuit test (test-strategy §3.5) drive a
// `cache.get`/`cache.set` cycle without a live Redis instance.
const inMemoryRedis = new Map<string, { value: string; expiresAt: number }>();
function clearInMemoryRedis(): void {
  inMemoryRedis.clear();
}

vi.mock('@/lib/platform/redis-client', () => ({
  getRedisClient: () => ({
    get: async (key: string) => inMemoryRedis.get(key)?.value ?? null,
    set: async (key: string, value: string, ttlMs: number) => {
      inMemoryRedis.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    del: async (key: string) => {
      inMemoryRedis.delete(key);
    },
    keys: async (pattern: string) => {
      const prefix = pattern.replace('*', '');
      return Array.from(inMemoryRedis.keys()).filter((k) => k.startsWith(prefix));
    },
  }),
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Stub `AIClient` for the new `RecommendationService` constructor.
// ---------------------------------------------------------------------------
// Mirrors the `AIClient` interface (packages/ai/src/types.ts:52) just
// enough for the assertion surface. The real `MockProvider` from
// `@reading-advantage/ai` will replace this in Green; we mock the
// workspace barrel here because `@reading-advantage/ai` is not yet an
// `apps/science-advantage` dependency (that's a Phase 8 task — see
// plan.md Phase 8 task 2 "Add @reading-advantage/ai to dependencies").

interface GenerateObjectCall {
  schema: { parse: (input: unknown) => unknown };
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

class StubAIClient {
  public readonly generateObjectCalls: GenerateObjectCall[] = [];
  public readonly generateImageCalls: unknown[] = [];
  public readonly generateTextCalls: unknown[] = [];

  async generateObject<T>(input: {
    schema: { parse: (input: unknown) => unknown };
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<T> {
    this.generateObjectCalls.push(input);
    // The Green-phase service class is expected to validate the schema
    // before returning; the stub returns the input back so the test
    // can assert the round-trip shape.
    return input.schema.parse({
      recommendedLessonId: 'lesson_stub',
      recommendedLessonSlug: 'stub-lesson',
      lessonTitle: 'Stub Lesson',
      focusStandards: ['MS-PS1-1'],
      reasoning:
        'Stub reasoning string of sufficient length to satisfy the recommendation schema min length of 10 characters.',
      confidence: 'high',
      nextBestAlternatives: [],
    }) as T;
  }

  async generateImage(_input: unknown): Promise<Buffer> {
    this.generateImageCalls.push(_input);
    return Buffer.alloc(0);
  }

  async generateText(_input: unknown): Promise<string> {
    this.generateTextCalls.push(_input);
    return '';
  }
}

vi.mock('@reading-advantage/ai', () => ({
  MockProvider: StubAIClient,
  createTestClient: (overrides?: Record<string, unknown>) => {
    const client = new StubAIClient();
    if (overrides?.generateObject) {
      // honour overrides like the real factory
      (client as unknown as { generateObject: (...args: unknown[]) => Promise<unknown> }).generateObject =
        async () => overrides.generateObject;
    }
    return client;
  },
}));

// ---------------------------------------------------------------------------
// Load the module under test AFTER the mocks are registered.
// ---------------------------------------------------------------------------
import * as serviceModule from './recommendation-service';
import type { RecommendationContext } from './types';

// Shape the new class is expected to satisfy. Kept local so this file
// compiles even when the class is not yet exported — Green must add a
// structurally compatible class.
type RecommendationServiceInstance = {
  getRecommendation: (context: RecommendationContext) => Promise<{
    recommendation: unknown;
    modelUsed: string;
    fallbackUsed: boolean;
  }>;
};
type RecommendationServiceCtor = new (client: StubAIClient) => RecommendationServiceInstance;

function resolveRecommendationService(): RecommendationServiceCtor {
  const ctor = (serviceModule as unknown as {
    RecommendationService?: RecommendationServiceCtor;
  }).RecommendationService;
  if (typeof ctor !== 'function') {
    throw new TypeError(
      'Phase 6 RED: `RecommendationService` is not exported from ' +
        '`apps/science-advantage/lib/ai/recommendation-service.ts`. ' +
        'Green-phase implementer: add a `class RecommendationService` ' +
        'whose constructor takes an `AIClient` from `@reading-advantage/ai` ' +
        'and exposes `getRecommendation(context)` that delegates to ' +
        '`client.generateObject(...)`.',
    );
  }
  return ctor;
}

// ---------------------------------------------------------------------------
// Fixture: minimal valid `RecommendationContext` for the stub path.
// Mirrors the shape produced by `buildRecommendationContext` so the
// service can run end-to-end without a real DB.
// ---------------------------------------------------------------------------
const baseContext: RecommendationContext = {
  traceId: 'rec_test_phase6',
  studentId: 'stu_phase6_test',
  studentHash: 'phase6hash0000',
  studentGrade: 5,
  standardsAlignment: 'NGSS',
  masterySnapshot: [
    {
      standardId: 'std_phase6_1',
      code: 'MS-PS1-1',
      description: 'Atoms and molecules',
      masteryLevel: 0.42,
      evidenceCount: 3,
      lastAssessedAt: '2026-05-01T00:00:00.000Z',
    },
  ],
  masteryVersion: 1714521600000,
  candidateLessons: [
    {
      id: 'lesson_phase6_1',
      slug: 'atoms-and-molecules',
      title: 'Atoms and Molecules',
      lessonType: 'LESSON',
      order: 1,
      gradeLevel: 5,
      standards: [{ id: 'std_phase6_1', code: 'MS-PS1-1' }],
      prerequisites: [],
      completed: false,
    },
  ],
  attemptSummary: {
    attemptId: 'attempt_phase6_1',
    lessonId: 'lesson_phase6_0',
    lessonSlug: 'force-basics',
    lessonTitle: 'Force Basics',
    completedAt: '2026-05-20T12:00:00.000Z',
    scorePercentage: 40,
    questionCount: 5,
    correctCount: 2,
    incorrectStandards: ['MS-PS1-1'],
  },
  curriculumTitle: 'Energy & Motion',
};

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------
describe('Phase 6 — RecommendationService refactor (constructor-injected AIClient)', () => {
  beforeEach(() => {
    clearInMemoryRedis();
  });

  afterEach(() => {
    clearInMemoryRedis();
  });

  it('exports a `RecommendationService` class from ./recommendation-service', () => {
    const exported = (serviceModule as unknown as {
      RecommendationService?: unknown;
    }).RecommendationService;
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('function');
  });

  it('can be constructed with an AIClient instance', () => {
    const RecommendationService = resolveRecommendationService();
    const client = new StubAIClient();
    const service = new RecommendationService(client);

    expect(service).toBeInstanceOf(RecommendationService);
    expect(typeof service.getRecommendation).toBe('function');
  });

  it('getRecommendation() delegates to client.generateObject(...) with the built prompt and schema', async () => {
    const RecommendationService = resolveRecommendationService();
    const client = new StubAIClient();
    const service = new RecommendationService(client);

    const result = await service.getRecommendation(baseContext);

    expect(client.generateObjectCalls).toHaveLength(1);
    const call = client.generateObjectCalls[0];

    // The prompt is built from the context (mirrors buildRecommendationPrompt
    // in prompts/recommendation.ts). Asserting on a few sentinel substrings
    // protects against accidental prompt-shrink in Green.
    expect(call.prompt).toContain('phase6hash0000');
    expect(call.prompt).toContain('Atoms and Molecules');
    expect(call.prompt).toContain('MS-PS1-1');
    expect(call.prompt).toContain('Energy & Motion');

    // The schema argument must be a Zod-shaped parser (safeParse + parse).
    expect(typeof call.schema).toBe('object');
    expect(typeof call.schema.parse).toBe('function');

    // The wrapper preserves the legacy `GenerateResult` shape so the
    // route handler at app/api/ai/recommendations/route.ts keeps working
    // (Phase 6 task 3).
    expect(result).toMatchObject({
      recommendation: {
        recommendedLessonId: 'lesson_stub',
        recommendedLessonSlug: 'stub-lesson',
        lessonTitle: 'Stub Lesson',
        focusStandards: ['MS-PS1-1'],
        confidence: 'high',
      },
      modelUsed: expect.any(String),
      fallbackUsed: false,
    });
  });

  it('short-circuits the Redis cache on repeat calls (test-strategy §3.5)', async () => {
    const RecommendationService = resolveRecommendationService();
    const client = new StubAIClient();
    const service = new RecommendationService(client);

    await service.getRecommendation(baseContext);
    expect(client.generateObjectCalls).toHaveLength(1);

    // Second call with the same context must hit the cache; the AI
    // client must NOT be invoked a second time.
    await service.getRecommendation(baseContext);
    expect(client.generateObjectCalls).toHaveLength(1);
  });

  it('preserves the legacy `generateRecommendation(input)` public API (Phase 6 task 3)', async () => {
    const exported = (serviceModule as unknown as {
      generateRecommendation?: unknown;
    }).generateRecommendation;
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('function');
  });
});
