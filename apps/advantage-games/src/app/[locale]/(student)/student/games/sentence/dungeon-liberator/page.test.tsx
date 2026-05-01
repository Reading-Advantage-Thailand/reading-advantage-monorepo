import { render, screen, waitFor } from '@testing-library/react'
import DungeonLiberatorPage from './page'

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
}))

// Mock the Game Component to avoid canvas/complex render issues in page test
jest.mock('@/components/games/sentence/dungeon-liberator', () => ({
  DungeonLiberatorGame: () => <div data-testid="dungeon-liberator-game">Game Component</div>,
}))

describe('DungeonLiberatorPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sentences: [{ term: 'Hello world', translation: 'สวัสดีโลก' }] }),
      })
    ) as jest.Mock
  })

  it('renders the page title and description', async () => {
    render(<DungeonLiberatorPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dungeon Liberator')
    })
    expect(screen.getByText(/Rescue the prisoners/i)).toBeInTheDocument()
  })

  it('renders the game component directly', async () => {
    render(<DungeonLiberatorPage />)
    await waitFor(() => {
      expect(screen.getByTestId('dungeon-liberator-game')).toBeInTheDocument()
    })
  })

  it('contains a link back to games', async () => {
    render(<DungeonLiberatorPage />)
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

    render(<DungeonLiberatorPage />)
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

    render(<DungeonLiberatorPage />)
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})
