import { render, screen, waitFor } from '@testing-library/react';
import MagicDefensePage from './page';
import { SAMPLE_VOCABULARY } from '@/lib/games/sampleVocabulary';
import { useGameStore, DEFAULT_CASTLES } from '@/store/useGameStore';

jest.mock('@/components/games/game/GameContainer', () => ({
  GameContainer: () => <div data-testid='game-container' />,
}));

describe('MagicDefensePage', () => {
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

  it('renders the Magic Defense shell', () => {
    render(<MagicDefensePage />);

    expect(screen.getByRole('heading', { name: /magic defense/i })).toBeInTheDocument();
    expect(screen.getByText(/defend your castles/i)).toBeInTheDocument();
    expect(screen.getByTestId('game-container')).toBeInTheDocument();
  });

  it('loads sample vocabulary into the game store', async () => {
    render(<MagicDefensePage />);

    await waitFor(() => {
      expect(useGameStore.getState().vocabulary).toEqual(SAMPLE_VOCABULARY);
    });
  });
});
