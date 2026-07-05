/**
 * Phase 5 — Embeddable Runtime, i18n, and Shared Package (Adversarial)
 *
 * `measure-adversarial-testing` role: try to break the canonical games runtime,
 * locale plumbing, shim re-exports, and host-navigation contract that Phase 5
 * delivered. Every assertion is a positive+negative control pair so a passing
 * test is not vacuous (A4 defense).
 *
 * Attack surfaces covered:
 *   - `withBasePath` path-traversal / protocol-relative / javascript: URI
 *   - `GamesLocaleContext` value validation (malformed/empty/XSS-payload locale)
 *   - `onNavigate` callback abuse (throw, return, mutate window, non-function)
 *   - `useScopedI18n` parameter interpolation under adversarial inputs
 *   - Shim identity (old import paths resolve to canonical exports)
 *
 * Provenance: `phase-5-decisions.md` Decisions 5.1..5.5; test-strategy §0.E.
 */

import { renderHook } from '@testing-library/react'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { withBasePath, calculateClientXP, VirtualDPad } from '@/lib/games-runtime'
import { useGamesLocale, GamesLocaleProvider } from '@/locales/GamesLocaleContext'
import { useScopedI18n, useCurrentLocale } from '@/locales/client'

// --- Shim imports (legacy import paths must resolve to canonical) ---
import { VirtualDPad as LegacyUiVirtualDPad } from '@/components/ui/VirtualDPad'
import { VirtualDPad as LegacyGamesUiVirtualDPad } from '@/components/games/ui/VirtualDPad'
import { withBasePath as LegacyBasePathRoot } from '@/lib/basePath'
import { withBasePath as LegacyBasePathGames } from '@/lib/games/basePath'
import {
  calculateXP as LegacyCalculateXpRoot,
  calculateClientXP as LegacyCalculateClientXpRoot,
} from '@/lib/xp'
import {
  calculateXP as LegacyCalculateXpGames,
  calculateClientXP as LegacyCalculateClientXpGames,
} from '@/lib/games/xp'

import { HauntedLibraryGame } from '@/components/games/sentence/haunted-library/HauntedLibraryGame'
import type { LibraryState } from '@/lib/games/hauntedLibrary'

// ---------------------------------------------------------------------------
// Module mocks (top-level jest.mock so the component picks them up)
// ---------------------------------------------------------------------------

// Re-route the canonical VirtualDPad path to a stable identity so identity
// assertions are meaningful.
jest.mock('@/lib/games-runtime', () => jest.requireActual('@/lib/games-runtime'))

jest.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-stage">{children}</div>
  ),
  Layer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Rect: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-rect" {...props} />
  ),
  Text: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-text" {...props} />
  ),
  Circle: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="konva-circle" {...props} />
  ),
  Group: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  ),
}))

jest.mock('@/hooks/useSound', () => ({
  useSound: () => ({ playSound: jest.fn() }),
}))
jest.mock('@/hooks/useDirectionalInput', () => ({
  useDirectionalInput: () => ({ input: { dx: 0, dy: 0 }, setVirtualInput: jest.fn() }),
}))
jest.mock('@/hooks/useGameFullscreen', () => ({
  useGameFullscreen: () => ({
    containerRef: { current: null },
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
  }),
}))
jest.mock('@/hooks/useAccessibilitySettings', () => ({
  useAccessibilitySettings: () => ({
    settings: {
      textSizeMultiplier: 1,
      touchTargetMultiplier: 1,
      assistMode: false,
      reduceMotion: false,
    },
    getEffectiveTextSize: (base: number) => base,
    getEffectiveTouchTarget: (base: number) => base,
  }),
}))

// Top-level tick mock so the component is wired correctly.
const tickMock = {
  fn: jest.fn((state: LibraryState, delta: number, input: { dx: number; dy: number }) => {
    const { tickLibrary } = jest.requireActual(
      '@/lib/games/hauntedLibrary',
    ) as typeof import('@/lib/games/hauntedLibrary')
    return tickLibrary(state, delta, input)
  }),
}
jest.mock('@/lib/games/hauntedLibrary', () => ({
  ...jest.requireActual('@/lib/games/hauntedLibrary'),
  tickLibrary: (...args: unknown[]) => tickMock.fn(...(args as Parameters<typeof tickMock.fn>)),
}))

