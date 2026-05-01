import http from 'http';
import { createWebSocketServer } from './ws-server';
import { getGlobalRoomManager, resetGlobalRoomManager } from './room-manager';

// Mock ws module
jest.mock('ws', () => {
  const mockClients = new Set<MockWebSocket>();
  let connectionHandler: ((ws: MockWebSocket) => void) | null = null;
  let closeHandler: (() => void) | null = null;

  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = 1;
    metadata: { isAlive: boolean; playerId?: string; roomCode?: string } | null = null;
    private eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    messagesSent: string[] = [];

    on(event: string, handler: (...args: unknown[]) => void) {
      if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
      this.eventHandlers[event].push(handler);
    }

    emit(event: string, ...args: unknown[]) {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event].forEach((h) => h(...args));
      }
    }

    send(data: string) {
      this.messagesSent.push(data);
    }

    ping() {
      // Simulate pong after ping
      setTimeout(() => {
        if (this.metadata && this.metadata.isAlive === false) {
          this.terminate();
        }
      }, 100);
    }

    pong() {
      if (this.metadata) this.metadata.isAlive = true;
    }

    terminate() {
      this.readyState = 3;
      this.emit('close');
      mockClients.delete(this);
    }

    close() {
      this.readyState = 3;
      this.emit('close');
      mockClients.delete(this);
    }

    simulateMessage(data: string | object) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      if (this.eventHandlers['message']) {
        this.eventHandlers['message'].forEach((h) => h(Buffer.from(payload)));
      }
    }
  }

  class MockWebSocketServer {
    clients = mockClients;
    private eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    options: Record<string, unknown>;

    constructor(options: Record<string, unknown>) {
      this.options = options;
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
      this.eventHandlers[event].push(handler);
      if (event === 'connection') connectionHandler = handler as (ws: MockWebSocket) => void;
      if (event === 'close') closeHandler = handler;
    }

    emit(event: string, ...args: unknown[]) {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event].forEach((h) => h(...args));
      }
    }

    close(callback?: () => void) {
      if (closeHandler) closeHandler();
      if (callback) callback();
    }

    simulateConnection(client: MockWebSocket) {
      mockClients.add(client);
      if (connectionHandler) connectionHandler(client);
    }
  }

  return {
    WebSocket: MockWebSocket,
    WebSocketServer: MockWebSocketServer,
  };
});

const wsModule = jest.requireMock('ws');
const WebSocket = wsModule.WebSocket;

