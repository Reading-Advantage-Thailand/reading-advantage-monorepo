import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import DragonFlightPage from './page'
import { SAMPLE_VOCABULARY } from '@/lib/games/sampleVocabulary'
import { useGameStore, DEFAULT_CASTLES } from '@/store/useGameStore'

jest.mock('@/components/games/vocabulary/dragon-flight/DragonFlightGame', () => ({
  DragonFlightGame: ({ vocabulary, onComplete }: {
    vocabulary: { term: string; translation: string }[]
    onComplete?: (results: {
      xp: number
      accuracy: number
      bossPower: number
      victory: boolean
      correctAnswers: number
      totalAttempts: number
      dragonCount: number
    }) => void
  }) => (
    <div>
      <div data-testid='dragon-flight-vocab'>{vocabulary.length}</div>
      <button
        type='button'
        onClick={() =>
          onComplete?.({
            xp: 4,
            accuracy: 0.5,
            bossPower: 3,
            victory: true,
            correctAnswers: 2,
            totalAttempts: 4,
            dragonCount: 4,
          })
        }
      >
        Complete
      </button>
    </div>
  ),
}))

describe('DragonFlightPage', () => {
  beforeAll(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vocabulary: SAMPLE_VOCABULARY }),
      })
    ) as jest.Mock;
  });

  beforeEach(() => {
    useGameStore.setState({
      vocabulary: [],
      score: 0,
      castles: { ...DEFAULT_CASTLES },
      status: 'idle',
      correctAnswers: 0,
      totalAttempts: 0,
      lastXp: 0,
      lastAccuracy: 0,
    })
  })

  it('renders the Dragon Flight shell and loads vocabulary', async () => {
    render(<DragonFlightPage />)

    expect(screen.getByRole('heading', { name: /dragon flight/i })).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText(/loading vocabulary/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/choose the correct gate/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(useGameStore.getState().vocabulary).toEqual(SAMPLE_VOCABULARY)
    })

    expect(screen.getByTestId('dragon-flight-vocab')).toHaveTextContent(
      SAMPLE_VOCABULARY.length.toString()
    )
  })

  it('records XP results on completion', async () => {
    render(<DragonFlightPage />)

    await waitFor(() => {
      expect(screen.queryByText(/loading vocabulary/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))

    const { lastXp, lastAccuracy } = useGameStore.getState()
    expect(lastXp).toBe(4)
    expect(lastAccuracy).toBe(0.5)
  })
})
