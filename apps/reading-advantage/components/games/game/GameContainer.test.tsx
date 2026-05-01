import { render, screen } from '@testing-library/react'
import { GameContainer } from './GameContainer'
import { useGameStore } from '@/store/useGameStore'

// Mock the store
jest.mock('@/store/useGameStore', () => ({
  useGameStore: jest.fn(),
}))

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}))

const mockUseGameStore = useGameStore as unknown as jest.Mock

describe('GameContainer', () => {
  it('renders StartScreen initially', () => {
    mockUseGameStore.mockReturnValue({
      status: 'idle',
      vocabulary: [],
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      resetGame: jest.fn(),
    })

    render(<GameContainer />)
    expect(screen.getByText(/Missile Command: Vocab Edition/i)).toBeInTheDocument()
  })

  it('renders GameEngine when status is playing', () => {
    mockUseGameStore.mockReturnValue({
      status: 'playing',
      vocabulary: [{ term: 'Apple', translation: 'Manzana' }],
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      castles: { left: 3, center: 3, right: 3 },
      resetGame: jest.fn(),
      damageCastle: jest.fn(),
      increaseScore: jest.fn(),
      incrementAttempts: jest.fn(),
    })

    render(<GameContainer />)
    // GameEngine is rendered (has relative background)
    // We can check for the input placeholder
    expect(screen.getByPlaceholderText(/type translation/i)).toBeInTheDocument()
  })

  it('renders ResultsScreen when status is game-over', () => {
    mockUseGameStore.mockReturnValue({
      status: 'game-over',
      vocabulary: [],
      score: 100,
      correctAnswers: 5,
      totalAttempts: 10,
      resetGame: jest.fn(),
    })

    render(<GameContainer />)
    expect(screen.getByText(/Game Over/i)).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