describe('WebSocket Server Room Integration', () => {
  let httpServer: http.Server;
  let wss: InstanceType<typeof wsModule.WebSocketServer>;
  let hostClient: InstanceType<typeof WebSocket>;
  let playerClient: InstanceType<typeof WebSocket>;

  beforeAll(async () => {
    jest.useFakeTimers();
    httpServer = http.createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, resolve);
    });
    wss = createWebSocketServer(httpServer);
  }, 10000);

  afterAll(async () => {
    jest.useRealTimers();
    await new Promise<void>((resolve) => {
      wss.close(() => {
        httpServer.close(() => resolve());
      });
    });
  }, 10000);

  beforeEach(() => {
    resetGlobalRoomManager();
    hostClient = new WebSocket('ws://localhost:1234');
    playerClient = new WebSocket('ws://localhost:1234');
    wss.simulateConnection(hostClient);
    wss.simulateConnection(playerClient);
  });

  describe('Room Creation', () => {
    it('should create a room and return room code', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
          gameId: 'wizard-vs-zombie',
        },
      });

      expect(hostClient.messagesSent.length).toBeGreaterThan(0);
      const response = JSON.parse(hostClient.messagesSent[0]);
      expect(response.type).toBe('state_update');
      expect(response.payload.roomCode).toBeDefined();
      expect(response.payload.roomCode.length).toBe(6);
      expect(response.payload.gameState.players).toHaveLength(1);
      expect(response.payload.gameState.players[0].name).toBe('Host Player');
      expect(response.payload.gameState.players[0].isHost).toBe(true);
    });

    it('should track client metadata after room creation', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
        },
      });

      expect(hostClient.metadata?.playerId).toBe('host1');
      expect(hostClient.metadata?.roomCode).toBeDefined();
    });
  });

  describe('Room Joining', () => {
    it('should allow player to join a room', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
        },
      });

      const roomCode = JSON.parse(hostClient.messagesSent[0]).payload.roomCode;

      playerClient.simulateMessage({
        type: 'join_room',
        payload: {
          roomCode,
          playerId: 'player1',
          playerName: 'Player 1',
        },
      });

      // Host should receive player list update
      const hostMessages = hostClient.messagesSent.map((m: string) => JSON.parse(m));
      const playerListUpdates = hostMessages.filter((m: { type: string }) => m.type === 'state_update');
      expect(playerListUpdates.length).toBeGreaterThanOrEqual(2);
      expect(playerListUpdates[playerListUpdates.length - 1].payload.gameState.players).toHaveLength(2);
    });

    it('should reject join for non-existent room', () => {
      playerClient.simulateMessage({
        type: 'join_room',
        payload: {
          roomCode: 'NONEXIST',
          playerId: 'player1',
          playerName: 'Player 1',
        },
      });

      // Should receive error message for non-existent room
      expect(playerClient.messagesSent.length).toBeGreaterThan(0);
      const errorResponse = JSON.parse(playerClient.messagesSent[0]);
      expect(errorResponse.error).toContain('Room not found');
    });
  });

  describe('Room Lifecycle', () => {
    it('should handle player leaving room', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
        },
      });

      const roomCode = JSON.parse(hostClient.messagesSent[0]).payload.roomCode;

      playerClient.simulateMessage({
        type: 'join_room',
        payload: {
          roomCode,
          playerId: 'player1',
          playerName: 'Player 1',
        },
      });

      // Clear messages
      hostClient.messagesSent = [];

      playerClient.simulateMessage({
        type: 'leave_room',
        payload: {
          playerId: 'player1',
        },
      });

      const hostMessages = hostClient.messagesSent.map((m: string) => JSON.parse(m));
      const updates = hostMessages.filter((m: { type: string }) => m.type === 'state_update');
      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.payload.gameState.players).toHaveLength(2);
      expect(lastUpdate.payload.gameState.players[0].id).toBe('host1');
      expect(lastUpdate.payload.gameState.players[1].isConnected).toBe(false);
    });

    it('should clean up room when all players disconnect', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
        },
      });

      const roomCode = JSON.parse(hostClient.messagesSent[0]).payload.roomCode;
      const roomManager = getGlobalRoomManager();

      hostClient.close();

      expect(roomManager.getRoom(roomCode)?.status || 'expired').toBe('expired');
    });
  });

  describe('Host Actions', () => {
    it('should allow host to kick a player', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
        },
      });

      const roomCode = JSON.parse(hostClient.messagesSent[0]).payload.roomCode;

      playerClient.simulateMessage({
        type: 'join_room',
        payload: {
          roomCode,
          playerId: 'player1',
          playerName: 'Player 1',
        },
      });

      // Clear messages
      hostClient.messagesSent = [];

      hostClient.simulateMessage({
        type: 'kick_player',
        payload: {
          roomCode,
          hostId: 'host1',
          playerId: 'player1',
        },
      });

      const hostMessages = hostClient.messagesSent.map((m: string) => JSON.parse(m));
      const updates = hostMessages.filter((m: { type: string }) => m.type === 'state_update');
      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.payload.gameState.players).toHaveLength(1);
      expect(lastUpdate.payload.gameState.players[0].id).toBe('host1');
    });

    it('should allow host to transfer host privileges', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
        },
      });

      const roomCode = JSON.parse(hostClient.messagesSent[0]).payload.roomCode;

      playerClient.simulateMessage({
        type: 'join_room',
        payload: {
          roomCode,
          playerId: 'player1',
          playerName: 'Player 1',
        },
      });

      // Clear messages
      hostClient.messagesSent = [];

      hostClient.simulateMessage({
        type: 'transfer_host',
        payload: {
          roomCode,
          currentHostId: 'host1',
          newHostId: 'player1',
        },
      });

      const hostMessages = hostClient.messagesSent.map((m: string) => JSON.parse(m));
      const update = hostMessages.find((m: { type: string }) => m.type === 'state_update');
      expect(update.payload.gameState.players[1].isHost).toBe(true);
      expect(update.payload.gameState.players[0].isHost).toBe(false);
    });
  });

  describe('Game Start', () => {
    it('should broadcast round start when host starts game', () => {
      hostClient.simulateMessage({
        type: 'create_room',
        payload: {
          playerId: 'host1',
          playerName: 'Host Player',
        },
      });

      const roomCode = JSON.parse(hostClient.messagesSent[0]).payload.roomCode;

      playerClient.simulateMessage({
        type: 'join_room',
        payload: {
          roomCode,
          playerId: 'player1',
          playerName: 'Player 1',
        },
      });

      // Clear messages
      hostClient.messagesSent = [];
      playerClient.messagesSent = [];

      hostClient.simulateMessage({
        type: 'start_game',
        payload: {
          roomCode,
        },
      });

      const hostMessages = hostClient.messagesSent.map((m: string) => JSON.parse(m));
      const playerMessages = playerClient.messagesSent.map((m: string) => JSON.parse(m));

      const hostRoundStart = hostMessages.find((m: { type: string }) => m.type === 'round_start');
      const playerRoundStart = playerMessages.find((m: { type: string }) => m.type === 'round_start');

      expect(hostRoundStart).toBeDefined();
      expect(playerRoundStart).toBeDefined();
      expect(hostRoundStart.payload.roundNumber).toBe(1);
    });
  });
});
