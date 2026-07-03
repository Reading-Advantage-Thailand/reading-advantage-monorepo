/**
 * Defense-in-depth helper: replace occurrences of any caller-supplied
 * secret in `message` with a `[REDACTED]` marker.
 *
 * Some AI SDKs (notably the Google Generative AI client) echo the supplied
 * API key back inside the error message they throw, e.g.:
 *
 *   "GoogleGenerativeAIError: Invalid API key: sk-... provided"
 *
 * Returning that string verbatim would leak the secret in HTTP responses
 * and any downstream access logs / error trackers. We scrub known secrets
 * before returning. We deliberately avoid logging the raw message: the
 * upstream SDK's error message may itself contain the secret, so logging
 * it server-side is also a leak.
 */
export function redactSecrets(
  message: string,
  secrets: ReadonlyArray<string | undefined>,
): string {
  let sanitized = message;
  for (const secret of secrets) {
    if (typeof secret !== "string" || secret.length === 0) continue;
    sanitized = sanitized.split(secret).join("[REDACTED]");
  }
  return sanitized;
}