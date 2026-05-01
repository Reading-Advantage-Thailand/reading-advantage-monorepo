import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Timer, TrendingUp } from 'lucide-react';

export interface ScoreboardPlayer {
  id: string;
  name: string;
  score: number;
  wordsCollected: number;
  isConnected: boolean;
  position?: number;
}

export interface ScoreboardOverlayProps {
  players: ScoreboardPlayer[];
  currentRound: number;
  totalRounds: number;
  timeRemaining?: number;
  isVisible: boolean;
  onClose?: () => void;
}

export function ScoreboardOverlay({
  players,
  currentRound,
  totalRounds,
  timeRemaining,
  isVisible,
  onClose,
}: ScoreboardOverlayProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-x-0 top-0 z-50 p-4"
    >
      <div className="mx-auto max-w-md rounded-xl bg-card/95 backdrop-blur-sm border shadow-lg">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold">Round {currentRound}/{totalRounds}</span>
          </div>
          {timeRemaining !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <Timer className="w-4 h-4" />
              <span className={timeRemaining <= 10 ? 'text-destructive font-bold' : ''}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          )}
        </div>

        <div className="p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-muted/50'
                }`}
                data-testid={`player-score-${player.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      player.isConnected ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="font-medium text-sm">{player.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>{player.wordsCollected}</span>
                  </div>
                  <motion.span
                    key={player.score}
                    initial={{ scale: 1.2, color: '#22c55e' }}
                    animate={{ scale: 1, color: 'inherit' }}
                    className="font-bold text-sm min-w-[3rem] text-right"
                  >
                    {player.score}
                  </motion.span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default ScoreboardOverlay;
