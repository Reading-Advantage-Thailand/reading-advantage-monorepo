import { ScoringEngine } from './scoring-engine';
import { GameSession } from './game-session';
import { RoomManager } from './room-manager';
import type { Room } from './room-manager';

describe('Multiplayer Performance Benchmarks', () => {
  describe('ScoringEngine Performance', () => {
    it('should calculate 1000 word scores in under 10ms', () => {
      const engine = new ScoringEngine();
      engine.startRound(1);

      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        engine.submitWord('player1', `word${i}`, Math.random() * 5000);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
    });

    it('should handle anti-cheat validation for 1000 submissions in under 5ms', () => {
      const engine = new ScoringEngine();
      engine.startRound(1);

      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        engine.validateScoreSubmission('player1', 100);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5);
    });
  });

  describe('GameSession Performance', () => {
    it('should process 100 word submissions in under 50ms', () => {
      const mockRoom: Room = {
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

      const session = new GameSession(mockRoom);
      session.startGame();

      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        session.submitWord('host1', 'apple');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50);
    });

    it('should generate state snapshots in under 5ms', () => {
      const mockRoom: Room = {
        code: 'TEST123',
        hostId: 'host1',
        players: new Map([
          ['host1', { id: 'host1', name: 'Host', isHost: true, isConnected: true, joinedAt: Date.now() }],
        ]),
        status: 'active',
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        maxPlayers: 4,
      };

      const session = new GameSession(mockRoom);
      session.startGame();

      // Add some submissions
      for (let i = 0; i < 10; i++) {
        session.submitWord('host1', 'apple');
      }

      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        session.getState();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5);
    });
  });

  describe('RoomManager Performance', () => {
    it('should create 100 rooms in under 10ms', () => {
      const manager = new RoomManager();

      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        manager.createRoom(`host${i}`, `Host ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
    });

    it('should join 100 players in under 10ms', () => {
      const manager = new RoomManager({ maxPlayers: 200 });
      const room = manager.createRoom('host1', 'Host');

      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        manager.joinRoom(room.code, `player${i}`, `Player ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
    });
  });
});
