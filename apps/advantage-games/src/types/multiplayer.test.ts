import {
  type JoinMessage,
  type LeaveMessage,
  type StateUpdateMessage,
  type ScoreSubmitMessage,
  type RoundStartMessage,
  type RoundEndMessage,
  type GameOverMessage,
  type PlayerState,
  type GameState,
  MessageType,
  serializeMessage,
  deserializeMessage,
} from './multiplayer';

describe('Multiplayer Message Types', () => {
  describe('MessageType enum', () => {
    it('should define all required message types', () => {
      expect(MessageType.JOIN).toBe('join');
      expect(MessageType.LEAVE).toBe('leave');
      expect(MessageType.STATE_UPDATE).toBe('state_update');
      expect(MessageType.SCORE_SUBMIT).toBe('score_submit');
      expect(MessageType.ROUND_START).toBe('round_start');
      expect(MessageType.ROUND_END).toBe('round_end');
      expect(MessageType.GAME_OVER).toBe('game_over');
    });
  });

  describe('serializeMessage', () => {
    it('should serialize a join message', () => {
      const message: JoinMessage = {
        type: MessageType.JOIN,
        payload: {
          roomCode: 'ABC123',
          playerName: 'TestPlayer',
          playerId: 'player-1',
        },
      };
      const serialized = serializeMessage(message);
      expect(serialized).toBe(JSON.stringify(message));
    });

    it('should serialize a state update message', () => {
      const message: StateUpdateMessage = {
        type: MessageType.STATE_UPDATE,
        payload: {
          gameState: {
            status: 'playing',
            currentRound: 1,
            players: [
              {
                id: 'player-1',
                name: 'TestPlayer',
                score: 100,
                wordsCollected: 5,
                isConnected: true,
              },
            ],
          },
          timestamp: Date.now(),
        },
      };
      const serialized = serializeMessage(message);
      expect(serialized).toBe(JSON.stringify(message));
    });

    it('should serialize a score submit message', () => {
      const message: ScoreSubmitMessage = {
        type: MessageType.SCORE_SUBMIT,
        payload: {
          playerId: 'player-1',
          score: 150,
          wordsCollected: ['word1', 'word2'],
          timeTaken: 5000,
        },
      };
      const serialized = serializeMessage(message);
      expect(serialized).toBe(JSON.stringify(message));
    });
  });

  describe('deserializeMessage', () => {
    it('should deserialize a join message', () => {
      const original: JoinMessage = {
        type: MessageType.JOIN,
        payload: {
          roomCode: 'ABC123',
          playerName: 'TestPlayer',
          playerId: 'player-1',
        },
      };
      const serialized = JSON.stringify(original);
      const deserialized = deserializeMessage(serialized);
      expect(deserialized).toEqual(original);
    });

    it('should deserialize a leave message', () => {
      const original: LeaveMessage = {
        type: MessageType.LEAVE,
        payload: {
          playerId: 'player-1',
          reason: 'disconnected',
        },
      };
      const serialized = JSON.stringify(original);
      const deserialized = deserializeMessage(serialized);
      expect(deserialized).toEqual(original);
    });

    it('should deserialize a round start message', () => {
      const original: RoundStartMessage = {
        type: MessageType.ROUND_START,
        payload: {
          roundNumber: 2,
          totalRounds: 5,
          vocabularyPack: {
            packId: 'test-pack',
            items: [{ term: 'hello', translation: 'world' }],
          },
          timeLimit: 60,
        },
      };
      const serialized = JSON.stringify(original);
      const deserialized = deserializeMessage(serialized);
      expect(deserialized).toEqual(original);
    });

    it('should deserialize a round end message', () => {
      const original: RoundEndMessage = {
        type: MessageType.ROUND_END,
        payload: {
          roundNumber: 1,
          rankings: [
            { playerId: 'player-1', score: 100, position: 1 },
            { playerId: 'player-2', score: 80, position: 2 },
          ],
        },
      };
      const serialized = JSON.stringify(original);
      const deserialized = deserializeMessage(serialized);
      expect(deserialized).toEqual(original);
    });

    it('should deserialize a game over message', () => {
      const original: GameOverMessage = {
        type: MessageType.GAME_OVER,
        payload: {
          finalRankings: [
            { playerId: 'player-1', score: 300, position: 1, xpBonus: 50 },
            { playerId: 'player-2', score: 200, position: 2, xpBonus: 25 },
          ],
          totalRounds: 3,
        },
      };
      const serialized = JSON.stringify(original);
      const deserialized = deserializeMessage(serialized);
      expect(deserialized).toEqual(original);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => deserializeMessage('invalid json')).toThrow();
    });

    it('should throw error for messages without type', () => {
      expect(() => deserializeMessage('{"payload": {}}')).toThrow('Invalid message: missing type');
    });

    it('should throw error for unknown message types', () => {
      expect(() => deserializeMessage('{"type": "unknown", "payload": {}}')).toThrow(
        'Unknown message type: unknown'
      );
    });
  });

  describe('type guards', () => {
    it('should validate PlayerState structure', () => {
      const player: PlayerState = {
        id: 'player-1',
        name: 'TestPlayer',
        score: 100,
        wordsCollected: 5,
        isConnected: true,
      };
      expect(player.id).toBe('player-1');
      expect(player.score).toBe(100);
    });

    it('should validate GameState structure', () => {
      const state: GameState = {
        status: 'playing',
        currentRound: 1,
        players: [],
      };
      expect(state.status).toBe('playing');
      expect(state.currentRound).toBe(1);
    });
  });
});
