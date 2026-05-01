export type RoomStatus = 'pending' | 'active' | 'completed' | 'expired';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  status: RoomStatus;
  createdAt: number;
  lastActivityAt: number;
  gameId?: string;
  maxPlayers: number;
}

export interface RoomManagerOptions {
  maxPlayers?: number;
  inactivityTimeoutMs?: number;
  codeLength?: number;
}

const DEFAULT_MAX_PLAYERS = 4;
const DEFAULT_INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const DEFAULT_CODE_LENGTH = 6;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private options: Required<RoomManagerOptions>;

  constructor(options: RoomManagerOptions = {}) {
    this.options = {
      maxPlayers: options.maxPlayers ?? DEFAULT_MAX_PLAYERS,
      inactivityTimeoutMs: options.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT,
      codeLength: options.codeLength ?? DEFAULT_CODE_LENGTH,
    };
  }

  private generateCode(): string {
    let code: string;
    do {
      code = '';
      for (let i = 0; i < this.options.codeLength; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostId: string, hostName: string, gameId?: string): Room {
    const code = this.generateCode();
    const now = Date.now();
    const host: Player = {
      id: hostId,
      name: hostName,
      isHost: true,
      isConnected: true,
      joinedAt: now,
    };

    const room: Room = {
      code,
      hostId,
      players: new Map([[hostId, host]]),
      status: 'pending',
      createdAt: now,
      lastActivityAt: now,
      gameId,
      maxPlayers: this.options.maxPlayers,
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, playerId: string, playerName: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room not found: ${code}`);
    }

    if (room.status === 'expired') {
      throw new Error(`Room ${code} has expired`);
    }

    if (room.status === 'active') {
      throw new Error(`Room ${code} is already active`);
    }

    if (room.players.size >= room.maxPlayers) {
      throw new Error(`Room ${code} is full`);
    }

    if (room.players.has(playerId)) {
      // Reconnecting player
      const player = room.players.get(playerId)!;
      player.isConnected = true;
      player.name = playerName;
    } else {
      const player: Player = {
        id: playerId,
        name: playerName,
        isHost: false,
        isConnected: true,
        joinedAt: Date.now(),
      };
      room.players.set(playerId, player);
    }

    room.lastActivityAt = Date.now();
    return room;
  }

  leaveRoom(code: string, playerId: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room not found: ${code}`);
    }

    const player = room.players.get(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not in room ${code}`);
    }

    player.isConnected = false;
    room.lastActivityAt = Date.now();

    // If host leaves, promote another connected player
    if (player.isHost) {
      const connectedPlayers = Array.from(room.players.values()).filter(
        (p) => p.isConnected && p.id !== playerId
      );
      if (connectedPlayers.length > 0) {
        const newHost = connectedPlayers[0];
        newHost.isHost = true;
        room.hostId = newHost.id;
      } else {
        // No connected players left, mark room as expired
        room.status = 'expired';
      }
    }

    // If no connected players remain, mark as expired
    const anyConnected = Array.from(room.players.values()).some((p) => p.isConnected);
    if (!anyConnected) {
      room.status = 'expired';
    }

    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getPlayerRoom(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerId)) {
        return room;
      }
    }
    return undefined;
  }

  setRoomStatus(code: string, status: RoomStatus): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room not found: ${code}`);
    }
    room.status = status;
    room.lastActivityAt = Date.now();
    return room;
  }

  cleanupExpiredRooms(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [code, room] of this.rooms.entries()) {
      if (room.status === 'expired') {
        this.rooms.delete(code);
        cleaned++;
      } else if (now - room.lastActivityAt > this.options.inactivityTimeoutMs) {
        room.status = 'expired';
        this.rooms.delete(code);
        cleaned++;
      }
    }
    return cleaned;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  kickPlayer(code: string, hostId: string, playerId: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room not found: ${code}`);
    }

    if (room.hostId !== hostId) {
      throw new Error('Only the host can kick players');
    }

    if (!room.players.has(playerId)) {
      throw new Error(`Player ${playerId} not in room ${code}`);
    }

    room.players.delete(playerId);
    room.lastActivityAt = Date.now();
    return room;
  }

  transferHost(code: string, currentHostId: string, newHostId: string): Room {
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room not found: ${code}`);
    }

    if (room.hostId !== currentHostId) {
      throw new Error('Only the host can transfer host privileges');
    }

    if (!room.players.has(newHostId)) {
      throw new Error(`Player ${newHostId} not in room ${code}`);
    }

    const currentHost = room.players.get(currentHostId)!;
    const newHost = room.players.get(newHostId)!;

    currentHost.isHost = false;
    newHost.isHost = true;
    room.hostId = newHostId;
    room.lastActivityAt = Date.now();

    return room;
  }
}

// Singleton instance for server use
let globalRoomManager: RoomManager | null = null;

export function getGlobalRoomManager(): RoomManager {
  if (!globalRoomManager) {
    globalRoomManager = new RoomManager();
  }
  return globalRoomManager;
}

export function resetGlobalRoomManager(): void {
  globalRoomManager = null;
}
