import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RuneMatchPage from './page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}))

// Mock the dynamic import
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const MockedComponent = () => <div data-testid="rune-match-game">Mocked RuneMatchGame</div>
    MockedComponent.displayName = 'RuneMatchGame'
    return MockedComponent
  },
}))

// Mock useGameStore
const mockSetVocabulary = jest.fn()
const mockSetLastResult = jest.fn()

jest.mock('@/store/useGameStore', () => ({
  useGameStore: (selector: (state: { vocabulary: string[]; setVocabulary: () => void; setLastResult: () => void }) => unknown) =>
    selector({
      vocabulary: [],
      setVocabulary: mockSetVocabulary,
      setLastResult: mockSetLastResult,
    }),
}))

describe('RuneMatchPage', () => {
  beforeAll(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vocabulary: [] }),
      })
    ) as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<RuneMatchPage />)
    expect(screen.getAllByText(/Rune Match/i).length).toBeGreaterThan(0)
  })

  it('displays game title', () => {
    render(<RuneMatchPage />)
    expect(screen.getByRole('heading', { level: 1, name: /Rune Match/i })).toBeInTheDocument()
  })

  it('displays game description', () => {
    render(<RuneMatchPage />)
    expect(screen.getByText(/Match runes and vocabulary/i)).toBeInTheDocument()
  })

  it('includes back to games link', () => {
    render(<RuneMatchPage />)
    const backLink = screen.getByRole('link', { name: /back to games/i })
    expect(backLink).toHaveAttribute('href', '/student/games')
  })

  it('renders RuneMatchGame directly', async () => {
    render(<RuneMatchPage />)
    expect(screen.getByTestId('rune-match-game')).toBeInTheDocument()
  })

  it('sets sample vocabulary if vocabulary is empty', async () => {
    render(<RuneMatchPage />)
    await waitFor(() => {
      expect(mockSetVocabulary).toHaveBeenCalled()
    })
  })
})
