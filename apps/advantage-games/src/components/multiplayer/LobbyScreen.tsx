import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Crown, UserX, ArrowRightLeft, Loader2 } from 'lucide-react';

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
}

export interface LobbyScreenProps {
  mode: 'create' | 'join' | 'lobby';
  roomCode?: string;
  players?: LobbyPlayer[];
  currentPlayerId?: string;
  gameName?: string;
  onCreateRoom: (playerName: string, gameId?: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onStartGame: () => void;
  onKickPlayer: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  onLeaveRoom: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function LobbyScreen({
  mode: initialMode,
  roomCode,
  players = [],
  currentPlayerId,
  gameName,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onKickPlayer,
  onTransferHost,
  onLeaveRoom,
  isLoading = false,
  error = null,
}: LobbyScreenProps) {
  const [mode, setMode] = useState<'create' | 'join' | 'lobby'>(initialMode);
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedGame, setSelectedGame] = useState('');

  const isHost = currentPlayerId
    ? players.find((p) => p.id === currentPlayerId)?.isHost ?? false
    : false;

  const connectedPlayers = players.filter((p) => p.isConnected);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onCreateRoom(playerName.trim(), selectedGame || undefined);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && roomCodeInput.trim()) {
      onJoinRoom(roomCodeInput.trim().toUpperCase(), playerName.trim());
    }
  };

  if (mode === 'lobby' || (roomCode && players.length > 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Game Lobby</CardTitle>
                {gameName && (
                  <CardDescription>{gameName}</CardDescription>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Room Code</p>
                <p className="text-2xl font-bold tracking-wider" data-testid="room-code">
                  {roomCode}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{connectedPlayers.length} player{connectedPlayers.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`player-${player.id}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        player.isConnected ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="font-medium">{player.name}</span>
                    {player.isHost && (
                      <Crown className="w-4 h-4 text-yellow-500" data-testid="host-icon" />
                    )}
                  </div>
                  {isHost && player.id !== currentPlayerId && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onTransferHost(player.id)}
                        title="Transfer host"
                        data-testid={`transfer-host-${player.id}`}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onKickPlayer(player.id)}
                        title="Kick player"
                        data-testid={`kick-player-${player.id}`}
                      >
                        <UserX className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {isHost ? (
              <Button
                onClick={onStartGame}
                disabled={connectedPlayers.length < 2 || isLoading}
                className="w-full min-h-11"
                data-testid="start-game-btn"
              >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Game'
                  )}
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-2">
                  Waiting for host to start the game...
                </div>
              )}
              <Button
                variant="outline"
                onClick={onLeaveRoom}
                disabled={isLoading}
                className="w-full min-h-11"
              >
                Leave Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">Multiplayer Lobby</CardTitle>
          <CardDescription className="text-center">
            Create or join a game room
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'create' ? 'default' : 'outline'}
              onClick={() => setMode('create')}
              className="flex-1"
              data-testid="create-tab"
            >
              Create Room
            </Button>
            <Button
              variant={mode === 'join' ? 'default' : 'outline'}
              onClick={() => setMode('join')}
              className="flex-1"
              data-testid="join-tab"
            >
              Join Room
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Your Name</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  data-testid="player-name-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Game (optional)</label>
                <Input
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  placeholder="Select a game"
                  data-testid="game-select"
                />
              </div>
              <Button
                type="submit"
                disabled={!playerName.trim() || isLoading}
                className="w-full"
                data-testid="create-room-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Room'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Room Code</label>
                <Input
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  maxLength={6}
                  data-testid="room-code-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Your Name</label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  data-testid="player-name-input"
                />
              </div>
              <Button
                type="submit"
                disabled={!playerName.trim() || !roomCodeInput.trim() || isLoading}
                className="w-full"
                data-testid="join-room-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LobbyScreen;
