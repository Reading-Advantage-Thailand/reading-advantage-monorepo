/**
 * Shared sentence-translation helper.
 *
 * Callers supply the full endpoint path; the helper owns the single POST
 * shape, the JSON content type, and the error fallback payload.
 */

export interface TranslateSentenceResponse {
  message: string;
  translated_sentences: string[];
}

/**
 * Normalizes app locale codes to the IETF tags the translation API expects.
 * @param locale App locale code such as "cn", "tw", or "th".
 * @returns The matching IETF tag ("zh-CN", "zh-TW") or the locale unchanged.
 */
export function normalizeTranslateLocale(locale: string): string {
  if (locale === "cn") return "zh-CN";
  if (locale === "tw") return "zh-TW";
  return locale;
}

/**
 * Posts one translation request and returns the translated sentences.
 * @param endpoint Full API path, for example `/api/v1/assistant/translate/${articleId}`.
 * @param targetLanguage IETF target language tag. Normalize app locales first.
 * @param options Extra body fields merged next to `targetLanguage`.
 * @returns The parsed payload, or an error payload when the request fails.
 */
export async function getTranslateSentence(
  endpoint: string,
  targetLanguage: string,
  options?: { body?: Record<string, unknown> },
): Promise<TranslateSentenceResponse> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...options?.body, targetLanguage }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Translation error:", error);
    return { message: "error", translated_sentences: [] };
  }
}
