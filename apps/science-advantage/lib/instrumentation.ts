/**
 * Next.js instrumentation entry point for OpenTelemetry.
 * Called by Next.js at startup; delegates to instrumentation.node.ts
 * when running in the Node.js runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node');
  }
}
