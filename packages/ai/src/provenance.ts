import type {
  AIGenerationProvenance,
  AIGenerationUsage,
  AIProvider,
} from "./types.js";

/** Provider metadata returned by the AI SDK for a structured generation. */
interface StructuredGenerationMetadata {
  /** Response metadata returned by the underlying provider. */
  response?: {
    id?: string;
    modelId?: string;
    headers?: Record<string, string>;
  };
  /** Token usage returned by the underlying provider. */
  usage?: {
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    totalTokens?: number | undefined;
    reasoningTokens?: number | undefined;
    cachedInputTokens?: number | undefined;
  };
}

/**
 * Converts an optional provider token count to the stable nullable contract.
 * @param value The provider-reported token count.
 * @returns The finite token count or null when the provider omitted it.
 */
function nullableTokenCount(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Extracts a provider request identifier from case-insensitive HTTP headers.
 * @param headers Provider response headers, if available.
 * @returns The request identifier or null when the provider did not return one.
 */
function requestIdFromHeaders(
  headers: Record<string, string> | undefined
): string | null {
  if (!headers) return null;

  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = name.toLowerCase();
    if (
      normalizedName === "x-request-id" ||
      normalizedName === "x-openrouter-request-id"
    ) {
      return value;
    }
  }

  return null;
}

/**
 * Creates a stable provenance record without inventing absent provider fields.
 * @param input The adapter/provider values captured around one generation.
 * @returns A provider-neutral provenance record suitable for durable storage.
 */
export function createGenerationProvenance(input: {
  provider: AIProvider;
  requestedModel: string;
  startedAtMs: number;
  result: StructuredGenerationMetadata;
}): AIGenerationProvenance {
  const usage: AIGenerationUsage = {
    inputTokens: nullableTokenCount(input.result.usage?.inputTokens),
    outputTokens: nullableTokenCount(input.result.usage?.outputTokens),
    totalTokens: nullableTokenCount(input.result.usage?.totalTokens),
    reasoningTokens: nullableTokenCount(input.result.usage?.reasoningTokens),
    cachedInputTokens: nullableTokenCount(input.result.usage?.cachedInputTokens),
  };

  return {
    provider: input.provider,
    requestedModel: input.requestedModel,
    resolvedModel: input.result.response?.modelId ?? null,
    responseId: input.result.response?.id ?? null,
    requestId: requestIdFromHeaders(input.result.response?.headers),
    usage,
    latencyMs: Math.max(0, Date.now() - input.startedAtMs),
  };
}
