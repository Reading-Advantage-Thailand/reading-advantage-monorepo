import type { Room } from './room-manager';
import { MessageType, serializeMessage } from '@/types/multiplayer';

export type GameSessionStatus = 'waiting' | 'playing' | 'round_end' | 'game_over';

export interface GameSessionConfig {
  totalRounds: number;
  roundTimeLimitMs: number;
  tickRateHz: number;
}

export interface WordSubmission {
  playerId: string;
  word: string;
  timestamp: number;
  isCorrect: boolean;
}

export interface PlayerGameState {
  id: string;
  name: string;
  score: number;
  wordsCollected: string[];
  isConnected: boolean;
}

export interface RoundState {
  roundNumber: number;
  startTime: number;
  endTime: number | null;
  submissions: WordSubmission[];
  currentWords: string[];
}

export interface GameSessionState {
  status: GameSessionStatus;
  currentRound: number;
  totalRounds: number;
  players: Map<string, PlayerGameState>;
  roundState: RoundState | null;
  startTime: number | null;
  endTime: number | null;
}

const DEFAULT_CONFIG: GameSessionConfig = {
  totalRounds: 3,
  roundTimeLimitMs: 120000, // 2 minutes
  tickRateHz: 20,
};

export class GameSession {
  private state: GameSessionState;
  private config: GameSessionConfig;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private onStateChange: ((state: GameSessionState) => void) | null = null;
  private onBroadcast: ((message: string) => void) | null = null;

  constructor(room: Room, config: Partial<GameSessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      status: 'waiting',
      currentRound: 0,
      totalRounds: this.config.totalRounds,
      players: new Map(),
      roundState: null,
      startTime: null,
      endTime: null,
    };

