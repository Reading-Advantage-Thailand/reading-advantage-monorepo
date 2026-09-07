/** Shared OpenTelemetry registration for the Node.js runtime. */
let registration: Promise<void> | undefined;

/**
 * Starts the installed Node SDK with its compatible exporter implementations.
 * @returns A promise that resolves after startup.
 */
async function startNodeSdk(): Promise<void> {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT && !process.env.OTEL_TRACES_EXPORTER) {
    process.env.OTEL_TRACES_EXPORTER = 'console';
  }

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || 'science-advantage',
  });
  sdk.start();
}

/**
 * Registers OpenTelemetry once for the Next.js Node.js runtime.
 * @returns A promise that resolves after registration.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  registration ??= startNodeSdk();
  await registration;
}