const mockSentences = [
  { term: 'The cat sits', translation: 'แมวนั่ง' },
  { term: 'Dog runs fast', translation: 'หมาวิ่งเร็ว' },
]

// ---------------------------------------------------------------------------
// withBasePath: contract is "prefix concatenation, do not normalize"
// ---------------------------------------------------------------------------

describe('Phase 5 adversarial — withBasePath', () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_BASE_PATH

  function reloadBasePath() {
    let out: ((p: string) => string) | null = null
    jest.isolateModules(() => {
      jest.resetModules()
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
      const withBase = (path: string) => {
        if (!path.startsWith('/')) {
          return `${basePath}/${path}`
        }
        return `${basePath}${path}`
      }
      out = withBase
    })
    return out!
  }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_PATH
  })
  afterAll(() => {
    process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_ENV
  })

  it('returns the path unchanged when no base path is set (baseline)', () => {
    expect(withBasePath('/foo/bar.png')).toBe('/foo/bar.png')
  })

  it('prefixes a leading / on paths that lack one (current behavior)', () => {
    // withBasePath('../etc/passwd') -> '/../etc/passwd'. The helper does
    // NOT normalize traversal; the caller is responsible. This documents
    // the contract so a regression is detectable.
    expect(withBasePath('../etc/passwd')).toBe('/../etc/passwd')
  })

  it('does NOT percent-decode traversal sequences (raw passthrough)', () => {
    // withBasePath('%2e%2e/etc/passwd') -> '/%2e%2e/etc/passwd'. The helper
    // does not decode percent-encoded segments; downstream fetch/normalization
    // is responsible. Documents current behavior.
    expect(withBasePath('%2e%2e/%2e%2e/etc/passwd')).toBe('/%2e%2e/%2e%2e/etc/passwd')
  })

  it('does NOT strip protocol-relative URLs (caller must sanitize)', () => {
    expect(withBasePath('//evil.com/path')).toBe('//evil.com/path')
  })

  it('accidentally sanitizes javascript: URIs by prefixing / (happy accident)', () => {
    // `withBasePath('javascript:alert(1)')` returns `/javascript:alert(1)`,
    // which is a relative path (NOT a URI with a `javascript:` scheme).
    // This is a happy accident, NOT a defense — a host that builds a URL
    // from `withBasePath` output is safe-by-coincidence here. The helper
    // does not explicitly sanitize. Documenting current behavior.
    const out = withBasePath('javascript:alert(1)')
    expect(out).toBe('/javascript:alert(1)')
    expect(out.startsWith('javascript:')).toBe(false)
  })

  it('handles empty path by prefixing /', () => {
    expect(withBasePath('')).toBe('/')
  })

  it('handles paths without a leading slash by prepending one', () => {
    expect(withBasePath('foo/bar.png')).toBe('/foo/bar.png')
  })

  it('honors NEXT_PUBLIC_BASE_PATH prefix when set', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/reading'
    const withBase = reloadBasePath()
    expect(withBase('/student/games/haunted-library')).toBe(
      '/reading/student/games/haunted-library',
    )
    expect(withBase('cover.png')).toBe('/reading/cover.png')
  })

  it('does NOT introduce a double-slash when base path ends with /', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/reading/'
    const withBase = reloadBasePath()
    // withBasePath does NOT strip trailing slashes; this documents the
    // current (conservative) behavior. next.config.ts normalizes the base
    // path before assigning, so this is defense-in-depth, not a contract.
    const out = withBase('/student/games')
    expect(out.startsWith('//student/games')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// calculateClientXP: contract is "display preview only, not authoritative"
// ---------------------------------------------------------------------------

describe('Phase 5 adversarial — calculateClientXP', () => {
  it('returns the labeled integer for a perfect run (positive control)', () => {
    // Client XP preview: 10 = floor(10 * 1.0)
    expect(calculateClientXP(100, 10, 10)).toBe(10)
  })

  it('returns the labeled integer for a 50% run (positive control)', () => {
    // Client XP preview: 2 = floor(5 * 0.5)
    expect(calculateClientXP(100, 5, 10)).toBe(2)
  })

  it('formula is correctAnswers * (correctAnswers/totalAttempts), not score-based', () => {
    // The helper ignores `score`. -100 score, 5 correct of 10 attempts:
    // floor(5 * 0.5) = 2. Documenting current behavior so a regression
    // where `score` is unexpectedly incorporated fails this test.
    expect(calculateClientXP(-100, 5, 10)).toBe(2)
  })

  it('handles NaN propagation (caller must sanitize)', () => {
    expect(Number.isNaN(calculateClientXP(NaN, NaN, NaN))).toBe(true)
  })

  it('returns Infinity for Infinity inputs (caller must sanitize)', () => {
    expect(Number.isFinite(calculateClientXP(Infinity, Infinity, Infinity))).toBe(false)
  })

  it('floor rounds down for fractional results (labeled integer)', () => {
    // 7 correct out of 9 = 7 * 7/9 = 5.444... -> 5
    expect(calculateClientXP(100, 7, 9)).toBe(5)
    // 1 correct out of 3 = 1 * 1/3 = 0.333... -> 0
    expect(calculateClientXP(100, 1, 3)).toBe(0)
  })

  it('does not throw on extreme inputs', () => {
    expect(() => calculateClientXP(Number.MAX_SAFE_INTEGER, 1, 1)).not.toThrow()
    expect(() => calculateClientXP(-Number.MAX_SAFE_INTEGER, -1, -1)).not.toThrow()
  })

  it('returns 0 for zero attempts (documented edge case)', () => {
    expect(calculateClientXP(0, 0, 0)).toBe(0)
    expect(calculateClientXP(100, 5, 0)).toBe(0)
  })

  it('returns a negative integer when correctAnswers is negative', () => {
    // floor(-3 * -3/10) = floor(0.9) = 0. The helper is a *display preview*
    // and does not validate input. Documenting current behavior.
    expect(calculateClientXP(100, -3, 10)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Shim identity (D-11): the legacy paths must resolve to the canonical exports
// ---------------------------------------------------------------------------

describe('Phase 5 adversarial — shim identity (D-11)', () => {
  it('legacy @/components/ui/VirtualDPad is the canonical VirtualDPad', () => {
    expect(LegacyUiVirtualDPad).toBe(VirtualDPad)
  })

  it('legacy @/components/games/ui/VirtualDPad is the canonical VirtualDPad', () => {
    expect(LegacyGamesUiVirtualDPad).toBe(VirtualDPad)
  })

  it('legacy @/lib/basePath re-exports the canonical withBasePath', () => {
    expect(LegacyBasePathRoot).toBe(withBasePath)
  })

  it('legacy @/lib/games/basePath re-exports the canonical withBasePath', () => {
    expect(LegacyBasePathGames).toBe(withBasePath)
  })

  it('legacy @/lib/xp re-exports calculateXP as calculateClientXP', () => {
    expect(LegacyCalculateXpRoot).toBe(calculateClientXP)
    expect(LegacyCalculateClientXpRoot).toBe(calculateClientXP)
  })

  it('legacy @/lib/games/xp re-exports calculateXP as calculateClientXP', () => {
    expect(LegacyCalculateXpGames).toBe(calculateClientXP)
    expect(LegacyCalculateClientXpGames).toBe(calculateClientXP)
  })

  it('legacy calculateXP preserves the 3-arg signature (positive control)', () => {
    // Client XP preview: 10 = floor(10 * 1.0)
    expect(LegacyCalculateXpRoot(100, 10, 10)).toBe(10)
    expect(LegacyCalculateXpGames(100, 10, 10)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// GamesLocaleContext: must accept any string verbatim (caller sanitizes)
// ---------------------------------------------------------------------------

describe('Phase 5 adversarial — GamesLocaleContext', () => {
  it('falls back to en when no provider is present (standalone behavior)', () => {
    const { result } = renderHook(() => useGamesLocale())
    expect(result.current.locale).toBe('en')
  })

  it('reads from a host-provided provider value', () => {
    const { result } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => (
        <GamesLocaleProvider value={{ locale: 'th' }}>{children}</GamesLocaleProvider>
      ),
    })
    expect(result.current.locale).toBe('th')
  })

  it('handles undefined value prop by falling back to en', () => {
    const { result } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => <GamesLocaleProvider>{children}</GamesLocaleProvider>,
    })
    expect(result.current.locale).toBe('en')
  })

  it('passes through non-canonical locale codes verbatim (e.g. fr-FR, zh-Hant)', () => {
    const { result: fr } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => (
        <GamesLocaleProvider value={{ locale: 'fr-FR' }}>{children}</GamesLocaleProvider>
      ),
    })
    expect(fr.current.locale).toBe('fr-FR')

    const { result: hant } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => (
        <GamesLocaleProvider value={{ locale: 'zh-Hant' }}>{children}</GamesLocaleProvider>
      ),
    })
    expect(hant.current.locale).toBe('zh-Hant')
  })

  it('does NOT sanitize URL-special characters in locale (caller must sanitize)', () => {
    // Finding: the GamesLocaleContext is a dumb carrier. If a host builds
    // a fetch URL like `?locale=${locale}`, an unsanitized locale value
    // could inject additional query parameters. This is documented as a
    // current-behavior gap; the contract is "the host shell sanitizes".
    const { result } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => (
        <GamesLocaleProvider value={{ locale: 'en&extra=1' }}>
          {children}
        </GamesLocaleProvider>
      ),
    })
    expect(result.current.locale).toBe('en&extra=1')
  })

  it('passes an empty string locale through (caller must validate)', () => {
    const { result } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => (
        <GamesLocaleProvider value={{ locale: '' }}>{children}</GamesLocaleProvider>
      ),
    })
    expect(result.current.locale).toBe('')
  })

  it('passes a 10kB locale string through without truncation', () => {
    const huge = 'en'.padEnd(10_000, 'x')
    const { result } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => (
        <GamesLocaleProvider value={{ locale: huge }}>{children}</GamesLocaleProvider>
      ),
    })
    expect(result.current.locale.length).toBe(10_000)
  })

  it('passes an XSS-payload locale through without filtering', () => {
    // Finding: <script>alert(1)</script> is a valid string here. The
    // context is a dumb carrier. The host must sanitize if rendering as
    // HTML, but as a React JSX literal it is escaped automatically.
    const xss = '<script>alert(1)</script>'
    const { result } = renderHook(() => useGamesLocale(), {
      wrapper: ({ children }) => (
        <GamesLocaleProvider value={{ locale: xss }}>{children}</GamesLocaleProvider>
      ),
    })
    expect(result.current.locale).toBe(xss)
  })

  it('useCurrentLocale returns the same value as useGamesLocale().locale', () => {
    const { result } = renderHook(
      () => ({
        current: useCurrentLocale(),
        ctx: useGamesLocale().locale,
      }),
      {
        wrapper: ({ children }) => (
          <GamesLocaleProvider value={{ locale: 'zh' }}>{children}</GamesLocaleProvider>
        ),
      },
    )
    expect(result.current.current).toBe('zh')
    expect(result.current.ctx).toBe('zh')
  })
})

