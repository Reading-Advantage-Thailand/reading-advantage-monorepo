'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { gameCards } from '@/lib/gameCards'

/** Supported Vocab Arcade catalog locales. */
export type CatalogLocale = 'en' | 'th' | 'zh'

/** Catalog locale codes a student can pick on the home page. */
export const CATALOG_LOCALES: readonly CatalogLocale[] = ['en', 'th', 'zh']

/** Locale used until a student picks Thai or Chinese. */
export const DEFAULT_CATALOG_LOCALE: CatalogLocale = 'en'

/** localStorage key for the student's catalog locale. */
export const CATALOG_LOCALE_STORAGE_KEY = 'advantage-games.catalog-locale'

/**
 * Accepts a stored or user-selected locale and returns a supported catalog locale.
 * @param value Untrusted locale string from storage or UI.
 * @returns A supported catalog locale, or English when the value is invalid.
 */
export function parseCatalogLocale(value: string | null | undefined): CatalogLocale {
  if (value === 'th' || value === 'zh' || value === 'en') {
    return value
  }
  return DEFAULT_CATALOG_LOCALE
}

/**
 * Resolves a locale-agnostic game path into its public launch URL.
 * @param href Catalog path for a playable game.
 * @param locale Catalog locale chosen on the Vocab Arcade home page.
 * @returns A locale-prefixed student APK route.
 */
export function resolveGameHref(
  href: string,
  locale: string = DEFAULT_CATALOG_LOCALE,
): string {
  return `/${parseCatalogLocale(locale)}${href}`
}

/**
 * Reads the persisted catalog locale from localStorage.
 * @returns A supported catalog locale, or English when storage is empty or invalid.
 */
function readStoredCatalogLocale(): CatalogLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_CATALOG_LOCALE
  }
  try {
    return parseCatalogLocale(window.localStorage.getItem(CATALOG_LOCALE_STORAGE_KEY))
  } catch {
    return DEFAULT_CATALOG_LOCALE
  }
}

/**
 * Persists the student's catalog locale for later visits.
 * @param locale Catalog locale the student selected.
 * @returns Nothing.
 */
function writeStoredCatalogLocale(locale: CatalogLocale): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(CATALOG_LOCALE_STORAGE_KEY, locale)
  } catch {
    // Ignore quota and private-mode failures.
  }
}

/**
 * Renders the public Vocab Arcade catalog with a locale picker and sign-in link.
 * @returns The catalog home page.
 */
export default function MainMenu() {
  const [locale, setLocale] = useState<CatalogLocale>(DEFAULT_CATALOG_LOCALE)

  useEffect(() => {
    setLocale(readStoredCatalogLocale())
  }, [])

  /**
   * Stores the selected catalog locale and updates Start Game routes.
   * @param next Locale the student selected.
   */
  function selectLocale(next: CatalogLocale): void {
    setLocale(next)
    writeStoredCatalogLocale(next)
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-6xl space-y-12">
        <header className="text-center space-y-4">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-foreground">
            Vocab Arcade
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            High-precision vocabulary training
          </p>
          <div
            role="group"
            aria-label="Language"
            className="flex items-center justify-center gap-2"
          >
            {CATALOG_LOCALES.map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant={locale === code ? 'default' : 'outline'}
                aria-pressed={locale === code}
                onClick={() => selectLocale(code)}
              >
                {code}
              </Button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {gameCards.map((game) => {
            const isPlayable = game.status === 'playable'

            return (
              <Card
                key={game.id}
                className={cn(
                  'group overflow-hidden transition-all duration-200 hover:border-foreground/50',
                  !isPlayable && 'border-dashed opacity-60'
                )}
              >
                <div className="relative w-full overflow-hidden border-b border-border bg-secondary">
                  <Image
                    src={game.cover}
                    alt={`${game.title} cover`}
                    width={1024}
                    height={1536}
                    sizes="(min-width: 1280px) 320px, (min-width: 768px) 50vw, 100vw"
                    className={cn(
                      'w-full h-auto object-contain transition-transform duration-300 grayscale hover:grayscale-0',
                      isPlayable && 'group-hover:scale-105'
                    )}
                  />
                </div>
                <CardHeader className="gap-2 px-6 pt-6">
                  <CardTitle>{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-4">
                  {isPlayable && game.href ? (
                    <Button asChild className="w-full" size="lg">
                      <Link href={resolveGameHref(game.href, locale)}>Start Game</Link>
                    </Button>
                  ) : (
                    <Button disabled variant="secondary" className="w-full" size="lg">
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
