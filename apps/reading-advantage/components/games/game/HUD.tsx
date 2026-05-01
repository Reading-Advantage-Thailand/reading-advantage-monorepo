"use client";

import React from "react";
import { Trophy, Target, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HUDProps {
  score: number;
  accuracy: number;
  combo: number;
  mana: number;
  timeRemaining: number;
}

export function HUD({ score, accuracy, combo, mana, timeRemaining }: HUDProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return (
    <div className="absolute top-0 left-0 right-0 p-2 sm:p-6 flex items-start justify-between z-20 pointer-events-none">
      {/* Left: Score & Combo */}
      <div className="flex flex-col gap-1 sm:gap-2">
        <div className="min-w-0 rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 px-2.5 sm:px-5 py-2 sm:py-3 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-1 sm:gap-2 mb-0.5">
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/60">
              Score
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-white leading-none">
            {score}
          </div>
        </div>

        {/* Combo Counter */}
        <AnimatePresence>
          {combo > 1 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              key={combo}
              className="min-w-0 rounded-lg sm:rounded-xl border border-orange-500/30 bg-orange-950/40 px-2 sm:px-4 py-1 sm:py-2 backdrop-blur-md shadow-lg"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400 animate-pulse" />
                <div className="text-sm sm:text-lg font-black italic text-orange-400 tracking-wider">
                  {combo}x
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center: Title/Mana/Timer */}
      <div className="flex flex-col items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
        <div className="hidden sm:block text-white/40 text-sm font-medium uppercase tracking-[0.3em] bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm border border-white/5">
          Magic Defense
        </div>

        {/* Mana Bar */}
        <div className="w-24 sm:w-64 h-2 sm:h-3 bg-slate-800/80 rounded-full border border-white/10 overflow-hidden relative backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
            animate={{ width: `${mana}%` }}
          />
          {mana >= 100 && (
            <motion.div
              className="absolute inset-0 bg-white/30"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
        </div>

        {/* Timer Display */}
        <div
          className={`text-xl sm:text-2xl font-black tracking-widest ${timeRemaining <= 10 ? "text-red-500 animate-pulse" : "text-white"}`}
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          {formattedTime}
        </div>
        {mana >= 100 && (
          <motion.div
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="hidden sm:block text-[10px] font-bold text-cyan-300 uppercase tracking-widest animate-pulse"
          >
            Ultimate Ready (Space)
          </motion.div>
        )}
      </div>

      {/* Right: Accuracy */}
      <div className="min-w-0 rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 px-2.5 sm:px-5 py-2 sm:py-3 backdrop-blur-md shadow-lg text-right">
        <div className="flex items-center justify-end gap-1 sm:gap-2 mb-0.5">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/60">
            Acc
          </div>
          <Target className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" />
        </div>
        <div className="text-lg sm:text-2xl font-bold text-white leading-none">
          {Math.round(accuracy * 100)}%
        </div>
      </div>
    </div>
  );
}
