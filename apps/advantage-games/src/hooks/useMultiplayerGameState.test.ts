import { renderHook, act } from '@testing-library/react';
import { useMultiplayerGameState } from './useMultiplayerGameState';
import { MessageType } from '@/types/multiplayer';

describe('useMultiplayerGameState', () => {
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

  it('should initialize with null game state', () => {
    const { result } = renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, { playerId: 'player1' })
    );

    expect(result.current.gameState).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentRound).toBe(0);
  });

  it('should update game state on STATE_UPDATE message', () => {
    const { result } = renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, { playerId: 'player1' })
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

    expect(result.current.gameState).not.toBeNull();
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentRound).toBe(1);
  });

  it('should handle round start callback', () => {
    const onRoundStart = jest.fn();
    const { result } = renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, {
        playerId: 'player1',
        onRoundStart,
      })
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
    expect(result.current.optimisticWords).toEqual([]);
  });

  it('should handle round end callback', () => {
    const onRoundEnd = jest.fn();
    renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, {
        playerId: 'player1',
        onRoundEnd,
      })
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

  it('should handle game over callback', () => {
    const onGameOver = jest.fn();
    renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, {
        playerId: 'player1',
        onGameOver,
      })
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

  it('should submit word optimistically', () => {
    const { result } = renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, { playerId: 'player1' })
    );

    act(() => {
      result.current.submitWord('apple');
    });

    expect(result.current.optimisticWords).toContain('apple');
    expect(sendMessage).toHaveBeenCalled();

    const sentMessage = JSON.parse(sendMessage.mock.calls[0][0]);
    expect(sentMessage.type).toBe('submit_word');
    expect(sentMessage.payload.word).toBe('apple');
    expect(sentMessage.payload.playerId).toBe('player1');
  });

  it('should clear rejected words', () => {
    const { result } = renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, { playerId: 'player1' })
    );

    // Simulate a state update that would cause rejection
    act(() => {
      result.current.submitWord('apple');
    });

    // Force rejected words by sending a state update with fewer words
    const stateUpdate = {
      type: MessageType.STATE_UPDATE,
      payload: {
        gameState: {
          status: 'playing' as const,
          currentRound: 1,
          players: [
            { id: 'player1', name: 'Player 1', score: 0, wordsCollected: 0, isConnected: true },
          ],
        },
        timestamp: Date.now(),
      },
    };

    act(() => {
      triggerMessage(JSON.stringify(stateUpdate));
    });

    act(() => {
      result.current.clearRejectedWords();
    });

    expect(result.current.rejectedWords).toEqual([]);
  });

  it('should ignore malformed messages', () => {
    const { result } = renderHook(() =>
      useMultiplayerGameState(sendMessage, onMessage, { playerId: 'player1' })
    );

    act(() => {
      triggerMessage('not valid json');
    });

    expect(result.current.gameState).toBeNull();
  });
});
