/**
 * Phase 2 contract + live-behavior test for FR-2 (OpenTelemetry Installation + Configuration).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md` FR-2:
 *   - `apps/science-advantage/instrumentation.ts` exports `register()`, an async
 *     function, that delegates to `instrumentation.node.ts` when
 *     `process.env.NEXT_RUNTIME === 'nodejs'` (Next.js convention).
 *   - `apps/science-advantage/instrumentation.node.ts` registers an OTLP
 *     exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, and falls back to
 *     a console exporter when it is empty/unset.
 *   - Resource attributes include `service.name='science-advantage'`
 *     (spec.md FR-2 line 64 — "service.name: science-advantage,
 *      service.version: <git-sha>").
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §2 (Testing Pyramid) classifies Phase 2 as "file-exists + register()
 *     returns" with the closeout live-behavior proof being the build
 *     (`pnpm turbo run build --filter=science-advantage`).
 *   - §6 (Phase 2 notes) calls for (a) importing `instrumentation.ts` and
 *     asserting `register()` is an async function, and (b) calling
 *     `register()` under `NEXT_RUNTIME=nodejs` and asserting a tracer
 *     provider is registered with the expected resource attributes; the
 *     console-exporter fallback is exercised by setting
 *     `OTEL_EXPORTER_OTLP_ENDPOINT=''`.
 *   - §7 (Live-Proof Plan) designates the targeted Red command for Phase 2:
 *       `pnpm --filter science-advantage exec vitest run
 *        lib/observability/__tests__/instrumentation.contract.test.ts`
 *
 * Mocking strategy:
 *   - `@opentelemetry/sdk-node` is mocked so the test can assert the
 *     `NodeSDK` constructor was invoked with the expected `resource` and
 *     `spanProcessor(s)` without booting the real SDK.
 *   - `@opentelemetry/exporter-trace-otlp-http` is mocked so we can detect
 *     when the OTLP exporter was selected (production path) vs the console
 *     exporter (local-dev fallback).
 *   - `@opentelemetry/sdk-trace-base` is mocked for `ConsoleSpanExporter`
 *     and `BatchSpanProcessor`.
 *   - `@opentelemetry/resources` is mocked so the test can capture the
 *     attributes the implementation passes to `new Resource(...)`.
 *   - `@opentelemetry/semantic-conventions` is mocked so the test does not
 *     depend on the exact symbol name across OTel versions
 *     (`SemanticResourceAttributes.SERVICE_NAME` vs
 *     `ATTR_SERVICE_NAME`).
 *
 * Intentionally red at MID handoff: `instrumentation.ts` and
 * `instrumentation.node.ts` are both absent, so the dynamic `import()`
 * throws `ERR_MODULE_NOT_FOUND` for every test in this file. Green is the
 * same command exiting 0 once the implementation lands. The Phase 9
 * acceptance test owns the end-to-end OTel throw-in-route proof; this
 * file owns the Phase 2 contract + register() shape.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  nodeSdkConstructorMock,
  otlpTraceExporterConstructorMock,
  consoleSpanExporterConstructorMock,
  batchSpanProcessorConstructorMock,
  resourceConstructorMock,
} = vi.hoisted(() => ({
  nodeSdkConstructorMock: vi.fn(),
  otlpTraceExporterConstructorMock: vi.fn(),
  consoleSpanExporterConstructorMock: vi.fn(),
  batchSpanProcessorConstructorMock: vi.fn(),
  resourceConstructorMock: vi.fn(),
}));

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: class NodeSDK {
    public start = vi.fn();
    public shutdown = vi.fn();
    constructor(config: unknown) {
      nodeSdkConstructorMock(config);
    }
  },
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class OTLPTraceExporter {
    constructor(opts: unknown) {
      otlpTraceExporterConstructorMock(opts);
    }
  },
}));

vi.mock('@opentelemetry/sdk-trace-base', () => ({
  ConsoleSpanExporter: class ConsoleSpanExporter {
    constructor() {
      consoleSpanExporterConstructorMock();
    }
  },
  BatchSpanProcessor: class BatchSpanProcessor {
    constructor(exporter: unknown) {
      batchSpanProcessorConstructorMock(exporter);
    }
  },
}));

vi.mock('@opentelemetry/resources', () => ({
  Resource: class Resource {
    public attributes: Record<string, unknown>;
    constructor(config: { attributes?: Record<string, unknown> } = {}) {
      resourceConstructorMock(config);
      this.attributes = config.attributes ?? {};
    }
  },
}));

vi.mock('@opentelemetry/semantic-conventions', () => ({
  SemanticResourceAttributes: {
    SERVICE_NAME: 'service.name',
    SERVICE_VERSION: 'service.version',
  },
}));

const INSTRUMENTATION_PATH = '../../instrumentation';

describe('FR-2 instrumentation.ts contract', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    nodeSdkConstructorMock.mockReset();
    otlpTraceExporterConstructorMock.mockReset();
    consoleSpanExporterConstructorMock.mockReset();
    batchSpanProcessorConstructorMock.mockReset();
    resourceConstructorMock.mockReset();
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '';
    process.env.OTEL_SERVICE_NAME = 'science-advantage';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('exposes register() as an async function (Next.js instrumentation contract)', async () => {
    const mod = await import(INSTRUMENTATION_PATH);

    expect(mod).toBeDefined();
    expect(typeof mod.register).toBe('function');
    expect(
      mod.register.constructor.name,
      'Next.js instrumentation contract requires `register` to be declared with `async`.',
    ).toBe('AsyncFunction');
  });
});

describe('FR-2 instrumentation.node.ts live behavior under NEXT_RUNTIME=nodejs', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    nodeSdkConstructorMock.mockReset();
    otlpTraceExporterConstructorMock.mockReset();
    consoleSpanExporterConstructorMock.mockReset();
    batchSpanProcessorConstructorMock.mockReset();
    resourceConstructorMock.mockReset();
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '';
    process.env.OTEL_SERVICE_NAME = 'science-advantage';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('register() constructs NodeSDK with a Resource whose attributes include service.name=science-advantage', async () => {
    const { register } = await import(INSTRUMENTATION_PATH);
    await register();

    expect(
      nodeSdkConstructorMock,
      'NodeSDK must be constructed exactly once when NEXT_RUNTIME=nodejs.',
    ).toHaveBeenCalledTimes(1);

    const resourceCalls = resourceConstructorMock.mock.calls;
    expect(
      resourceCalls.length,
      'Implementation must construct a Resource with service attributes.',
    ).toBeGreaterThanOrEqual(1);

    const allAttributeKeys = resourceCalls.flatMap(([cfg]) => {
      const attrs = (cfg as { attributes?: Record<string, unknown> } | undefined)
        ?.attributes;
      return attrs ? Object.keys(attrs) : [];
    });
    const mergedAttributes = resourceCalls.reduce<
      Record<string, unknown>
    >((acc, [cfg]) => {
      const attrs = (cfg as { attributes?: Record<string, unknown> } | undefined)
        ?.attributes;
      return { ...acc, ...(attrs ?? {}) };
    }, {});

    expect(
      allAttributeKeys,
      'Resource attributes must include a `service.name` entry (spec.md FR-2 line 64).',
    ).toContain('service.name');
    expect(mergedAttributes['service.name']).toBe('science-advantage');
  });

  it('uses the console-exporter fallback when OTEL_EXPORTER_OTLP_ENDPOINT is the empty string', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '';

    const { register } = await import(INSTRUMENTATION_PATH);
    await register();

    expect(
      otlpTraceExporterConstructorMock,
      'OTLPTraceExporter must NOT be instantiated when OTEL_EXPORTER_OTLP_ENDPOINT is empty ' +
        '(spec.md FR-2 line 65 — console-exporter fallback for local dev).',
    ).not.toHaveBeenCalled();
    expect(
      consoleSpanExporterConstructorMock,
      'ConsoleSpanExporter must be instantiated as the local-dev fallback.',
    ).toHaveBeenCalled();
    expect(
      batchSpanProcessorConstructorMock,
      'BatchSpanProcessor must wrap the console exporter (or another span processor) for batching.',
    ).toHaveBeenCalled();
  });
});
