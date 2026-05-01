import { render, screen, waitFor } from '@testing-library/react'
import RuneForgeChamberPage from './page'

type GameStoreMockState = {
  setLastResult: (xp: number, accuracy: number) => void
}

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  useGameStore: <T,>(selector: (state: GameStoreMockState) => T): T => {
    const state: GameStoreMockState = {
      setLastResult: jest.fn(),
    }
    return selector(state)
  },
}))

// Mock the session hook
jest.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    data: { user: { xp: 100 } },
    status: 'authenticated',
  }),
}))

// Mock locales
jest.mock('@/locales/client', () => ({
  useCurrentLocale: () => 'en',
  useScopedI18n: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Rune Forge Chamber',
    }
    return translations[key] || key
  },
}))

// Mock the Game Component to avoid canvas/complex render issues in page test
jest.mock('@/components/games/sentence/rune-forge-chamber', () => ({
  RuneForgeChamberGame: () => <div data-testid="rune-forge-chamber-game">Game Component</div>,
}))

describe('RuneForgeChamberPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sentences: [{ term: 'Hello world', translation: 'สวัสดีโลก' }] }),
      })
    ) as jest.Mock
  })

  it('renders the page title and description', async () => {
    render(<RuneForgeChamberPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Rune Forge Chamber')
    })
    expect(screen.getByText(/Tap word circles/i)).toBeInTheDocument()
  })

  it('renders the game component directly', async () => {
    render(<RuneForgeChamberPage />)
    await waitFor(() => {
      expect(screen.getByTestId('rune-forge-chamber-game')).toBeInTheDocument()
    })
  })

  it('contains a link back to games', async () => {
    render(<RuneForgeChamberPage />)
    await waitFor(() => {
      const links = screen.getAllByRole('link')
      const backLink = links.find(l => l.getAttribute('href') === '/student/games')
      expect(backLink).toBeInTheDocument()
    })
  })

  it('handles NO_SENTENCES warning', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ warning: 'NO_SENTENCES' }),
      })
    ) as jest.Mock

    render(<RuneForgeChamberPage />)
    await waitFor(() => {
      expect(screen.getByText(/ไม่พบประโยค/i)).toBeInTheDocument()
    })
  })

  it('handles INSUFFICIENT_SENTENCES warning', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          warning: 'INSUFFICIENT_SENTENCES',
          requiredCount: 5,
          currentCount: 2,
        }),
      })
    ) as jest.Mock

    render(<RuneForgeChamberPage />)
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})
