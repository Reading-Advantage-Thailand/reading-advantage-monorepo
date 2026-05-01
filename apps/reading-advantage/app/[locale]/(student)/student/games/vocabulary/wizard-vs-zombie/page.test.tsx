import { render, screen } from '@testing-library/react'
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

// Mock the Game Component to avoid canvas/complex render issues in page test
jest.mock('@/components/games/wizard-vs-zombie/WizardZombieGame', () => ({
  WizardZombieGame: () => <div data-testid="wizard-zombie-game">Game Component</div>,
}))

describe('WizardZombiePage', () => {
  it('renders the page title and description', () => {
    render(<WizardZombiePage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Wizard vs Zombie')
    expect(screen.getByText(/Collect healing orbs/i)).toBeInTheDocument()
  })

  it('renders the game container', () => {
    render(<WizardZombiePage />)
    expect(screen.getByTestId('wizard-zombie-game')).toBeInTheDocument()
  })

  it('contains a link back to home', () => {
    render(<WizardZombiePage />)
    const link = screen.getByRole('link', { name: /back to home/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/')
  })
})
