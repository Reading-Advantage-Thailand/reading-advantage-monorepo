/**
 * Phase 4 Red-phase tests for the Vertex Application Default Credentials path.
 *
 * Track `accounting_drive_intake_20261109` (A-52), phase 4, task 4.1.
 * Strategy: `measure/tracks/accounting_drive_intake_20261109/test-strategy.md`
 * section "P4: The Vertex route and the extraction adapter" (labeled floor
 * `adc_cases>=4`, mutants, fixtures).
 *
 * What this file pins:
 *   1. `createAIClient({ provider: "vertex", project, location })` builds a
 *      client with no `clientEmail` and no `privateKey`, because Cloud Run
 *      supplies Application Default Credentials through the runtime service
 *      account (task 4.2, PM-3).
 *   2. The same factory throws `ProviderNotConfiguredError` only when the
 *      project is absent.
 *   3. `new VertexProvider({ project, location })` builds a client with no
 *      credential pair.
 *   4. The vertex model factory receives no `googleAuthOptions.credentials`
 *      object on that path. This row rejects the mutant "the ADC path passes a
 *      credentials object anyway".
 *   5. The existing key-pair path still builds a client and still passes the
 *      credentials, so no current caller breaks (characterization row; it
 *      passes at the base).
 *
 * The SDK is a module mock. The project and the location are fake strings.
 * No test calls a real model, a real Google endpoint, or gcloud. No credential
 * value appears in this file: the fake private key is a literal placeholder.
 *
 * Red expectation at the base: cases 1, 3, and 4 fail on an assertion, because
 * `packages/ai/src/client.ts:67` and `packages/ai/src/providers/vertex.ts:33`
 * still require the key pair. Cases 2 and 5 pass.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

vi.mock("@ai-sdk/google-vertex", () => ({
  createVertex: vi.fn(() =>
    Object.assign(vi.fn((id: string) => `vertex:${id}`), {
      image: vi.fn((id: string) => `image:${id}`),
    })
  ),
}));

import { createVertex } from "@ai-sdk/google-vertex";
import { createAIClient } from "../client.js";
import { ProviderNotConfiguredError } from "../errors.js";
import {
  VertexProvider,
  type VertexProviderConfig,
} from "../providers/vertex.js";

/** Fake project id. No real Google Cloud project is named. */
const ADC_PROJECT = "fake-project-adc";
/** Fake location. No real Vertex endpoint is named. */
const ADC_LOCATION = "fake-location";
/** Fake client email on the reserved `.invalid` domain. */
const FAKE_CLIENT_EMAIL = "fake-svc@fake-project-adc.iam.invalid";
/** Fake private key. The `\n` stays escaped, as a real key file delivers it. */
const FAKE_PRIVATE_KEY = "fake-key-line-1\\nfake-key-line-2";

/** The shape this file reads from the mocked vertex factory options. */
interface FactoryOptions {
  project?: string;
  location?: string;
  googleAuthOptions?: { credentials?: Record<string, string> };
}

/** Return the error a call throws, or `undefined` when it does not throw. */
function captureThrow(run: () => unknown): unknown {
  try {
    run();
    return undefined;
  } catch (error) {
    return error;
  }
}

/** Return the options of the last `createVertex` call, or `undefined`. */
function lastFactoryOptions(): FactoryOptions | undefined {
  const calls = vi.mocked(createVertex).mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall?.[0] as unknown as FactoryOptions | undefined;
}

/** The ADC shape. The cast stands until the key-pair fields become optional. */
const adcConfig = {
  project: ADC_PROJECT,
  location: ADC_LOCATION,
} as VertexProviderConfig;

interface AdcCase {
  name: string;
  run: () => void;
}

const adcCases: AdcCase[] = [
  {
    name: "builds a client from project and location with no key pair",
    run: () => {
      let client: unknown;
      const thrown = captureThrow(() => {
        client = createAIClient({
          provider: "vertex",
          project: ADC_PROJECT,
          location: ADC_LOCATION,
        });
      });
      expect(
        thrown,
        'createAIClient({ provider: "vertex" }) threw ProviderNotConfiguredError without a key pair'
      ).toBeUndefined();
      expect(client).toBeInstanceOf(VertexProvider);
    },
  },
  {
    name: "throws ProviderNotConfiguredError only when the project is absent",
    run: () => {
      const thrown = captureThrow(() => {
        createAIClient({ provider: "vertex", location: ADC_LOCATION });
      });
      expect(
        thrown,
        'createAIClient({ provider: "vertex" }) without a project did not throw'
      ).toBeInstanceOf(ProviderNotConfiguredError);
    },
  },
  {
    name: "builds VertexProvider from project and location with no credentials",
    run: () => {
      let provider: unknown;
      const thrown = captureThrow(() => {
        provider = new VertexProvider(adcConfig);
      });
      expect(
        thrown,
        "new VertexProvider({ project, location }) threw without a credential pair"
      ).toBeUndefined();
      expect(provider).toBeInstanceOf(VertexProvider);
      expect(
        lastFactoryOptions()?.project,
        "the vertex factory did not receive the project on the adc path"
      ).toBe(ADC_PROJECT);
    },
  },
  {
    name: "passes no googleAuthOptions.credentials object on the adc path",
    run: () => {
      captureThrow(() => {
        createAIClient({
          provider: "vertex",
          project: ADC_PROJECT,
          location: ADC_LOCATION,
        });
      });
      const options = lastFactoryOptions();
      expect(
        options,
        "the vertex factory was never built on the adc path"
      ).toBeDefined();
      expect(
        options,
        "the vertex factory received a googleAuthOptions.credentials object on the adc path"
      ).not.toHaveProperty("googleAuthOptions.credentials");
      expect(options?.project).toBe(ADC_PROJECT);
      expect(options?.location).toBe(ADC_LOCATION);
    },
  },
  {
    name: "keeps the key-pair path and passes credentials",
    run: () => {
      const client = createAIClient({
        provider: "vertex",
        project: ADC_PROJECT,
        location: ADC_LOCATION,
        clientEmail: FAKE_CLIENT_EMAIL,
        privateKey: FAKE_PRIVATE_KEY,
      });
      expect(client).toBeInstanceOf(VertexProvider);
      expect(lastFactoryOptions()?.googleAuthOptions?.credentials).toEqual({
        client_email: FAKE_CLIENT_EMAIL,
        private_key: "fake-key-line-1\nfake-key-line-2",
      });
    },
  },
];

describe("vertex application default credentials path", () => {
  beforeEach(() => {
    vi.stubEnv("PROJECT_ID", "");
    vi.stubEnv("VERTEX_CLIENT_EMAIL", "");
    vi.stubEnv("VERTEX_PRIVATE_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(createVertex).mockClear();
  });

  it.each(adcCases)("$name", ({ run }) => {
    run();
  });

  it("covers the adc case floor", () => {
    expect(adcCases.length, `adc_cases=${adcCases.length}`).toBeGreaterThanOrEqual(4);
  });
});
