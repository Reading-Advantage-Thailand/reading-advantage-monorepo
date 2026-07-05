import en from './en'
import { useGamesLocale } from './GamesLocaleContext'

/**
 * Locale-aware i18n surface for Advantage Games.
 *
 * Phase 5 (Decision 5.2) changed `useCurrentLocale` to read from the new
 * `GamesLocaleContext` rather than the previous hardcoded `'en'` literal.
 * The standalone advantage-games app keeps its `'en'`-default behavior
 * because `useGamesLocale()` falls back to `{ locale: 'en' }` when no
 * provider is present. Host shells (e.g. Reading Advantage, Primary
 * Advantage) wrap game routes in a `GamesLocaleProvider` with the active
 * locale so the games read translations consistent with the host.
 *
 * The translations map below is still sourced from `./en` (the only
 * translation file currently shipped). For non-`en` locales, `useScopedI18n`
 * falls back to the requested key — this is the explicit key-fallback
 * described in Phase 5 Decision 5.2 §3.
 */

type TranslationValue = string | Record<string, unknown>
type TranslationObject = Record<string, TranslationValue>

const translations: Record<string, string> = flattenTranslations(en as TranslationObject)

function flattenTranslations(obj: TranslationObject, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'string') {
      result[fullKey] = value
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenTranslations(value as TranslationObject, fullKey))
    }
  }

  return result
}

export function useScopedI18n(scope: string) {
  return (key: string, params?: Record<string, string | number>) => {
    const fullKey = `${scope}.${key}`
    let translation = translations[fullKey] || key

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = (translation as string).replace(`{${paramKey}}`, String(paramValue))
      })
    }

    return translation as string
  }
}

/**
 * Returns the active locale for the games app.
 *
 * Reads from `GamesLocaleContext`; falls back to `'en'` when no provider
 * is present (standalone behavior preserved). Existing tests that mock
 * `@/locales/client` continue to work; existing tests that call
 * `useCurrentLocale()` directly (e.g. `client.test.ts`) also continue to
 * work because the context fallback is `'en'`.
 */
export function useCurrentLocale() {
  const { locale } = useGamesLocale()
  return locale
}

export function useI18n() {
  return (key: string, params?: Record<string, string | number>) => {
    let translation = translations[key] || key

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = (translation as string).replace(`{${paramKey}}`, String(paramValue))
      })
    }

    return translation as string
  }
}

export { en }