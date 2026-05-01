import { RoomManager, getGlobalRoomManager, resetGlobalRoomManager } from './room-manager';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new RoomManager();
    resetGlobalRoomManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createRoom', () => {
    it('should create a room with a unique code', () => {
      const room = manager.createRoom('host1', 'Host Player');
      expect(room.code).toBeDefined();
      expect(room.code.length).toBe(6);
      expect(room.hostId).toBe('host1');
      expect(room.status).toBe('pending');
      expect(room.players.size).toBe(1);
      expect(room.players.get('host1')?.isHost).toBe(true);
    });

    it('should create rooms with unique codes', () => {
      const room1 = manager.createRoom('host1', 'Host 1');
      const room2 = manager.createRoom('host2', 'Host 2');
      expect(room1.code).not.toBe(room2.code);
    });

    it('should include gameId when provided', () => {
      const room = manager.createRoom('host1', 'Host', 'wizard-vs-zombie');
      expect(room.gameId).toBe('wizard-vs-zombie');
    });

    it('should set maxPlayers from options', () => {
      const customManager = new RoomManager({ maxPlayers: 2 });
      const room = customManager.createRoom('host1', 'Host');
      expect(room.maxPlayers).toBe(2);
    });
  });

  describe('joinRoom', () => {
    it('should allow a player to join a room', () => {
      const room = manager.createRoom('host1', 'Host');
      const updated = manager.joinRoom(room.code, 'player1', 'Player 1');
      expect(updated.players.size).toBe(2);
      expect(updated.players.get('player1')?.name).toBe('Player 1');
      expect(updated.players.get('player1')?.isHost).toBe(false);
    });

    it('should throw when joining a non-existent room', () => {
      expect(() => manager.joinRoom('NONEXIST', 'player1', 'Player 1')).toThrow(
        'Room not found: NONEXIST'
      );
    });

    it('should throw when joining an expired room', () => {
      const room = manager.createRoom('host1', 'Host');
      room.status = 'expired';
      expect(() => manager.joinRoom(room.code, 'player1', 'Player 1')).toThrow(
        `Room ${room.code} has expired`
      );
    });

    it('should throw when joining an active room', () => {
      const room = manager.createRoom('host1', 'Host');
      room.status = 'active';
      expect(() => manager.joinRoom(room.code, 'player1', 'Player 1')).toThrow(
        `Room ${room.code} is already active`
      );
    });

    it('should throw when room is full', () => {
      const customManager = new RoomManager({ maxPlayers: 2 });
      const room = customManager.createRoom('host1', 'Host');
      customManager.joinRoom(room.code, 'player1', 'Player 1');
      expect(() => customManager.joinRoom(room.code, 'player2', 'Player 2')).toThrow(
        `Room ${room.code} is full`
      );
    });

    it('should allow reconnection of existing player', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      room.players.get('player1')!.isConnected = false;
      
      const updated = manager.joinRoom(room.code, 'player1', 'Player 1 Reconnected');
      expect(updated.players.get('player1')?.isConnected).toBe(true);
      expect(updated.players.get('player1')?.name).toBe('Player 1 Reconnected');
    });

    it('should update lastActivityAt on join', () => {
      const room = manager.createRoom('host1', 'Host');
      const beforeJoin = room.lastActivityAt;
      jest.advanceTimersByTime(100);
      const updated = manager.joinRoom(room.code, 'player1', 'Player 1');
      expect(updated.lastActivityAt).toBeGreaterThan(beforeJoin);
    });
  });

  describe('leaveRoom', () => {
    it('should mark player as disconnected', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      const updated = manager.leaveRoom(room.code, 'player1');
      expect(updated.players.get('player1')?.isConnected).toBe(false);
    });

    it('should promote another player when host leaves', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      const updated = manager.leaveRoom(room.code, 'host1');
      expect(updated.hostId).toBe('player1');
      expect(updated.players.get('player1')?.isHost).toBe(true);
    });

    it('should expire room when all players leave', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.leaveRoom(room.code, 'host1');
      expect(room.status).toBe('expired');
    });

    it('should expire room when host leaves and no one else is connected', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      manager.leaveRoom(room.code, 'player1');
      const updated = manager.leaveRoom(room.code, 'host1');
      expect(updated.status).toBe('expired');
    });

    it('should throw when leaving a non-existent room', () => {
      expect(() => manager.leaveRoom('NONEXIST', 'player1')).toThrow(
        'Room not found: NONEXIST'
      );
    });

    it('should throw when player is not in room', () => {
      const room = manager.createRoom('host1', 'Host');
      expect(() => manager.leaveRoom(room.code, 'player1')).toThrow(
        `Player player1 not in room ${room.code}`
      );
    });
  });

  describe('getRoom', () => {
    it('should return room by code', () => {
      const room = manager.createRoom('host1', 'Host');
      expect(manager.getRoom(room.code)).toBe(room);
    });

    it('should return undefined for non-existent room', () => {
      expect(manager.getRoom('NONEXIST')).toBeUndefined();
    });
  });

  describe('getPlayerRoom', () => {
    it('should return room containing player', () => {
      const room = manager.createRoom('host1', 'Host');
      expect(manager.getPlayerRoom('host1')).toBe(room);
    });

    it('should return undefined for player not in any room', () => {
      expect(manager.getPlayerRoom('player1')).toBeUndefined();
    });
  });

  describe('setRoomStatus', () => {
    it('should update room status', () => {
      const room = manager.createRoom('host1', 'Host');
      const updated = manager.setRoomStatus(room.code, 'active');
      expect(updated.status).toBe('active');
    });

    it('should update lastActivityAt', () => {
      const room = manager.createRoom('host1', 'Host');
      const before = room.lastActivityAt;
      jest.advanceTimersByTime(100);
      const updated = manager.setRoomStatus(room.code, 'active');
      expect(updated.lastActivityAt).toBeGreaterThan(before);
    });

    it('should throw for non-existent room', () => {
      expect(() => manager.setRoomStatus('NONEXIST', 'active')).toThrow(
        'Room not found: NONEXIST'
      );
    });
  });

  describe('cleanupExpiredRooms', () => {
    it('should remove expired rooms', () => {
      const room = manager.createRoom('host1', 'Host');
      room.status = 'expired';
      const cleaned = manager.cleanupExpiredRooms();
      expect(cleaned).toBe(1);
      expect(manager.getRoom(room.code)).toBeUndefined();
    });

    it('should expire inactive rooms', () => {
      const customManager = new RoomManager({ inactivityTimeoutMs: 1000 });
      const room = customManager.createRoom('host1', 'Host');
      jest.advanceTimersByTime(1100);
      const cleaned = customManager.cleanupExpiredRooms();
      expect(cleaned).toBe(1);
      expect(customManager.getRoom(room.code)).toBeUndefined();
    });

    it('should not remove active rooms', () => {
      const room = manager.createRoom('host1', 'Host');
      const cleaned = manager.cleanupExpiredRooms();
      expect(cleaned).toBe(0);
      expect(manager.getRoom(room.code)).toBeDefined();
    });
  });

  describe('getRoomCount', () => {
    it('should return number of rooms', () => {
      expect(manager.getRoomCount()).toBe(0);
      manager.createRoom('host1', 'Host');
      expect(manager.getRoomCount()).toBe(1);
    });
  });

  describe('getAllRooms', () => {
    it('should return all rooms', () => {
      const room1 = manager.createRoom('host1', 'Host 1');
      const room2 = manager.createRoom('host2', 'Host 2');
      const rooms = manager.getAllRooms();
      expect(rooms).toHaveLength(2);
      expect(rooms).toContain(room1);
      expect(rooms).toContain(room2);
    });
  });

  describe('kickPlayer', () => {
    it('should allow host to kick a player', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      const updated = manager.kickPlayer(room.code, 'host1', 'player1');
      expect(updated.players.has('player1')).toBe(false);
    });

    it('should throw when non-host tries to kick', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      expect(() => manager.kickPlayer(room.code, 'player1', 'host1')).toThrow(
        'Only the host can kick players'
      );
    });

    it('should throw when kicking non-existent player', () => {
      const room = manager.createRoom('host1', 'Host');
      expect(() => manager.kickPlayer(room.code, 'host1', 'player1')).toThrow(
        'Player player1 not in room'
      );
    });
  });

  describe('transferHost', () => {
    it('should transfer host to another player', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      const updated = manager.transferHost(room.code, 'host1', 'player1');
      expect(updated.hostId).toBe('player1');
      expect(updated.players.get('player1')?.isHost).toBe(true);
      expect(updated.players.get('host1')?.isHost).toBe(false);
    });

    it('should throw when non-host tries to transfer', () => {
      const room = manager.createRoom('host1', 'Host');
      manager.joinRoom(room.code, 'player1', 'Player 1');
      expect(() => manager.transferHost(room.code, 'player1', 'host1')).toThrow(
        'Only the host can transfer host privileges'
      );
    });

    it('should throw when transferring to non-existent player', () => {
      const room = manager.createRoom('host1', 'Host');
      expect(() => manager.transferHost(room.code, 'host1', 'player1')).toThrow(
        'Player player1 not in room'
      );
    });
  });

  describe('global room manager', () => {
    it('should return singleton instance', () => {
      const instance1 = getGlobalRoomManager();
      const instance2 = getGlobalRoomManager();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getGlobalRoomManager();
      resetGlobalRoomManager();
      const instance2 = getGlobalRoomManager();
      expect(instance1).not.toBe(instance2);
    });
  });
});
