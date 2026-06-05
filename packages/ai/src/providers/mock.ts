import type { z } from "zod";
import type {
  AIClient,
  GenerateImageInput,
  GenerateObjectInput,
  GenerateTextInput,
} from "../types.js";
import { ProviderNotConfiguredError, SchemaValidationError } from "../errors.js";

/**
 * Pre-configured responses the mock provider returns for each method.
 * If a response is `undefined`, the method throws `ProviderNotConfiguredError`.
 */
export interface MockResponses {
  generateObject?: unknown;
  generateImage?: Buffer;
  generateText?: string;
}

/**
 * Deterministic mock AI provider for unit tests. Returns pre-configured
 * responses and optionally validates the output against the caller's Zod
 * schema so tests can verify schema compliance without a network round-trip.
 */
export class MockProvider implements AIClient {
  private readonly responses: MockResponses;
  private callLog: Array<{
    method: "generateObject" | "generateImage" | "generateText";
    input: unknown;
  }> = [];

  constructor(responses: MockResponses = {}) {
    this.responses = responses;
  }

  /** All calls made to this provider, in order. */
  get calls() {
    return this.callLog;
  }

  async generateObject<T>(input: GenerateObjectInput<T>): Promise<T> {
    this.callLog.push({ method: "generateObject", input });

    if (this.responses.generateObject === undefined) {
      throw new ProviderNotConfiguredError(
        "mock",
        "generateObject response not configured"
      );
    }

    const parsed = input.schema.safeParse(this.responses.generateObject);
    if (!parsed.success) {
      throw new SchemaValidationError(
        input.schema.description ?? "unknown",
        parsed.error.issues
      );
    }

    return parsed.data;
  }

  async generateImage(_input: GenerateImageInput): Promise<Buffer> {
    this.callLog.push({ method: "generateImage", input: _input });

    if (this.responses.generateImage === undefined) {
      throw new ProviderNotConfiguredError(
        "mock",
        "generateImage response not configured"
      );
    }

    return this.responses.generateImage;
  }

  async generateText(_input: GenerateTextInput): Promise<string> {
    this.callLog.push({ method: "generateText", input: _input });

    if (this.responses.generateText === undefined) {
      throw new ProviderNotConfiguredError(
        "mock",
        "generateText response not configured"
      );
    }

    return this.responses.generateText;
  }
}
