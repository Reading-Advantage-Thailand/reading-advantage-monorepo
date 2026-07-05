'use client'

import React, { createContext, useContext } from 'react'

/**
 * Host-injectable locale source for Advantage Games (Phase 5 Decision 5.2).
 *
 * The custom `client.ts` i18n layer was previously hardcoded to read
 * `'en'` from `useCurrentLocale()`. Phase 5 introduces this React context
 * so a host shell (e.g. Reading Advantage, Primary Advantage) can provide
 * the locale at runtime, while the standalone advantage-games app keeps
 * its `'en'`-default behavior via the `DEFAULT_LOCALE` fallback below.
 *
 * Tier 2 deferred items (per Phase 5 Decision 5.7):
 *  - Real `th.ts` / `zh.ts` translation content (`[b] deferred:po`)
 *  - Migration to `next-intl` or the host app's i18n adapter
 *    (`[b] deferred:infra`) — this context only carries the locale
 *    string; the host provides the message catalog for that locale.
 */

export const DEFAULT_LOCALE = 'en'

export interface GamesLocaleContextValue {
  /** BCP-47-like locale code; one of `'en'`, `'th'`, `'zh'`. */
  locale: string
}

const GamesLocaleContext = createContext<GamesLocaleContextValue | null>(null)

export interface GamesLocaleProviderProps {
  value?: GamesLocaleContextValue
  children: React.ReactNode
}

/**
 * Provider component for the games-app locale context.
 *
 * Renders the `DEFAULT_LOCALE` fallback when `value` is omitted (standalone
 * behavior preserved). The host shell wraps game routes in this provider
 * with the active locale value.
 */
export function GamesLocaleProvider({ value, children }: GamesLocaleProviderProps) {
  const resolved: GamesLocaleContextValue = value ?? { locale: DEFAULT_LOCALE }
  return (
    <GamesLocaleContext.Provider value={resolved}>
      {children}
    </GamesLocaleContext.Provider>
  )
}

/**
 * Hook to read the current locale from the games-app locale context.
 *
 * Returns `'en'` when no provider is present (standalone fallback). This
 * preserves the existing standalone behavior so unmigrated tests and
 * consumers don't break.
 */
export function useGamesLocale(): GamesLocaleContextValue {
  const ctx = useContext(GamesLocaleContext)
  return ctx ?? { locale: DEFAULT_LOCALE }
}

export { GamesLocaleContext }