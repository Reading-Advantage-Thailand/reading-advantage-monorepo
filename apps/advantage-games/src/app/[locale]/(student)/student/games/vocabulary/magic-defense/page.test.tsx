import { render, screen, waitFor } from '@testing-library/react';
import MagicDefensePage from './page';
import { SAMPLE_VOCABULARY } from '@/lib/games/sampleVocabulary';
import { useGameStore, DEFAULT_CASTLES } from '@/store/useGameStore';

const MockGameContainer = jest.fn(() => <div data-testid='game-container' />);
jest.mock('@/components/games/game/GameContainer', () => ({
  GameContainer: (props: any) => MockGameContainer(props),
}));

describe('MagicDefensePage', () => {
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
    });
  });

  it('renders the Magic Defense shell', async () => {
    render(<MagicDefensePage />);

    expect(screen.getByRole('heading', { name: /magic defense/i })).toBeInTheDocument();
    
    // Wait for vocabulary to load so the game container appears
    await waitFor(() => {
      expect(screen.queryByText(/loading vocabulary/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/defend your tower/i)).toBeInTheDocument();
    expect(screen.getByTestId('game-container')).toBeInTheDocument();
  });

  it('loads sample vocabulary into the game store', async () => {
    render(<MagicDefensePage />);

    await waitFor(() => {
      expect(useGameStore.getState().vocabulary).toEqual(SAMPLE_VOCABULARY);
    });
  });

  it('shows error when vocabulary fetch fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to fetch' }),
      })
    ) as jest.Mock;

    render(<MagicDefensePage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('shows error when insufficient vocabulary is returned', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vocabulary: [{ term: 'A', translation: 'B' }] }),
      })
    ) as jest.Mock;

    render(<MagicDefensePage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('handles network error gracefully', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    ) as jest.Mock;

    render(<MagicDefensePage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('submits game results via handleComplete', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ xpEarned: 100 }),
      })
    );
    global.fetch = mockFetch as jest.Mock;

    render(<MagicDefensePage />);

    await waitFor(() => {
      expect(MockGameContainer).toHaveBeenCalled();
    });

    // Get the onComplete prop from the last call
    const lastCall = MockGameContainer.mock.calls[MockGameContainer.mock.calls.length - 1];
    const { onComplete } = lastCall[0];

    // Call onComplete with mock results
    await onComplete({
      score: 100,
      correctAnswers: 10,
      totalAttempts: 12,
      accuracy: 0.83,
      difficulty: 'normal',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/games/magic-defense/complete',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"score":100'),
      })
    );
  });
});
