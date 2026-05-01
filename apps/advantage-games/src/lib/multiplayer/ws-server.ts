import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager, getGlobalRoomManager, type Room, type Player } from './room-manager';
import { MessageType, serializeMessage } from '@/types/multiplayer';

export const HEARTBEAT_INTERVAL = 30000;
export const HEARTBEAT_TIMEOUT = 90000;

interface ClientMetadata {
  isAlive: boolean;
  playerId?: string;
  roomCode?: string;
}

interface RoomMessage {
  type: 'create_room' | 'join_room' | 'leave_room' | 'start_game' | 'kick_player' | 'transfer_host';
  payload: Record<string, unknown>;
}

function broadcastToRoom(wss: WebSocketServer, roomCode: string, message: string): void {
  wss.clients.forEach((ws: WebSocket) => {
    const client = ws as unknown as { metadata?: ClientMetadata };
    if (client.metadata?.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function getPlayerList(room: Room): Array<{ id: string; name: string; score: number; wordsCollected: number; isConnected: boolean; isHost: boolean }> {
  return Array.from(room.players.values()).map((p: Player) => ({
    id: p.id,
    name: p.name,
    score: 0,
    wordsCollected: 0,
    isConnected: p.isConnected,
    isHost: p.isHost,
  }));
}

function sendPlayerListUpdate(wss: WebSocketServer, room: Room): void {
  const update = serializeMessage({
    type: MessageType.STATE_UPDATE,
    payload: {
      gameState: {
        status: 'waiting',
        currentRound: 0,
        players: getPlayerList(room),
      },
      timestamp: Date.now(),
    },
  });
  broadcastToRoom(wss, room.code, update);
}

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });
  const roomManager = getGlobalRoomManager();

  wss.on('connection', (ws: WebSocket) => {
    const metadata: ClientMetadata = { isAlive: true };
    (ws as unknown as { metadata: ClientMetadata }).metadata = metadata;

    ws.on('pong', () => {
      metadata.isAlive = true;
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as RoomMessage;
        try {
          handleRoomMessage(wss, roomManager, ws, message);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          ws.send(JSON.stringify({ error: errorMessage }));
        }
      } catch {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
    });

    ws.on('close', () => {
      if (metadata.roomCode && metadata.playerId) {
        try {
          const room = roomManager.leaveRoom(metadata.roomCode, metadata.playerId);
          if (room.status !== 'expired') {
            sendPlayerListUpdate(wss, room);
          }
        } catch (error) {
          // Room may already be expired
        }
      }
    });
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const client = ws as unknown as { metadata?: ClientMetadata };
      if (!client.metadata) {
        client.metadata = { isAlive: true };
      }

      if (!client.metadata.isAlive) {
        ws.terminate();
        return;
      }

      client.metadata.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

function handleRoomMessage(
  wss: WebSocketServer,
  roomManager: RoomManager,
  ws: WebSocket,
  message: RoomMessage
): void {
  const client = ws as unknown as { metadata: ClientMetadata };

  switch (message.type) {
    case 'create_room': {
      const { playerId, playerName, gameId } = message.payload as {
        playerId: string;
        playerName: string;
        gameId?: string;
      };
      const room = roomManager.createRoom(playerId, playerName, gameId);
      client.metadata.playerId = playerId;
      client.metadata.roomCode = room.code;

      ws.send(
        serializeMessage({
          type: MessageType.STATE_UPDATE,
          payload: {
            gameState: {
              status: 'waiting',
              currentRound: 0,
              players: getPlayerList(room),
            },
            timestamp: Date.now(),
          },
        })
      );
      break;
    }

    case 'join_room': {
      const { roomCode, playerId, playerName } = message.payload as {
        roomCode: string;
        playerId: string;
        playerName: string;
      };
      const room = roomManager.joinRoom(roomCode, playerId, playerName);
      client.metadata.playerId = playerId;
      client.metadata.roomCode = roomCode;

      sendPlayerListUpdate(wss, room);
      break;
    }

    case 'leave_room': {
      const { playerId } = message.payload as { playerId: string };
      const roomCode = client.metadata.roomCode;
      if (roomCode) {
        const room = roomManager.leaveRoom(roomCode, playerId);
        client.metadata.roomCode = undefined;
        client.metadata.playerId = undefined;

        if (room.status !== 'expired') {
          sendPlayerListUpdate(wss, room);
        }
      }
      break;
    }

    case 'start_game': {
      const { roomCode } = message.payload as { roomCode: string };
      const room = roomManager.getRoom(roomCode);
      if (room) {
        roomManager.setRoomStatus(roomCode, 'active');
        const startMessage = serializeMessage({
          type: MessageType.ROUND_START,
          payload: {
            roundNumber: 1,
            totalRounds: 3,
            vocabularyPack: { packId: 'default', items: [] },
            timeLimit: 120,
          },
        });
        broadcastToRoom(wss, roomCode, startMessage);
      }
      break;
    }

    case 'kick_player': {
      const { roomCode, hostId, playerId } = message.payload as {
        roomCode: string;
        hostId: string;
        playerId: string;
      };
      const room = roomManager.kickPlayer(roomCode, hostId, playerId);
      sendPlayerListUpdate(wss, room);
      break;
    }

    case 'transfer_host': {
      const { roomCode, currentHostId, newHostId } = message.payload as {
        roomCode: string;
        currentHostId: string;
        newHostId: string;
      };
      const room = roomManager.transferHost(roomCode, currentHostId, newHostId);
      sendPlayerListUpdate(wss, room);
      break;
    }

    default:
      ws.send(JSON.stringify({ error: 'Unknown message type' }));
  }
}
