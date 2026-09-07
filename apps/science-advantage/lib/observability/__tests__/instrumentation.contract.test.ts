import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { nodeSdkConstructorMock, nodeSdkStartMock } = vi.hoisted(() => ({
  nodeSdkConstructorMock: vi.fn(),
  nodeSdkStartMock: vi.fn(),
}));

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: class NodeSDK {
    public start = nodeSdkStartMock;

    constructor(config: unknown) {
      nodeSdkConstructorMock(config);
    }
  },
}));

const INSTRUMENTATION_PATH = '../../instrumentation';
const originalEnv = { ...process.env };

describe('OpenTelemetry instrumentation contract', () => {
  beforeEach(() => {
    nodeSdkConstructorMock.mockReset();
    nodeSdkStartMock.mockReset();
    process.env = { ...originalEnv, NEXT_RUNTIME: 'nodejs' };
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_TRACES_EXPORTER;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses the SDK console exporter when no OTLP endpoint is configured', async () => {
    const { register } = await import(INSTRUMENTATION_PATH);
    await register();

    expect(process.env.OTEL_TRACES_EXPORTER).toBe('console');
    expect(nodeSdkConstructorMock).toHaveBeenCalledWith({
      serviceName: 'science-advantage',
    });
    expect(nodeSdkStartMock).toHaveBeenCalledTimes(1);
  });

  it('uses the SDK OTLP exporter when an OTLP endpoint is configured', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otel.example.test/v1/traces';
    const { register } = await import(INSTRUMENTATION_PATH);
    await register();

    expect(process.env.OTEL_TRACES_EXPORTER).toBeUndefined();
    expect(nodeSdkConstructorMock).toHaveBeenCalledWith({
      serviceName: 'science-advantage',
    });
  });

  it('does not register outside the Node.js runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    const { register } = await import(INSTRUMENTATION_PATH);
    await register();

    expect(nodeSdkConstructorMock).not.toHaveBeenCalled();
  });

  it('registers the SDK only once during concurrent calls', async () => {
    const { register } = await import(INSTRUMENTATION_PATH);
    await Promise.all([register(), register()]);

    expect(nodeSdkConstructorMock).toHaveBeenCalledTimes(1);
    expect(nodeSdkStartMock).toHaveBeenCalledTimes(1);
  });
});
