import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const serviceName =
  process.env.OTEL_SERVICE_NAME || 'science-advantage';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const spanExporter = otlpEndpoint
  ? new OTLPTraceExporter({ url: otlpEndpoint })
  : new ConsoleSpanExporter();

const resource = new Resource({
  attributes: {
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  },
});

const sdk = new NodeSDK({
  resource,
  spanProcessors: [new BatchSpanProcessor(spanExporter)],
});

sdk.start();
