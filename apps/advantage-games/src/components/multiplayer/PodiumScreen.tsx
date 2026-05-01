import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Star, RotateCcw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PodiumPlayer {
  id: string;
  name: string;
  score: number;
  position: number;
  xpBonus: number;
}

export interface PodiumScreenProps {
  players: PodiumPlayer[];
  totalRounds: number;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export function PodiumScreen({
  players,
  totalRounds,
  onPlayAgain,
  onLeaveRoom,
}: PodiumScreenProps) {
  const sortedPlayers = [...players].sort((a, b) => a.position - b.position);
  const winner = sortedPlayers[0];

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Star className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 2:
        return 'bg-gray-400/10 border-gray-400/20';
      case 3:
        return 'bg-amber-600/10 border-amber-600/20';
      default:
        return 'bg-muted/50';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
          </motion.div>
          <h1 className="text-3xl font-bold">Game Over!</h1>
          <p className="text-muted-foreground">{totalRounds} rounds completed</p>
        </div>

        {/* Winner announcement */}
        {winner && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="text-center p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
          >
            <p className="text-sm text-muted-foreground mb-1">Winner</p>
            <p className="text-2xl font-bold">{winner.name}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-lg font-semibold">{winner.score} points</span>
              <span className="text-sm text-green-600">(+{winner.xpBonus} XP)</span>
            </div>
          </motion.div>
        )}

        {/* Rankings */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-center">Final Rankings</h2>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-xl border ${getPositionColor(player.position)}`}
                data-testid={`podium-player-${player.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
                    {getPositionIcon(player.position)}
                  </div>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Position {player.position}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{player.score}</p>
                  {player.xpBonus > 0 && (
                    <p className="text-sm text-green-600">+{player.xpBonus} XP</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col gap-2"
        >
          <Button onClick={onPlayAgain} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
          <Button variant="outline" onClick={onLeaveRoom} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Leave Room
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default PodiumScreen;
