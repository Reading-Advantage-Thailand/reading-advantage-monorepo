import { ScoringEngine } from './scoring-engine';
import { GameSession } from './game-session';
import { RoomManager } from './room-manager';
import type { Room } from './room-manager';

/**
 * Runs one benchmark callback several times and returns the fastest duration
 * in milliseconds. The fastest run is the one least disturbed by other work on
 * the machine, so the threshold measures the code and not the CI load.
 * @param runs Number of measured attempts.
 * @param work Callback that performs one complete measured run.
 * @returns The smallest duration of the measured runs, in milliseconds.
 */
function fastestRunMs(runs: number, work: () => void): number {
  let fastest = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < runs; attempt += 1) {
    const start = performance.now();
    work();
    fastest = Math.min(fastest, performance.now() - start);
  }
  return fastest;
}

describe('Multiplayer Performance Benchmarks', () => {
  describe('ScoringEngine Performance', () => {
    it('should calculate 1000 word scores in under 10ms', () => {
      const duration = fastestRunMs(5, () => {
        const engine = new ScoringEngine();
        engine.startRound(1);

        for (let i = 0; i < 1000; i++) {
          engine.submitWord('player1', `word${i}`, Math.random() * 5000);
        }
      });

      expect(duration).toBeLessThan(10);
    });

    it('should handle anti-cheat validation for 1000 submissions in under 5ms', () => {
      const duration = fastestRunMs(5, () => {
        const engine = new ScoringEngine();
        engine.startRound(1);

        for (let i = 0; i < 1000; i++) {
          engine.validateScoreSubmission('player1', 100);
        }
      });

      expect(duration).toBeLessThan(5);
    });
  });

  describe('GameSession Performance', () => {
    const room: Room = {
      code: 'TEST123',
      hostId: 'host1',
      players: new Map([
        ['host1', { id: 'host1', name: 'Host', isHost: true, isConnected: true, joinedAt: Date.now() }],
        ['player1', { id: 'player1', name: 'Player 1', isHost: false, isConnected: true, joinedAt: Date.now() }],
        ['player2', { id: 'player2', name: 'Player 2', isHost: false, isConnected: true, joinedAt: Date.now() }],
        ['player3', { id: 'player3', name: 'Player 3', isHost: false, isConnected: true, joinedAt: Date.now() }],
      ]),
      status: 'active',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      maxPlayers: 4,
    };

    it('should process 100 word submissions in under 50ms', () => {
      const duration = fastestRunMs(5, () => {
        const session = new GameSession(room);
        session.startGame();

        for (let i = 0; i < 100; i++) {
          session.submitWord('host1', 'apple');
        }
      });

      expect(duration).toBeLessThan(50);
    });

    it('should generate state snapshots in under 5ms', () => {
      const duration = fastestRunMs(5, () => {
        const session = new GameSession(room);
        session.startGame();

        // Add some submissions
        for (let i = 0; i < 10; i++) {
          session.submitWord('host1', 'apple');
        }

        for (let i = 0; i < 100; i++) {
          session.getState();
        }
      });

      expect(duration).toBeLessThan(5);
    });
  });

  describe('RoomManager Performance', () => {
    it('should create 100 rooms in under 10ms', () => {
      const duration = fastestRunMs(5, () => {
        const manager = new RoomManager();

        for (let i = 0; i < 100; i++) {
          manager.createRoom(`host${i}`, `Host ${i}`);
        }
      });

      expect(duration).toBeLessThan(10);
    });

    it('should join 100 players in under 10ms', () => {
      const duration = fastestRunMs(5, () => {
        const manager = new RoomManager({ maxPlayers: 200 });
        const roomToJoin = manager.createRoom('host1', 'Host');

        for (let i = 0; i < 100; i++) {
          manager.joinRoom(roomToJoin.code, `player${i}`, `Player ${i}`);
        }
      });

      expect(duration).toBeLessThan(10);
    });
  });
});
