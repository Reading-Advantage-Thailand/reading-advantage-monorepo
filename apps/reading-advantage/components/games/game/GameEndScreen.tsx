"use client";

import React from "react";
import { motion } from "framer-motion";
import { RotateCcw, Shield, Swords, Target, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface GameStat {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon;
}

export interface GameEndScreenProps {
  status: "victory" | "defeat" | "complete";
  score: number;
  xp: number;
  accuracy: number;
  onRestart: () => void;
  onExit?: () => void;
  customStats?: GameStat[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  restartButtonText?: React.ReactNode;
}

const STATUS_STYLES: Record<
  GameEndScreenProps["status"],
  {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    containerBorder: string;
    iconShell: string;
    titleColor: string;
    xpShell: string;
  }
> = {
  victory: {
    title: "Victory!",
    subtitle: "The realm stands strong.",
    icon: Shield,
    containerBorder: "border-emerald-500/30",
    iconShell: "bg-emerald-500/20 text-emerald-400",
    titleColor: "text-emerald-400",
    xpShell: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  defeat: {
    title: "Defeated",
    subtitle: "The journey ends here.",
    icon: Swords,
    containerBorder: "border-rose-500/30",
    iconShell: "bg-rose-500/20 text-rose-400",
    titleColor: "text-rose-400",
    xpShell: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
  complete: {
    title: "Complete!",
    subtitle: "Quest objectives achieved.",
    icon: Trophy,
    containerBorder: "border-amber-500/30",
    iconShell: "bg-amber-500/20 text-amber-400",
    titleColor: "text-amber-400",
    xpShell: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
};

/**
 * Shared RPG-themed end screen for vocabulary games.
 * Displays score, accuracy, XP, and optional custom stats.
 */
export function GameEndScreen({
  status,
  score,
  xp,
  accuracy,
  onRestart,
  onExit,
  customStats,
  title,
  subtitle,
  restartButtonText = "Play Again",
}: GameEndScreenProps) {
  const safeAccuracy = Number.isFinite(accuracy)
    ? Math.max(0, Math.min(accuracy, 1))
    : 0;
  const accuracyPercent = Math.round(safeAccuracy * 100);
  const statusStyle = STATUS_STYLES[status];
  const StatusIcon = statusStyle.icon;
  const extraStats = customStats?.slice(0, 2) ?? [];

  const statCards: GameStat[] = [
    { label: "Final Score", value: score, icon: Trophy },
    { label: "Accuracy", value: `${accuracyPercent}%`, icon: Target },
    ...extraStats,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6 text-white"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-xl rounded-3xl border ${statusStyle.containerBorder} bg-slate-900/90 p-8 shadow-2xl`}
      >
        <header className="text-center space-y-2">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${statusStyle.iconShell}`}
          >
            <StatusIcon className="h-9 w-9" />
          </div>
          <h2 className={`text-4xl font-black ${statusStyle.titleColor}`}>
            {title ?? statusStyle.title}
          </h2>
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">
            {subtitle ?? statusStyle.subtitle}
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {statCards.map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center"
              >
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center justify-center gap-1">
                  {StatIcon ? <StatIcon className="h-3 w-3" /> : null}
                  {stat.label}
                </div>
                <div className="text-3xl font-black text-white">
                  {stat.value}
                </div>
              </div>
            );
          })}
          <div
            className={`sm:col-span-2 rounded-2xl border p-4 text-center ${statusStyle.xpShell}`}
          >
            <div className="text-xs uppercase tracking-wider font-bold">
              XP Earned: {xp}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onRestart}
            className="flex-1 rounded-2xl bg-white py-4 text-slate-950 font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <span className="flex items-center justify-center gap-2">
              <RotateCcw className="h-5 w-5" /> {restartButtonText}
            </span>
          </button>
          {onExit ? (
            <button
              onClick={onExit}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-800/70 py-4 text-white font-bold uppercase tracking-widest transition-all hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Exit
            </button>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