    // Initialize players from room
    room.players.forEach((player) => {
      this.state.players.set(player.id, {
        id: player.id,
        name: player.name,
        score: 0,
        wordsCollected: [],
        isConnected: player.isConnected,
      });
    });
  }

  setOnStateChange(callback: (state: GameSessionState) => void): void {
    this.onStateChange = callback;
  }

  setOnBroadcast(callback: (message: string) => void): void {
    this.onBroadcast = callback;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  private broadcastState(): void {
    if (this.onBroadcast) {
      const stateUpdate = serializeMessage({
        type: MessageType.STATE_UPDATE,
        payload: {
          gameState: this.serializeGameState(),
          timestamp: Date.now(),
        },
      });
      this.onBroadcast(stateUpdate);
    }
  }

  startGame(): void {
    if (this.state.status !== 'waiting') {
      throw new Error('Game can only be started from waiting status');
    }

    this.state.status = 'playing';
    this.state.startTime = Date.now();
    this.state.currentRound = 1;
    this.startRound();
    this.startTickLoop();
    this.emitState();
  }

  private startRound(): void {
    const roundStartTime = Date.now();
    this.state.roundState = {
      roundNumber: this.state.currentRound,
      startTime: roundStartTime,
      endTime: null,
      submissions: [],
      currentWords: this.generateWords(),
    };

    // Broadcast round start
    if (this.onBroadcast) {
      const roundStart = serializeMessage({
        type: MessageType.ROUND_START,
        payload: {
          roundNumber: this.state.currentRound,
          totalRounds: this.config.totalRounds,
          vocabularyPack: { packId: 'default', items: [] },
          timeLimit: Math.floor(this.config.roundTimeLimitMs / 1000),
        },
      });
      this.onBroadcast(roundStart);
    }
  }

  private generateWords(): string[] {
    // Placeholder - in production, this would fetch from vocabulary pack
    return ['apple', 'banana', 'cherry', 'date', 'elderberry'];
  }

  private startTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    const tickMs = 1000 / this.config.tickRateHz;
    this.tickInterval = setInterval(() => {
      this.tick();
    }, tickMs);
  }

  private tick(): void {
    if (this.state.status !== 'playing') {
      return;
    }

    // Check if round time limit exceeded
    if (this.state.roundState) {
      const elapsed = Date.now() - this.state.roundState.startTime;
      if (elapsed >= this.config.roundTimeLimitMs) {
        this.endRound();
      }
    }

    // Broadcast current state at tick rate
    this.broadcastState();
  }

  submitWord(playerId: string, word: string): boolean {
    if (this.state.status !== 'playing' || !this.state.roundState) {
      return false;
    }

    const player = this.state.players.get(playerId);
    if (!player || !player.isConnected) {
      return false;
    }

    // Validate word hasn't been submitted already
    if (player.wordsCollected.includes(word)) {
      return false;
    }

    // Validate word is in current round's word list
    const isCorrect = this.state.roundState.currentWords.includes(word);
    if (!isCorrect) {
      return false;
    }

    // Record submission
    const submission: WordSubmission = {
      playerId,
      word,
      timestamp: Date.now(),
      isCorrect,
    };
    this.state.roundState.submissions.push(submission);

    // Update player score
    player.wordsCollected.push(word);
    player.score += 100; // Base score for correct word

    // Check if round should end (all words collected)
    const allWordsCollected = this.state.roundState.currentWords.every((w) =>
      Array.from(this.state.players.values()).some((p) => p.wordsCollected.includes(w))
    );

    if (allWordsCollected) {
      this.endRound();
    }

    this.emitState();
    return true;
  }

  private endRound(): void {
    if (!this.state.roundState) {
      return;
    }

    this.state.roundState.endTime = Date.now();

    // Broadcast round end with rankings
    if (this.onBroadcast) {
      const rankings = this.getRankings();
      const roundEnd = serializeMessage({
        type: MessageType.ROUND_END,
        payload: {
          roundNumber: this.state.currentRound,
          rankings: rankings.map((r, index) => ({
            playerId: r.id,
            score: r.score,
            position: index + 1,
          })),
        },
      });
      this.onBroadcast(roundEnd);
    }

    // Check if game is over
    if (this.state.currentRound >= this.config.totalRounds) {
      this.endGame();
    } else {
      // Start next round after a short delay
      this.state.status = 'round_end';
      setTimeout(() => {
        this.state.currentRound++;
        this.state.status = 'playing';
        this.startRound();
      }, 5000); // 5 second intermission
    }

    this.emitState();
  }

  private endGame(): void {
    this.state.status = 'game_over';
    this.state.endTime = Date.now();

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Broadcast game over with final rankings
    if (this.onBroadcast) {
      const rankings = this.getRankings();
      const xpBonuses = [0.5, 0.25, 0.1, 0]; // 1st, 2nd, 3rd, others

      const gameOver = serializeMessage({
        type: MessageType.GAME_OVER,
        payload: {
          finalRankings: rankings.map((r, index) => ({
            playerId: r.id,
            score: r.score,
            position: index + 1,
            xpBonus: Math.floor(r.score * (xpBonuses[index] || 0)),
          })),
          totalRounds: this.config.totalRounds,
        },
      });
      this.onBroadcast(gameOver);
    }

    this.emitState();
  }

  getRankings(): PlayerGameState[] {
    return Array.from(this.state.players.values())
      .filter((p) => p.isConnected)
      .sort((a, b) => b.score - a.score);
  }

  getState(): GameSessionState {
    const playersCopy = new Map<string, PlayerGameState>();
    this.state.players.forEach((player, id) => {
      playersCopy.set(id, { ...player, wordsCollected: [...player.wordsCollected] });
    });

    return {
      ...this.state,
      players: playersCopy,
      roundState: this.state.roundState
        ? {
            ...this.state.roundState,
            submissions: [...this.state.roundState.submissions],
            currentWords: [...this.state.roundState.currentWords],
          }
        : null,
    };
  }

  private serializeGameState() {
    return {
      status: this.state.status,
      currentRound: this.state.currentRound,
      players: Array.from(this.state.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        wordsCollected: p.wordsCollected.length,
        isConnected: p.isConnected,
      })),
    };
  }

  updatePlayerConnection(playerId: string, isConnected: boolean): void {
    const player = this.state.players.get(playerId);
    if (player) {
      player.isConnected = isConnected;
      this.emitState();
    }
  }

  dispose(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
