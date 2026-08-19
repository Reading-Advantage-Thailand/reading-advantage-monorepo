import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import MainMenu, {
  CATALOG_LOCALE_STORAGE_KEY,
  CATALOG_LOCALES,
  DEFAULT_CATALOG_LOCALE,
  parseCatalogLocale,
  resolveGameHref,
} from './page'
import { gameCards } from '@/lib/gameCards'

// Mock next/link since it's used in the component
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  Link.displayName = 'Link'
  return Link
})

/**
 * Returns Start Game hrefs from the rendered catalog.
 * @returns Href attributes for every Start Game link.
 */
function startGameHrefs(): Array<string | null> {
  return screen.getAllByRole('link', { name: /Start Game/i }).map((link) =>
    link.getAttribute('href'),
  )
}

/**
 * Returns expected APK launch hrefs for a catalog locale.
 * @param locale Catalog locale prefix used in Start Game links.
 * @returns Locale-prefixed hrefs for every playable catalog card.
 */
function playableHrefsFor(locale: string): string[] {
  return gameCards
    .filter((game) => game.status === 'playable' && game.href)
    .map((game) => `/${locale}${game.href}`)
}

describe('resolveGameHref', () => {
  it('defaults to the English APK route', () => {
    expect(resolveGameHref('/student/games/apk/dragon-flight')).toBe(
      '/en/student/games/apk/dragon-flight',
    )
    expect(DEFAULT_CATALOG_LOCALE).toBe('en')
  })

  it('prefixes the chosen catalog locale', () => {
    expect(resolveGameHref('/student/games/apk/castle-defense', 'th')).toBe(
      '/th/student/games/apk/castle-defense',
    )
    expect(resolveGameHref('/student/games/apk/castle-defense', 'zh')).toBe(
      '/zh/student/games/apk/castle-defense',
    )
  })

  it('falls back to English for an unsupported locale', () => {
    expect(parseCatalogLocale('fr')).toBe('en')
    expect(resolveGameHref('/student/games/apk/castle-defense', 'fr')).toBe(
      '/en/student/games/apk/castle-defense',
    )
  })
})

describe('MainMenu', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the title and game options', () => {
    render(<MainMenu />)

    expect(screen.getByText(/Vocab Arcade/i)).toBeInTheDocument()
    gameCards.forEach((game) => {
      expect(screen.getByText(game.title)).toBeInTheDocument()
    })

    const playableGames = gameCards.filter((game) => game.status === 'playable')
    const links = screen.getAllByRole('link', { name: /Start Game/i })
    expect(links).toHaveLength(playableGames.length)
    expect(startGameHrefs()).toEqual(expect.arrayContaining(playableHrefsFor('en')))
  })

  it('includes a Start Game link for Enchanted Library', () => {
    render(<MainMenu />)

    const links = screen.getAllByRole('link', { name: /Start Game/i })
    const hasEnchantedLibrary = links.some(
      (link) => link.getAttribute('href')?.includes('/enchanted-library'),
    )

    expect(hasEnchantedLibrary).toBe(true)
  })

  it('does not expose the withdrawn APK quality-control lab', () => {
    render(<MainMenu />)

    expect(
      screen.queryByRole('link', { name: /Open APK QC Lab/i }),
    ).not.toBeInTheDocument()
  })

  it('launches Dragon Flight through the authenticated APK route', () => {
    render(<MainMenu />)

    const dragonFlight = screen.getAllByRole('link', { name: /Start Game/i }).find(
      (link) => link.getAttribute('href') === '/en/student/games/apk/dragon-flight',
    )
    expect(dragonFlight).toBeDefined()
  })

  it('includes a Sign in link to the login page', () => {
    render(<MainMenu />)

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('shows a visible locale choice for en, th, and zh', () => {
    render(<MainMenu />)

    expect(screen.getByRole('group', { name: /language/i })).toBeInTheDocument()
    for (const locale of CATALOG_LOCALES) {
      expect(screen.getByRole('button', { name: locale })).toBeInTheDocument()
    }
  })

  it('opens Start Game on the Thai APK route after the student picks th', () => {
    render(<MainMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'th' }))

    expect(startGameHrefs()).toEqual(expect.arrayContaining(playableHrefsFor('th')))
    expect(
      screen.getAllByRole('link', { name: /Start Game/i }).find(
        (link) => link.getAttribute('href') === '/th/student/games/apk/dragon-flight',
      ),
    ).toBeDefined()
    expect(window.localStorage.getItem(CATALOG_LOCALE_STORAGE_KEY)).toBe('th')
  })

  it('opens Start Game on the Chinese APK route after the student picks zh', () => {
    render(<MainMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'zh' }))

    expect(startGameHrefs()).toEqual(expect.arrayContaining(playableHrefsFor('zh')))
    expect(window.localStorage.getItem(CATALOG_LOCALE_STORAGE_KEY)).toBe('zh')
  })

  it('restores the stored catalog locale on load', async () => {
    window.localStorage.setItem(CATALOG_LOCALE_STORAGE_KEY, 'zh')

    render(<MainMenu />)

    await waitFor(() => {
      expect(startGameHrefs()).toEqual(expect.arrayContaining(playableHrefsFor('zh')))
    })
  })
})
