import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PodiumScreen } from './PodiumScreen';

describe('PodiumScreen', () => {
  const mockPlayers = [
    { id: 'player1', name: 'Player 1', score: 300, position: 1, xpBonus: 150 },
    { id: 'player2', name: 'Player 2', score: 200, position: 2, xpBonus: 50 },
    { id: 'player3', name: 'Player 3', score: 100, position: 3, xpBonus: 10 },
    { id: 'player4', name: 'Player 4', score: 50, position: 4, xpBonus: 0 },
  ];

  const defaultProps = {
    players: mockPlayers,
    totalRounds: 3,
    onPlayAgain: jest.fn(),
    onLeaveRoom: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render game over header', () => {
    render(<PodiumScreen {...defaultProps} />);
    expect(screen.getByText('Game Over!')).toBeInTheDocument();
    expect(screen.getByText('3 rounds completed')).toBeInTheDocument();
  });

  it('should display winner', () => {
    render(<PodiumScreen {...defaultProps} />);
    expect(screen.getByText('Winner')).toBeInTheDocument();
    // Check that winner name appears in the winner announcement section
    const winnerSection = screen.getByText('Winner').closest('div');
    expect(winnerSection).toHaveTextContent('Player 1');
  });

  it('should display winner score and XP bonus', () => {
    render(<PodiumScreen {...defaultProps} />);
    expect(screen.getByText('300 points')).toBeInTheDocument();
    expect(screen.getByText('(+150 XP)')).toBeInTheDocument();
  });

  it('should display all players in ranking order', () => {
    render(<PodiumScreen {...defaultProps} />);

    const playerElements = screen.getAllByTestId(/podium-player-/);
    expect(playerElements).toHaveLength(4);
    expect(playerElements[0]).toHaveTextContent('Player 1');
    expect(playerElements[1]).toHaveTextContent('Player 2');
    expect(playerElements[2]).toHaveTextContent('Player 3');
    expect(playerElements[3]).toHaveTextContent('Player 4');
  });

  it('should display player positions', () => {
    render(<PodiumScreen {...defaultProps} />);

    expect(screen.getByText('Position 1')).toBeInTheDocument();
    expect(screen.getByText('Position 2')).toBeInTheDocument();
    expect(screen.getByText('Position 3')).toBeInTheDocument();
    expect(screen.getByText('Position 4')).toBeInTheDocument();
  });

  it('should display player scores', () => {
    render(<PodiumScreen {...defaultProps} />);

    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should display XP bonuses for top 3', () => {
    render(<PodiumScreen {...defaultProps} />);

    expect(screen.getByText('+150 XP')).toBeInTheDocument();
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
  });

  it('should not display XP bonus for 4th place', () => {
    render(<PodiumScreen {...defaultProps} />);

    const player4Element = screen.getByTestId('podium-player-player4');
    expect(player4Element.querySelector('.text-green-600')).not.toBeInTheDocument();
  });

  it('should call onPlayAgain when play again button clicked', () => {
    render(<PodiumScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Play Again'));
    expect(defaultProps.onPlayAgain).toHaveBeenCalled();
  });

  it('should call onLeaveRoom when leave room button clicked', () => {
    render(<PodiumScreen {...defaultProps} />);

    fireEvent.click(screen.getByText('Leave Room'));
    expect(defaultProps.onLeaveRoom).toHaveBeenCalled();
  });

  it('should handle single player', () => {
    render(
      <PodiumScreen
        {...defaultProps}
        players={[mockPlayers[0]]}
      />
    );

    expect(screen.getByTestId('podium-player-player1')).toBeInTheDocument();
    expect(screen.queryByTestId('podium-player-player2')).not.toBeInTheDocument();
  });

  it('should highlight top 3 with special styling', () => {
    render(<PodiumScreen {...defaultProps} />);

    const player1 = screen.getByTestId('podium-player-player1');
    const player2 = screen.getByTestId('podium-player-player2');
    const player3 = screen.getByTestId('podium-player-player3');
    const player4 = screen.getByTestId('podium-player-player4');

    expect(player1).toHaveClass('bg-yellow-500/10');
    expect(player2).toHaveClass('bg-gray-400/10');
    expect(player3).toHaveClass('bg-amber-600/10');
    expect(player4).toHaveClass('bg-muted/50');
  });
});
