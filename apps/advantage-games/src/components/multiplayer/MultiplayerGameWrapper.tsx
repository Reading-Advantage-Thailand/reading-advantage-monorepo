import React from 'react';
import { useMultiplayerGameState } from '@/hooks/useMultiplayerGameState';
import type { GameState } from '@/types/multiplayer';

export interface MultiplayerGameWrapperProps {
  children: React.ReactNode;
  playerId: string;
  sendMessage: (message: string) => void;
  onMessage: (event: string, handler: (data: unknown) => void) => (() => void);
  onRoundStart?: (roundNumber: number, totalRounds: number, timeLimit: number) => void;
  onRoundEnd?: (rankings: Array<{ playerId: string; score: number; position: number }>) => void;
  onGameOver?: (finalRankings: Array<{ playerId: string; score: number; position: number; xpBonus: number }>) => void;
}

export interface MultiplayerGameContextValue {
  gameState: GameState | null;
  isPlaying: boolean;
  currentRound: number;
  totalRounds: number;
  players: GameState['players'];
  submitWord: (word: string) => void;
  optimisticWords: string[];
  rejectedWords: string[];
  clearRejectedWords: () => void;
  playerId: string;
  isMultiplayer: boolean;
}

export const MultiplayerGameContext = React.createContext<MultiplayerGameContextValue>({
  gameState: null,
  isPlaying: false,
  currentRound: 0,
  totalRounds: 0,
  players: [],
  submitWord: () => {},
  optimisticWords: [],
  rejectedWords: [],
  clearRejectedWords: () => {},
  playerId: '',
  isMultiplayer: false,
});

export function MultiplayerGameWrapper({
  children,
  playerId,
  sendMessage,
  onMessage,
  onRoundStart,
  onRoundEnd,
  onGameOver,
}: MultiplayerGameWrapperProps) {
  const gameState = useMultiplayerGameState(sendMessage, onMessage, {
    playerId,
    onRoundStart,
    onRoundEnd,
    onGameOver,
  });

  const contextValue: MultiplayerGameContextValue = {
    ...gameState,
    playerId,
    isMultiplayer: true,
  };

  return (
    <MultiplayerGameContext.Provider value={contextValue}>
      {children}
    </MultiplayerGameContext.Provider>
  );
}

export function useMultiplayerGameContext(): MultiplayerGameContextValue {
  return React.useContext(MultiplayerGameContext);
}

// Higher-order component for wrapping existing game components
export function withMultiplayer<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P & MultiplayerGameWrapperProps> {
  return function WithMultiplayerComponent(props: P & MultiplayerGameWrapperProps) {
    const { children, ...wrapperProps } = props;

    return (
      <MultiplayerGameWrapper {...wrapperProps}>
        <WrappedComponent {...(props as P)} />
      </MultiplayerGameWrapper>
    );
  };
}
