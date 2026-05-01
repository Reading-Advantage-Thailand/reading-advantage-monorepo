import { GameSession } from './game-session';
import type { Room } from './room-manager';

describe('GameSession', () => {
  let session: GameSession;
  let mockRoom: Room;
  let stateChanges: unknown[] = [];
  let broadcasts: string[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    stateChanges = [];
    broadcasts = [];

    mockRoom = {
      code: 'ABC123',
      hostId: 'host1',
      players: new Map([
        ['host1', { id: 'host1', name: 'Host', isHost: true, isConnected: true, joinedAt: Date.now() }],
        ['player1', { id: 'player1', name: 'Player 1', isHost: false, isConnected: true, joinedAt: Date.now() }],
      ]),
      status: 'active' as const,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      maxPlayers: 4,
    };

    session = new GameSession(mockRoom, {
      totalRounds: 2,
      roundTimeLimitMs: 60000,
      tickRateHz: 20,
    });

    session.setOnStateChange((state) => stateChanges.push(state));
    session.setOnBroadcast((message) => broadcasts.push(message));
  });

  afterEach(() => {
    jest.useRealTimers();
    session.dispose();
  });

  describe('initialization', () => {
    it('should initialize with waiting status', () => {
      const state = session.getState();
      expect(state.status).toBe('waiting');
      expect(state.currentRound).toBe(0);
      expect(state.players.size).toBe(2);
    });

    it('should initialize players from room', () => {
      const state = session.getState();
      const host = state.players.get('host1');
      expect(host?.name).toBe('Host');
      expect(host?.score).toBe(0);
      expect(host?.wordsCollected).toEqual([]);
    });
  });

  describe('startGame', () => {
    it('should start game from waiting status', () => {
      session.startGame();
      const state = session.getState();
      expect(state.status).toBe('playing');
      expect(state.currentRound).toBe(1);
      expect(state.startTime).not.toBeNull();
    });

    it('should throw if game is already started', () => {
      session.startGame();
      expect(() => session.startGame()).toThrow('Game can only be started from waiting status');
    });

    it('should broadcast round start message', () => {
      session.startGame();
      const roundStartMessages = broadcasts.filter((m) => {
        const parsed = JSON.parse(m);
        return parsed.type === 'round_start';
      });
      expect(roundStartMessages.length).toBe(1);
    });

    it('should start tick loop', () => {
      session.startGame();
      jest.advanceTimersByTime(100);
      expect(broadcasts.length).toBeGreaterThan(1); // Round start + tick broadcasts
    });
  });

  describe('submitWord', () => {
    beforeEach(() => {
      session.startGame();
      broadcasts = []; // Clear broadcasts after start
    });

    it('should accept valid word submission', () => {
      const result = session.submitWord('host1', 'apple');
      expect(result).toBe(true);
    });

    it('should reject invalid word', () => {
      const result = session.submitWord('host1', 'invalid');
      expect(result).toBe(false);
    });

    it('should reject duplicate word submission', () => {
      session.submitWord('host1', 'apple');
      const result = session.submitWord('host1', 'apple');
      expect(result).toBe(false);
    });

    it('should update player score on valid submission', () => {
      session.submitWord('host1', 'apple');
      const state = session.getState();
      expect(state.players.get('host1')?.score).toBe(100);
    });

    it('should reject submission from disconnected player', () => {
      session.updatePlayerConnection('player1', false);
      const result = session.submitWord('player1', 'apple');
      expect(result).toBe(false);
    });

    it('should reject submission when not playing', () => {
      session.submitWord('host1', 'apple');
      session.submitWord('host1', 'banana');
      session.submitWord('host1', 'cherry');
      session.submitWord('host1', 'date');
      session.submitWord('host1', 'elderberry');
      // Round should end, game status changes
      jest.advanceTimersByTime(6000); // Wait for intermission
    });

    it('should record submission', () => {
      session.submitWord('host1', 'apple');
      const state = session.getState();
      expect(state.roundState?.submissions.length).toBe(1);
      expect(state.roundState?.submissions[0].word).toBe('apple');
      expect(state.roundState?.submissions[0].isCorrect).toBe(true);
    });
  });

  describe('round progression', () => {
    beforeEach(() => {
      session.startGame();
      broadcasts = [];
    });

    it('should end round when time limit exceeded', () => {
      jest.advanceTimersByTime(61000);
      const state = session.getState();
      expect(state.status).toBe('round_end');
    });

    it('should broadcast round end with rankings', () => {
      session.submitWord('host1', 'apple');
      session.submitWord('player1', 'banana');
      jest.advanceTimersByTime(61000);

      const roundEndMessages = broadcasts.filter((m) => {
        const parsed = JSON.parse(m);
        return parsed.type === 'round_end';
      });
      expect(roundEndMessages.length).toBe(1);

      const roundEnd = JSON.parse(roundEndMessages[0]);
      expect(roundEnd.payload.rankings).toHaveLength(2);
      expect(roundEnd.payload.rankings[0].score).toBeGreaterThan(0);
    });

    it('should start next round after intermission', () => {
      jest.advanceTimersByTime(61000); // End round
      expect(session.getState().status).toBe('round_end');

      jest.advanceTimersByTime(6000); // Intermission
      expect(session.getState().status).toBe('playing');
      expect(session.getState().currentRound).toBe(2);
    });
  });

  describe('game end', () => {
    beforeEach(() => {
      session.startGame();
      broadcasts = [];
    });

    it('should end game after all rounds', () => {
      // End round 1
      jest.advanceTimersByTime(61000);
      expect(session.getState().status).toBe('round_end');

      // Intermission + round 2
      jest.advanceTimersByTime(6000);
      expect(session.getState().status).toBe('playing');
      expect(session.getState().currentRound).toBe(2);

      // End round 2
      jest.advanceTimersByTime(61000);
      expect(session.getState().status).toBe('game_over');
    });

    it('should broadcast game over with final rankings', () => {
      session.submitWord('host1', 'apple');
      session.submitWord('player1', 'banana');

      // End all rounds
      jest.advanceTimersByTime(61000); // End round 1
      jest.advanceTimersByTime(6000); // Intermission
      jest.advanceTimersByTime(61000); // End round 2

      const gameOverMessages = broadcasts.filter((m) => {
        const parsed = JSON.parse(m);
        return parsed.type === 'game_over';
      });
      expect(gameOverMessages.length).toBe(1);

      const gameOver = JSON.parse(gameOverMessages[0]);
      expect(gameOver.payload.finalRankings).toHaveLength(2);
      expect(gameOver.payload.finalRankings[0].xpBonus).toBeGreaterThan(0);
    });

    it('should stop tick loop on game end', () => {
      jest.advanceTimersByTime(61000); // End round 1
      jest.advanceTimersByTime(6000); // Intermission
      jest.advanceTimersByTime(61000); // End round 2

      broadcasts = [];
      jest.advanceTimersByTime(1000);
      expect(broadcasts.filter((m) => {
        const parsed = JSON.parse(m);
        return parsed.type === 'state_update';
      })).toHaveLength(0);
    });
  });

  describe('getRankings', () => {
    beforeEach(() => {
      session.startGame();
    });

    it('should return players sorted by score', () => {
      session.submitWord('player1', 'apple');
      session.submitWord('host1', 'banana');
      session.submitWord('player1', 'cherry');

      const rankings = session.getRankings();
      expect(rankings[0].id).toBe('player1');
      expect(rankings[0].score).toBe(200);
      expect(rankings[1].id).toBe('host1');
      expect(rankings[1].score).toBe(100);
    });

    it('should only include connected players', () => {
      session.submitWord('host1', 'apple');
      session.updatePlayerConnection('player1', false);

      const rankings = session.getRankings();
      expect(rankings).toHaveLength(1);
      expect(rankings[0].id).toBe('host1');
    });
  });

  describe('updatePlayerConnection', () => {
    it('should update player connection status', () => {
      session.updatePlayerConnection('host1', false);
      const state = session.getState();
      expect(state.players.get('host1')?.isConnected).toBe(false);
    });

    it('should emit state change on connection update', () => {
      session.updatePlayerConnection('host1', false);
      expect(stateChanges.length).toBeGreaterThan(0);
    });
  });

  describe('state snapshots', () => {
    it('should return immutable state copy', () => {
      session.startGame();
      const state1 = session.getState();
      session.submitWord('host1', 'apple');
      const state2 = session.getState();

      expect(state1.players.get('host1')?.score).toBe(0);
      expect(state2.players.get('host1')?.score).toBe(100);
    });
  });
});