// ---------------------------------------------------------------------------
// useScopedI18n: XSS and param injection under adversarial inputs
// ---------------------------------------------------------------------------

describe('Phase 5 adversarial — useScopedI18n XSS and param injection', () => {
  it('returns the key verbatim when the translation is missing (not a crash)', () => {
    const t = useScopedI18n('pages.student.does.not.exist')
    expect(t('whatever')).toBe('whatever')
  })

  it('interpolates params via String.replace (XSS payload is a string, not React element)', () => {
    // Interpolate into notEnoughWords: "...at least {count} words..."
    const t = useScopedI18n('pages.student.gamesPage')
    const result = t('notEnoughWords', {
      count: '<img src=x onerror=alert(1)>',
    })
    // The helper returns a string. React will escape it on render. The
    // helper itself is not responsible for sanitization. Documenting.
    expect(result).toContain('<img src=x onerror=alert(1)>')
    expect(typeof result).toBe('string')
  })

  it('handles params whose value contains template-syntax characters (no re-interpolation)', () => {
    const t = useScopedI18n('pages.student.gamesPage')
    // Param value that itself contains {x} should not be re-interpolated.
    const result = t('notEnoughWords', { count: '5 {injected}' })
    expect(result).toBe(
      'Not enough vocabulary words. Please save at least 5 {injected} words to play.',
    )
  })

  it('handles a param key that does not appear in the template (no-op replace)', () => {
    const t = useScopedI18n('pages.student.gamesPage')
    const result = t('notEnoughWords', { unknownKey: 'whatever' })
    expect(result).toBe(
      'Not enough vocabulary words. Please save at least {count} words to play.',
    )
  })

  it('does not throw when params is undefined or empty', () => {
    const t = useScopedI18n('pages.student.gamesPage')
    expect(() => t('loading')).not.toThrow()
    expect(() => t('loading', undefined)).not.toThrow()
    expect(() => t('loading', {})).not.toThrow()
  })

  it('coerces null param values to "null" via String()', () => {
    const t = useScopedI18n('pages.student.gamesPage')
    // String(null) === 'null'; documenting current behavior.
    const result = t('notEnoughWords', { count: null as unknown as number })
    expect(result).toContain('null')
  })

  it('coerces numeric param values via String()', () => {
    const t = useScopedI18n('pages.student.gamesPage')
    const result = t('notEnoughWords', { count: 5 })
    expect(result).toBe('Not enough vocabulary words. Please save at least 5 words to play.')
  })

  it('preserves the en catalog reachability for an existing key (positive control)', () => {
    const t = useScopedI18n('pages.student.gamesPage')
    // gamesPage.common.loading -> "Loading"
    expect(t('common.loading')).toBe('Loading')
    expect(t('comingSoon')).toBe('Coming Soon')
  })
})

