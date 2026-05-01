"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Gamepad2, Play, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { VocabularyItem } from "@/store/useGameStore";

export interface Instruction {
  step: number;
  text: React.ReactNode;
  icon?: LucideIcon;
}

export interface ControlHint {
  label: React.ReactNode;
  keys: React.ReactNode;
  color: string;
}

export interface GameStartScreenProps {
  gameTitle: React.ReactNode;
  vocabulary: VocabularyItem[];
  onStart: () => void;
  gameSubtitle?: React.ReactNode;
  instructions?: Instruction[];
  proTip?: React.ReactNode;
  controls?: ControlHint[];
  startButtonText?: React.ReactNode;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

/**
 * Shared RPG-themed start screen for vocabulary games.
 * Renders instructions, vocabulary list, and a CTA to begin play.
 */
export function GameStartScreen({
  gameTitle,
  vocabulary,
  onStart,
  gameSubtitle,
  instructions,
  proTip,
  controls,
  startButtonText = "Start Game",
  icon: TitleIcon = Gamepad2,
  children,
}: GameStartScreenProps) {
  const hasInstructions = Boolean(instructions && instructions.length > 0);
  const hasControls = Boolean(controls && controls.length > 0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <TitleIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
                {gameTitle}
              </h2>
            </div>
          </div>
          {gameSubtitle ? (
            <div className="px-4 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wider">
              {gameSubtitle}
            </div>
          ) : null}
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm space-y-4">
              <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                <Sparkles className="w-5 h-5 text-amber-400" /> How to Play
              </h3>
              {hasInstructions ? (
                <ul className="space-y-3 text-sm text-slate-300">
                  {instructions?.map((instruction, index) => {
                    const InstructionIcon = instruction.icon;
                    const stepLabel = String(
                      instruction.step ?? index + 1,
                    ).padStart(2, "0");
                    return (
                      <li key={index} className="flex gap-3">
                        <span className="text-amber-400 font-bold">
                          {stepLabel}.
                        </span>
                        <span className="flex items-start gap-2">
                          {InstructionIcon ? (
                            <InstructionIcon className="h-4 w-4 text-amber-300 mt-0.5" />
                          ) : null}
                          <span>{instruction.text}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">
                  Instructions will appear once the game is ready.
                </p>
              )}
            </div>

            {proTip ? (
              <div className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <Sparkles className="w-6 h-6 text-amber-300 shrink-0" />
                <p>
                  <b>Pro Tip:</b> {proTip}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-lg text-white">
                <BookOpen className="w-5 h-5 text-emerald-400" /> Vocabulary
                List
              </h3>
              <span className="text-xs text-white/40">
                {vocabulary.length} Sentences
              </span>
            </div>
            <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/50 scrollbar-thin scrollbar-thumb-white/10">
              {vocabulary.length === 0 ? (
                <div className="p-8 text-center text-white/40 italic">
                  No sentences loaded...
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {vocabulary.map((item, i) => (
                    <div
                      key={`${item.term}-${i}`}
                      className="flex flex-col gap-1 p-3 px-4 hover:bg-white/5 transition-colors"
                    >
                      <span className="font-medium text-white leading-snug">
                        {item.term}
                      </span>
                      <span className="text-slate-400 text-sm leading-snug">
                        {item.translation}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="p-6 sm:p-8 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex flex-col gap-6">
        {hasControls ? (
          <div className="hidden sm:flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] text-white/50 sm:text-xs flex-wrap">
            {controls?.map((control, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${control.color}`} />
                {control.label}: {control.keys}
              </div>
            ))}
          </div>
        ) : (
          !children && (
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-white/40">
              Prepare your strategy
            </span>
          )
        )}

        <div className="flex w-full items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">{children}</div>

          <button
            onClick={onStart}
            className={`group relative px-12 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 ${isDark ? "focus-visible:ring-offset-slate-950" : "focus-visible:ring-offset-white"}`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span className="relative z-10">{startButtonText}</span>
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
          </button>
        </div>
      </footer>
    </motion.div>
  );
}
