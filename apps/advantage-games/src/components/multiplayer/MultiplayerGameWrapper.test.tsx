import React from 'react';
import { render, screen, act } from '@testing-library/react';
import {
  MultiplayerGameWrapper,
  useMultiplayerGameContext,
  MultiplayerGameContext,
} from './MultiplayerGameWrapper';
import { MessageType } from '@/types/multiplayer';

const TestChild = () => {
  const context = useMultiplayerGameContext();
  return (
    <div data-testid="test-child">
      <span data-testid="is-multiplayer">{context.isMultiplayer ? 'true' : 'false'}</span>
      <span data-testid="player-id">{context.playerId}</span>
      <span data-testid="is-playing">{context.isPlaying ? 'true' : 'false'}</span>
    </div>
  );
};

describe('MultiplayerGameWrapper', () => {
  let sendMessage: jest.Mock;
  let messageHandlers: Map<string, ((data: unknown) => void)[]>;
  let onMessage: jest.Mock;

  beforeEach(() => {
    sendMessage = jest.fn();
    messageHandlers = new Map();
    onMessage = jest.fn((event: string, handler: (data: unknown) => void) => {
      if (!messageHandlers.has(event)) {
        messageHandlers.set(event, []);
      }
      messageHandlers.get(event)!.push(handler);
      return () => {
        const handlers = messageHandlers.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      };
    });
  });

  const triggerMessage = (data: string) => {
    const handlers = messageHandlers.get('message') || [];
    handlers.forEach((handler) => handler(data));
  };

  it('should provide multiplayer context to children', () => {
    render(
      <MultiplayerGameWrapper
        playerId="player1"
        sendMessage={sendMessage}
        onMessage={onMessage}
      >
        <TestChild />
      </MultiplayerGameWrapper>
    );

    expect(screen.getByTestId('is-multiplayer')).toHaveTextContent('true');
    expect(screen.getByTestId('player-id')).toHaveTextContent('player1');
  });

  it('should pass game state to children', () => {
    render(
      <MultiplayerGameWrapper
        playerId="player1"
        sendMessage={sendMessage}
        onMessage={onMessage}
      >
        <TestChild />
      </MultiplayerGameWrapper>
    );

    const stateUpdate = {
      type: MessageType.STATE_UPDATE,
      payload: {
        gameState: {
          status: 'playing' as const,
          currentRound: 1,
          players: [
            { id: 'player1', name: 'Player 1', score: 100, wordsCollected: 2, isConnected: true },
          ],
        },
        timestamp: Date.now(),
      },
    };

    act(() => {
      triggerMessage(JSON.stringify(stateUpdate));
    });

    expect(screen.getByTestId('is-playing')).toHaveTextContent('true');
  });

  it('should call onRoundStart callback', () => {
    const onRoundStart = jest.fn();
    render(
      <MultiplayerGameWrapper
        playerId="player1"
        sendMessage={sendMessage}
        onMessage={onMessage}
        onRoundStart={onRoundStart}
      >
        <TestChild />
      </MultiplayerGameWrapper>
    );

    const roundStart = {
      type: MessageType.ROUND_START,
      payload: {
        roundNumber: 1,
        totalRounds: 3,
        vocabularyPack: { packId: 'default', items: [] },
        timeLimit: 120,
      },
    };

    act(() => {
      triggerMessage(JSON.stringify(roundStart));
    });

    expect(onRoundStart).toHaveBeenCalledWith(1, 3, 120);
  });

  it('should call onRoundEnd callback', () => {
    const onRoundEnd = jest.fn();
    render(
      <MultiplayerGameWrapper
        playerId="player1"
        sendMessage={sendMessage}
        onMessage={onMessage}
        onRoundEnd={onRoundEnd}
      >
        <TestChild />
      </MultiplayerGameWrapper>
    );

    const roundEnd = {
      type: MessageType.ROUND_END,
      payload: {
        roundNumber: 1,
        rankings: [{ playerId: 'player1', score: 100, position: 1 }],
      },
    };

    act(() => {
      triggerMessage(JSON.stringify(roundEnd));
    });

    expect(onRoundEnd).toHaveBeenCalledWith([{ playerId: 'player1', score: 100, position: 1 }]);
  });

  it('should call onGameOver callback', () => {
    const onGameOver = jest.fn();
    render(
      <MultiplayerGameWrapper
        playerId="player1"
        sendMessage={sendMessage}
        onMessage={onMessage}
        onGameOver={onGameOver}
      >
        <TestChild />
      </MultiplayerGameWrapper>
    );

    const gameOver = {
      type: MessageType.GAME_OVER,
      payload: {
        finalRankings: [
          { playerId: 'player1', score: 300, position: 1, xpBonus: 150 },
        ],
        totalRounds: 3,
      },
    };

    act(() => {
      triggerMessage(JSON.stringify(gameOver));
    });

    expect(onGameOver).toHaveBeenCalledWith([
      { playerId: 'player1', score: 300, position: 1, xpBonus: 150 },
    ]);
  });

  it('should provide default context values', () => {
    const DefaultTestChild = () => {
      const context = React.useContext(MultiplayerGameContext);
      return (
        <div data-testid="default-child">
          <span data-testid="default-is-multiplayer">{context.isMultiplayer ? 'true' : 'false'}</span>
        </div>
      );
    };

    render(
      <MultiplayerGameContext.Provider
        value={{
          gameState: null,
          isPlaying: false,
          currentRound: 0,
          totalRounds: 0,
          players: [],
          submitWord: () => {},
          optimisticWords: [],
          rejectedWords: [],
          clearRejectedWords: () => {},
          playerId: '',
          isMultiplayer: false,
        }}
      >
        <DefaultTestChild />
      </MultiplayerGameContext.Provider>
    );

    expect(screen.getByTestId('default-is-multiplayer')).toHaveTextContent('false');
  });
});
