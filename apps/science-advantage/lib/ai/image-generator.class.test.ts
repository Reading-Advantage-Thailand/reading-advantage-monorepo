/**
 * Phase 7 Red-phase tests: refactor `lib/ai/image-generator.ts`
 * to depend on the shared `@reading-advantage/ai` `AIClient` interface.
 *
 * See `measure/tracks/ai_adapter_package_20260603/plan.md` Phase 7:
 *   - Task 1: Write a failing test for the new `ImageGenerator` class
 *     (constructor takes `AIClient`; `generateDiagram(input)` calls
 *     `client.generateImage(...)`).
 *   - Task 2: Remove the `process.env.OPENAI_API_KEY` /
 *     `process.env.GOOGLE_API_KEY` mutation in `ensureApiKey()`.
 *
 * RED expectations on first run (pre-implementation):
 *   - `ImageGenerator` is not yet exported from `./image-generator`.
 *     Every test in this file except the legacy-wrapper-preservation
 *     test fails with the `Phase 7 RED:` `TypeError` thrown by
 *     `resolveImageGenerator`.
 *   - The legacy `generateLessonDiagram(input)` wrapper is still
 *     exported and must continue to be exported by Green, because
 *     Phase 7 task 3 ("Refactor the existing `generateLessonDiagram(input)`
 *     exported function into a thin wrapper") requires the public
 *     surface to be preserved for the existing call site at
 *     `components/features/lesson/blocks/image-block.tsx`.
 *
 * GREEN expectations after the implementer lands the refactor:
 *   - The new `ImageGenerator` class is exported and accepts an
 *     `AIClient` in its constructor.
 *   - `service.generateDiagram(request)` delegates to
 *     `client.generateImage(...)` with the built prompt and the
 *     primary model from `aiImageConfig`, and returns a `Buffer` in
 *     the legacy `GenerateDiagramResult` shape.
 *   - `service.generateDiagram(request)` does NOT mutate
 *     `process.env.OPENAI_API_KEY` or `process.env.GOOGLE_API_KEY`
 *     at call time (test-strategy §3.2 / FR-5).
 *   - Falls back to the secondary model on primary failure.
 *   - The legacy `generateLessonDiagram(input)` wrapper is preserved.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Stubs so the existing module can load in unit mode.
// ---------------------------------------------------------------------------
// The pre-refactor file imports `ai` (for `experimental_generateImage`),
// `sharp` (for image optimization), and `@/lib/observability/logger` (for
// fallback warnings). The Red-phase test only needs the module to load so
// the missing-class assertion can run — we never call the legacy code
// paths. `vi.mock` is hoisted by Vitest above the imports below.

vi.mock('ai', () => ({
  experimental_generateImage: vi.fn(),
}));

// sharp is mocked to no-op (returns a tiny buffer that fits within
// `aiImageConfig.maxBytes`) so the legacy optimizeImage path doesn't
// crash if a test accidentally exercises the legacy wrapper.
const sharpToBuffer = vi.fn();
const sharpResize = vi.fn().mockReturnThis();
const sharpWebp = vi.fn().mockReturnThis();

vi.mock('sharp', () => {
  const sharpMock = vi.fn(() => ({
    resize: sharpResize,
    webp: sharpWebp,
    toBuffer: sharpToBuffer,
  }));
  return { default: sharpMock };
});

vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Stub `AIClient` for the new `ImageGenerator` constructor.
// ---------------------------------------------------------------------------
// Mirrors the `AIClient` interface (`packages/ai/src/types.ts:52`) just
// enough for the assertion surface. The real `MockProvider` from
// `@reading-advantage/ai` will replace this stub in Green; the workspace
// barrel becomes a real dep in Phase 8.

interface GenerateImageCall {
  prompt: string;
  model?: string;
  size?: { width: number; height: number };
  seed?: number;
}

class StubAIClient {
  public readonly generateImageCalls: GenerateImageCall[] = [];
  public readonly generateObjectCalls: unknown[] = [];
  public readonly generateTextCalls: unknown[] = [];

  public imageResponse: Buffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
    'base64',
  );
  public throwOnGenerateImageCount = 0;

  async generateImage(input: GenerateImageCall): Promise<Buffer> {
    this.generateImageCalls.push(input);
    if (this.generateImageCalls.length <= this.throwOnGenerateImageCount) {
      throw new Error('StubAIClient: simulated primary-model failure');
    }
    return this.imageResponse;
  }

  async generateObject(_input: unknown): Promise<unknown> {
    this.generateObjectCalls.push(_input);
    return null;
  }

  async generateText(_input: unknown): Promise<string> {
    this.generateTextCalls.push(_input);
    return '';
  }
}

vi.mock('@reading-advantage/ai', () => ({
  MockProvider: StubAIClient,
  createTestClient: (overrides?: { generateImage?: Buffer }) => {
    const client = new StubAIClient();
    if (overrides?.generateImage) {
      client.imageResponse = overrides.generateImage;
    }
    return client;
  },
}));

// ---------------------------------------------------------------------------
// Set baseline env vars BEFORE the module is imported so `aiImageConfig`
// can parse them at module load time. `vi.hoisted` runs before `vi.mock`
// factories and before the top-level `import './image-generator'`.
// ---------------------------------------------------------------------------
vi.hoisted(() => {
  process.env.GEMINI_API_KEY = 'gemini-key';
  process.env.OPENAI_API_KEY = 'openai-key';
  delete process.env.GOOGLE_API_KEY;
  delete process.env.AI_IMAGE_FALLBACK_MODELS;
});

// ---------------------------------------------------------------------------
// Load the module under test AFTER the mocks are registered.
// ---------------------------------------------------------------------------
import * as imageModule from './image-generator';

// Shape the new class is expected to satisfy. Kept local so this file
// compiles even when the class is not yet exported — Green must add a
// structurally compatible class.
type DiagramRequest = {
  description: string;
  title?: string;
  labels?: string[];
  subjectContext?: string;
  aspectRatio?: '4:3' | '1:1';
};
type GenerateDiagramResult = {
  buffer: Buffer;
  mimeType: string;
  modelUsed: string;
  prompt: string;
  fallbackUsed: boolean;
  sizeBytes: number;
};
type ImageGeneratorInstance = {
  generateDiagram: (request: DiagramRequest) => Promise<GenerateDiagramResult>;
};
type ImageGeneratorCtor = new (client: StubAIClient) => ImageGeneratorInstance;

function resolveImageGenerator(): ImageGeneratorCtor {
  const ctor = (imageModule as unknown as {
    ImageGenerator?: ImageGeneratorCtor;
  }).ImageGenerator;
  if (typeof ctor !== 'function') {
    throw new TypeError(
      'Phase 7 RED: `ImageGenerator` is not exported from ' +
        '`apps/science-advantage/lib/ai/image-generator.ts`. ' +
        'Green-phase implementer: add a `class ImageGenerator` ' +
        'whose constructor takes an `AIClient` from `@reading-advantage/ai` ' +
        'and exposes `generateDiagram(request)` that delegates to ' +
        '`client.generateImage(...)`. Also remove the `process.env` ' +
        'mutation in `ensureApiKey()` (Phase 7 task 2) — the API key is ' +
        'now passed via the `AIClient` constructor.',
    );
  }
  return ctor;
}

// ---------------------------------------------------------------------------
// Fixture: minimal valid `DiagramRequest` for the stub path.
// ---------------------------------------------------------------------------
const baseRequest: DiagramRequest = {
  description: 'Label the layers of the Earth',
  labels: ['crust', 'mantle', 'core'],
  aspectRatio: '4:3',
};

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------
describe('Phase 7 — ImageGenerator refactor (constructor-injected AIClient)', () => {
  beforeEach(() => {
    sharpToBuffer.mockClear();
    sharpToBuffer.mockResolvedValue(Buffer.alloc(150_000));
    // Reset baseline env so env-mutation tests start from a known state.
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.OPENAI_API_KEY = 'openai-key';
    delete process.env.GOOGLE_API_KEY;
    delete process.env.AI_IMAGE_FALLBACK_MODELS;
  });

  it('exports an `ImageGenerator` class from ./image-generator', () => {
    const exported = (imageModule as unknown as {
      ImageGenerator?: unknown;
    }).ImageGenerator;
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('function');
  });

  it('can be constructed with an AIClient instance', () => {
    const ImageGenerator = resolveImageGenerator();
    const client = new StubAIClient();
    const service = new ImageGenerator(client);

    expect(service).toBeInstanceOf(ImageGenerator);
    expect(typeof service.generateDiagram).toBe('function');
  });

  it('generateDiagram() delegates to client.generateImage(...) with the built prompt and primary model', async () => {
    const ImageGenerator = resolveImageGenerator();
    const client = new StubAIClient();
    const service = new ImageGenerator(client);

    const result = await service.generateDiagram(baseRequest);

    expect(client.generateImageCalls).toHaveLength(1);
    const call = client.generateImageCalls[0];

    // The prompt is built from the request (mirrors buildPrompt in
    // image-generator.ts:44). Asserting on a few sentinel substrings
    // protects against accidental prompt-shrink in Green.
    expect(call.prompt).toContain('Label the layers of the Earth');
    expect(call.prompt).toContain('crust, mantle, core');
    expect(call.prompt).toContain('4:3');

    // The model is the primary model from aiImageConfig
    // ('google/gemini-3-pro-image' by default).
    expect(call.model).toBe('google/gemini-3-pro-image');

    // The result is a Buffer (test-strategy §3.6) in the legacy shape.
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.mimeType).toBe('image/webp');
    expect(result.modelUsed).toBe('google/gemini-3-pro-image');
    expect(result.fallbackUsed).toBe(false);
  });

  it('does not mutate process.env.OPENAI_API_KEY or process.env.GOOGLE_API_KEY at call time (FR-5)', async () => {
    const ImageGenerator = resolveImageGenerator();
    const client = new StubAIClient();
    const service = new ImageGenerator(client);

    // Pre-condition: simulate a config-driven key but unset process.env
    // for GOOGLE_API_KEY (the primary model is google/* by default, so
    // the legacy ensureApiKey() would mutate process.env.GOOGLE_API_KEY
    // if it ran). The test asserts the new code path does not mutate
    // process.env at all (test-strategy §3.2 / FR-5).
    delete process.env.GOOGLE_API_KEY;
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.GEMINI_API_KEY = 'gemini-key';

    const beforeGoogle = process.env.GOOGLE_API_KEY;
    const beforeOpenAi = process.env.OPENAI_API_KEY;

    await service.generateDiagram({ description: 'Volcano cross-section' });

    expect(process.env.GOOGLE_API_KEY).toBe(beforeGoogle);
    expect(process.env.OPENAI_API_KEY).toBe(beforeOpenAi);
  });

  it('falls back to the secondary model when the primary call throws (regression net)', async () => {
    const ImageGenerator = resolveImageGenerator();
    const client = new StubAIClient();
    client.throwOnGenerateImageCount = 1; // throw on first call
    const service = new ImageGenerator(client);

    const result = await service.generateDiagram({ description: 'Simple cell diagram' });

    expect(client.generateImageCalls).toHaveLength(2);
    expect(result.fallbackUsed).toBe(true);
    expect(result.modelUsed).toBe('openai/dall-e-3');
  });

  it('preserves the legacy `generateLessonDiagram(input)` public API (Phase 7 task 3)', () => {
    const exported = (imageModule as unknown as {
      generateLessonDiagram?: unknown;
    }).generateLessonDiagram;
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('function');
  });
});
