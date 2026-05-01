import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScoreboardOverlay } from './ScoreboardOverlay';

describe('ScoreboardOverlay', () => {
  const mockPlayers = [
    { id: 'player1', name: 'Player 1', score: 300, wordsCollected: 3, isConnected: true },
    { id: 'player2', name: 'Player 2', score: 200, wordsCollected: 2, isConnected: true },
    { id: 'player3', name: 'Player 3', score: 100, wordsCollected: 1, isConnected: false },
  ];

  it('should render when visible', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={true}
      />
    );

    expect(screen.getByText('Round 1/3')).toBeInTheDocument();
    expect(screen.getByTestId('player-score-player1')).toBeInTheDocument();
    expect(screen.getByTestId('player-score-player2')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={false}
      />
    );

    expect(screen.queryByText('Round 1/3')).not.toBeInTheDocument();
  });

  it('should sort players by score', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={true}
      />
    );

    const playerElements = screen.getAllByTestId(/player-score-/);
    expect(playerElements[0]).toHaveTextContent('Player 1');
    expect(playerElements[1]).toHaveTextContent('Player 2');
    expect(playerElements[2]).toHaveTextContent('Player 3');
  });

  it('should display player scores', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={true}
      />
    );

    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display words collected count', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={true}
      />
    );

    const player1Element = screen.getByTestId('player-score-player1');
    const player2Element = screen.getByTestId('player-score-player2');
    const player3Element = screen.getByTestId('player-score-player3');

    expect(player1Element).toHaveTextContent('3');
    expect(player2Element).toHaveTextContent('2');
    expect(player3Element).toHaveTextContent('1');
  });

  it('should show time remaining when provided', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        timeRemaining={65}
        isVisible={true}
      />
    );

    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('should highlight low time remaining', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        timeRemaining={8}
        isVisible={true}
      />
    );

    const timeElement = screen.getByText('0:08');
    expect(timeElement).toHaveClass('text-destructive');
  });

  it('should call onClose when hide button clicked', () => {
    const onClose = jest.fn();
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Hide'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should show connection status indicators', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={true}
      />
    );

    const playerElements = screen.getAllByTestId(/player-score-/);
    // Connected players should have green indicator
    expect(playerElements[0].querySelector('.bg-green-500')).toBeInTheDocument();
    // Disconnected player should have gray indicator
    expect(playerElements[2].querySelector('.bg-gray-300')).toBeInTheDocument();
  });

  it('should highlight top player', () => {
    render(
      <ScoreboardOverlay
        players={mockPlayers}
        currentRound={1}
        totalRounds={3}
        isVisible={true}
      />
    );

    const topPlayer = screen.getByTestId('player-score-player1');
    expect(topPlayer).toHaveClass('bg-yellow-500/10');
  });
});