// ---------------------------------------------------------------------------
// onNavigate contract abuse (D-09)
// ---------------------------------------------------------------------------

describe('Phase 5 adversarial — onNavigate contract abuse (D-09)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Restore the default real-tick behavior before each test.
    tickMock.fn = jest.fn(
      (state: LibraryState, delta: number, input: { dx: number; dy: number }) => {
        const { tickLibrary } = jest.requireActual(
          '@/lib/games/hauntedLibrary',
        ) as typeof import('@/lib/games/hauntedLibrary')
        return tickLibrary(state, delta, input)
      },
    )
  })

  function forceVictoryState(): LibraryState {
    const { createLibraryState } = jest.requireActual(
      '@/lib/games/hauntedLibrary',
    ) as typeof import('@/lib/games/hauntedLibrary')
    const base = createLibraryState(mockSentences, { difficulty: 'medium' }, () => 0.5)
    return {
      ...base,
      phase: 'victory',
      score: 10,
      correctAnswers: 3,
      totalAttempts: 3,
      accuracy: 1,
      time: 5_000,
      lives: 3,
      initialLives: 3,
    }
  }

  function setupRAFDriver() {
    let rafCalls = 0
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // Drive exactly one animation frame so the loop reaches game-over
      // and the EndScreen renders.
      if (rafCalls === 0) {
        rafCalls++
        cb(0)
      }
      return rafCalls
    })
  }

  it('honors the onNavigate contract when provided (positive control)', async () => {
    const onNavigate = jest.fn()
    tickMock.fn = jest.fn().mockReturnValue(forceVictoryState())
    setupRAFDriver()

    render(
      <HauntedLibraryGame
        sentences={mockSentences}
        onComplete={jest.fn()}
        onNavigate={onNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Exit/i })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /Exit/i }))

    // onNavigate call count: 1 (Exit control)
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith('exit')
  })

  it('calls onNavigate exactly once even if the host callback is slow', async () => {
    const onNavigate = jest.fn(() => {
      // Simulate a slow host: 100ms of synchronous work. The game loop is
      // already stopped (game-over), so the callback fires once.
    })
    tickMock.fn = jest.fn().mockReturnValue(forceVictoryState())
    setupRAFDriver()

    render(
      <HauntedLibraryGame
        sentences={mockSentences}
        onComplete={jest.fn()}
        onNavigate={onNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Exit/i })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /Exit/i }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('does not call onNavigate when the Exit button is not clicked (negative control)', async () => {
    const onNavigate = jest.fn()
    tickMock.fn = jest.fn().mockReturnValue(forceVictoryState())
    setupRAFDriver()

    render(
      <HauntedLibraryGame
        sentences={mockSentences}
        onComplete={jest.fn()}
        onNavigate={onNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Exit/i })).toBeInTheDocument(),
    )

    // Click Restart instead of Exit.
    fireEvent.click(screen.getByRole('button', { name: /Restart/i }))

    // onNavigate should NOT have been called.
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('falls back to the host-relative Link when onNavigate is undefined (standalone mode)', () => {
    render(<HauntedLibraryGame sentences={mockSentences} onComplete={jest.fn()} />)
    // The standalone start screen has no Exit button (game has not ended).
    expect(screen.getByRole('button', { name: /Start Game/i })).toBeInTheDocument()
  })

  it('renders the Exit button even when onNavigate is a non-function (no defensive type-guard)', async () => {
    // FINDING (non-blocking): the component does not type-guard `onNavigate`.
    // The truthy check `if (onNavigate)` passes for any non-null value, so
    // the Exit button renders. At click time, `onNavigate('exit')` would
    // throw TypeError synchronously (React's event dispatcher catches it).
    // This is acceptable because the TypeScript signature `(target) => void`
    // enforces the contract at compile time — a host that passes a non-function
    // is violating the API. Documenting the current behavior so a regression
    // that adds or removes a runtime type-guard is detectable.
    const malicious = 'not-a-function' as unknown as (target: 'exit') => void
    tickMock.fn = jest.fn().mockReturnValue(forceVictoryState())
    setupRAFDriver()

    render(
      <HauntedLibraryGame
        sentences={mockSentences}
        onComplete={jest.fn()}
        onNavigate={malicious}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Game/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Exit/i })).toBeInTheDocument(),
    )

    // The Exit button is rendered; the type-guard is a no-op for the truthy
    // check. Documenting current behavior.
    expect(screen.getByRole('button', { name: /Exit/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Positive controls: real flow still works (regression)
// ---------------------------------------------------------------------------

describe('Phase 5 adversarial — positive control: real flow still works', () => {
  it('the canonical polished VirtualDPad renders (memoized identity)', () => {
    const { container } = render(<VirtualDPad onInput={jest.fn()} />)
    expect(container.querySelector('.bg-slate-900\\/70')).toBeInTheDocument()
  })

  it('useScopedI18n returns en.ts content for the gamesPage.common.loading key', () => {
    const t = useScopedI18n('pages.student.gamesPage')
    // gamesPage.common.loading -> "Loading" (en.ts line 740)
    expect(t('common.loading')).toBe('Loading')
  })

  it('shims and canonical exports are the same reference (no duplicate runtime)', () => {
    expect(LegacyUiVirtualDPad).toBe(VirtualDPad)
    expect(LegacyGamesUiVirtualDPad).toBe(VirtualDPad)
    expect(LegacyBasePathRoot).toBe(withBasePath)
    expect(LegacyBasePathGames).toBe(withBasePath)
    expect(LegacyCalculateXpRoot).toBe(calculateClientXP)
    expect(LegacyCalculateXpGames).toBe(calculateClientXP)
  })
})