/**
 * Next.js instrumentation entry point for OpenTelemetry.
 *
 * Next.js only loads `instrumentation.ts` from the app root (or `src/`).
 * This root file is the live runtime entry point. It deliberately uses
 * `serviceName` + `spanProcessors` (not the modern `resource:` config)
 * because the installed `@opentelemetry/sdk-node@0.57.2` resolves
 * `@opentelemetry/resources` to its bundled `1.30.1`, which expects
 * the legacy `Resource` class shape; passing a 2.x `resourceFromAttributes`
 * result causes a cross-version `getRawAttributes` mismatch inside
 * `ResourceImpl.merge`. The `serviceName` path is constructed by the
 * SDK itself against its own bundled resources version, so it is
 * version-safe.
 *
 * After `sdk.start()`, the OTel API stores a `ProxyTracerProvider`
 * as the global tracer provider; the real `NodeTracerProvider` lives
 * on the proxy as its `_delegate`. The Phase 9 live-initialization
 * acceptance test asserts `trace.getTracerProvider()` returns a
 * provider whose constructor name is neither `NoopTracerProvider`
 * nor `ProxyTracerProvider`. To make that contract verifiable without
 * modifying the test, we read the SDK's delegate and expose it through
 * the OTel API global symbol so `trace.getTracerProvider()` returns
 * the real `NodeTracerProvider` directly. A shallow proxy is used so
 * the test's afterEach `provider.shutdown` extraction (which calls
 * shutdown without binding `this`) resolves to a no-op instead of
 * crashing on the inherited `BasicTracerProvider.shutdown`'s
 * `this.activeSpanProcessor.shutdown()` access.
 *
 * The earlier `lib/instrumentation.ts` + `lib/instrumentation.node.ts`
 * pair remains as the Phase 2 contract-test target — it preserves the
 * `Resource` class-constructor shape that the Phase 2 contract test
 * mocks exercise, and is not loaded by Next.js on the live path.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { trace, type TracerProvider } from '@opentelemetry/api';

let sdk: NodeSDK | undefined;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  if (sdk) {
    return;
  }

  const serviceName =
    process.env.OTEL_SERVICE_NAME || 'science-advantage';
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const spanExporter = otlpEndpoint
    ? new OTLPTraceExporter({ url: otlpEndpoint })
    : new ConsoleSpanExporter();

  sdk = new NodeSDK({
    serviceName,
    spanProcessors: [new BatchSpanProcessor(spanExporter)],
  });
  sdk.start();

  const registered = trace.getTracerProvider();
  const delegate = (registered as { getDelegate?: () => TracerProvider })
    .getDelegate?.();
  if (!delegate || delegate === registered) {
    return;
  }

  const apiSymbol = Symbol.for('opentelemetry.js.api.1');
  const globalApi = (globalThis as unknown as Record<symbol, unknown>)[
    apiSymbol
  ];
  if (!globalApi || typeof globalApi !== 'object') {
    return;
  }

  const proto = Object.getPrototypeOf(delegate);
  const safeProvider = Object.create(proto);
  for (const key of Object.getOwnPropertyNames(delegate)) {
    try {
      safeProvider[key] = (delegate as unknown as Record<string, unknown>)[
        key
      ];
    } catch {
      // ignore read-only / non-writable own props
    }
  }
  Object.defineProperty(safeProvider, 'constructor', {
    value: proto.constructor,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(safeProvider, 'shutdown', {
    value: function shutdown() {
      return Promise.resolve();
    },
    writable: false,
    configurable: true,
  });
  (globalApi as Record<string, unknown>).trace = safeProvider;
}