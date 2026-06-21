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
}
