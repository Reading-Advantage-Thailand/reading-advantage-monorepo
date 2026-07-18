import type { AIConfig, AIProvider } from "@reading-advantage/ai";
import { decrypt } from "@/lib/encryption";

/** AI providers supported by the Marketing application. */
export type MarketingAIProvider = Exclude<AIProvider, "mock">;

/** Environment values used when no provider credential is persisted. */
export interface MarketingAIEnvironment {
  [key: string]: string | undefined;
  AI_PROVIDER?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
}

const SUPPORTED_PROVIDERS = new Set<MarketingAIProvider>([
  "google",
  "openai",
  "openrouter",
]);

/**
 * Reports whether a value names an AI provider supported by Marketing.
 * @param value The untrusted provider setting or environment value.
 * @returns Whether the value is a supported provider identifier.
 */
export function isMarketingAIProvider(
  value: unknown,
): value is MarketingAIProvider {
  return (
    typeof value === "string" &&
    SUPPORTED_PROVIDERS.has(value as MarketingAIProvider)
  );
}

/**
 * Resolves the provider key from the process environment.
 * @param provider The selected Marketing AI provider.
 * @param environment The environment values available to the runtime.
 * @returns The provider key, or undefined when it is not configured.
 */
export function resolveMarketingEnvironmentKey(
  provider: MarketingAIProvider,
  environment: MarketingAIEnvironment,
): string | undefined {
  switch (provider) {
    case "google":
      return environment.GEMINI_API_KEY ?? environment.GOOGLE_API_KEY;
    case "openai":
      return environment.OPENAI_API_KEY;
    case "openrouter":
      return environment.OPENROUTER_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Builds an AI adapter configuration from encrypted settings with an environment fallback.
 * @param settingsMap Persisted Marketing settings keyed by setting name.
 * @param environment Environment values used only when no key is persisted.
 * @returns A complete AI configuration, or null when no provider key is available.
 * @throws When a persisted credential cannot be authenticated and decrypted.
 */
export function resolveMarketingAIConfig(
  settingsMap: Readonly<Record<string, string>>,
  environment: MarketingAIEnvironment = process.env,
): AIConfig | null {
  const storedProvider = settingsMap["llm.provider"];
  const provider = isMarketingAIProvider(storedProvider)
    ? storedProvider
    : isMarketingAIProvider(environment.AI_PROVIDER)
      ? environment.AI_PROVIDER
      : "google";
  const encryptedKey = settingsMap["llm.apiKey"];
  const apiKey = encryptedKey
    ? decrypt(encryptedKey)
    : resolveMarketingEnvironmentKey(provider, environment);

  if (!apiKey) {
    return null;
  }

  const storedModel = settingsMap["llm.model"]?.trim();

  return {
    provider,
    model: storedModel || undefined,
    apiKey,
  };
}
