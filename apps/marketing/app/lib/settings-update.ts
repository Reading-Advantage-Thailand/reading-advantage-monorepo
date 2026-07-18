/** Placeholder returned to clients when a marketing secret is configured. */
export const MARKETING_MASKED_SECRET = "••••";

const SECRET_KEY_PATTERNS = [/apiKey/i, /secret/i, /token/i];

/**
 * Reports whether a marketing setting contains secret material.
 * @param key The persisted marketing setting key.
 * @returns Whether the setting must be masked and encrypted.
 */
export function isMarketingSecretSetting(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Reports whether an incoming value means that an existing secret is unchanged.
 * @param key The marketing setting key being updated.
 * @param value The client-supplied setting value.
 * @returns Whether persistence must omit the secret update.
 */
export function preservesExistingMarketingSecret(
  key: string,
  value: string,
): boolean {
  if (!isMarketingSecretSetting(key)) return false;
  const normalizedValue = value.trim();
  return (
    normalizedValue.length === 0 ||
    normalizedValue === MARKETING_MASKED_SECRET
  );
}

/**
 * Removes unchanged secret placeholders while retaining explicit replacements.
 * @param input Validated marketing settings submitted by a client.
 * @returns A new settings object containing only values that should be written.
 */
export function prepareMarketingSettingsUpdate(
  input: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !preservesExistingMarketingSecret(key, value),
    ),
  );
}
