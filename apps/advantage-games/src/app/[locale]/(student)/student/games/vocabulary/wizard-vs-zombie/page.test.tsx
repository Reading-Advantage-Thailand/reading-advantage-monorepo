import { render, screen, waitFor } from '@testing-library/react'
import WizardZombiePage from './page'
import type { VocabularyItem } from '@/store/useGameStore'

type GameStoreMockState = {
  vocabulary: VocabularyItem[]
  setVocabulary: (vocabulary: VocabularyItem[]) => void
  setLastResult: (xp: number, accuracy: number) => void
}

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  useGameStore: <T,>(selector: (state: GameStoreMockState) => T): T => {
    const state: GameStoreMockState = {
      vocabulary: [],
      setVocabulary: jest.fn(),
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

// Mock the Game Component to avoid canvas/complex render issues in page test
jest.mock('@/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame', () => ({
  WizardZombieGame: () => <div data-testid="wizard-zombie-game">Game Component</div>,
}))

describe('WizardZombiePage', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vocabulary: [] }),
      })
    ) as jest.Mock;
  });

  it('renders the page title and description', () => {
    render(<WizardZombiePage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Wizard vs Zombie')
    expect(screen.getByText(/Collect healing orbs/i)).toBeInTheDocument()
  })

  it('renders the game component directly', async () => {
    render(<WizardZombiePage />)
    await waitFor(() => {
      expect(screen.getByTestId('wizard-zombie-game')).toBeInTheDocument()
    })
  })

  it('contains a link back to games', () => {
    render(<WizardZombiePage />)
    const link = screen.getByRole('link', { name: /back to games/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/student/games')
  })
})
