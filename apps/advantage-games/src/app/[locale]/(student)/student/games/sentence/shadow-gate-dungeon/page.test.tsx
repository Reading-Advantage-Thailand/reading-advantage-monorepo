import { render, screen, waitFor } from '@testing-library/react'
import ShadowGateDungeonPage from './page'

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  useGameStore: <T,>(selector: (state: { setLastResult: (xp: number, accuracy: number) => void }) => T): T => {
    const state = {
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
  useScopedI18n: () => (key: string) => key,
}))

// Mock the Game Component to avoid canvas/complex render issues in page test
jest.mock('@/components/games/sentence/shadow-gate-dungeon', () => ({
  ShadowGateDungeonGame: () => <div data-testid="shadow-gate-dungeon-game">Game Component</div>,
}))

describe('ShadowGateDungeonPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sentences: [{ term: 'Hello world', translation: 'สวัสดีโลก' }] }),
      })
    ) as jest.Mock
  })

  it('renders the page title and description', async () => {
    render(<ShadowGateDungeonPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Shadow Gate Dungeon')
    })
    expect(screen.getByText(/Collect word crystals/i)).toBeInTheDocument()
  })

  it('renders the game component directly', async () => {
    render(<ShadowGateDungeonPage />)
    await waitFor(() => {
      expect(screen.getByTestId('shadow-gate-dungeon-game')).toBeInTheDocument()
    })
  })

  it('contains a link back to games', async () => {
    render(<ShadowGateDungeonPage />)
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

    render(<ShadowGateDungeonPage />)
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

    render(<ShadowGateDungeonPage />)
    await waitFor(() => {
      expect(screen.getByText(/ประโยคที่บันทึกไว้ไม่เพียงพอ/i)).toBeInTheDocument()
    })
  })
})
