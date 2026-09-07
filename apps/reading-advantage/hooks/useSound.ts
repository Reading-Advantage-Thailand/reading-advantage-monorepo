"use client";

import { useCallback, useRef } from "react";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * Provides game sound playback with a synthesized fallback.
 * @returns A callback that plays a named game sound.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playSynth = useCallback(
    (
      type:
        | "success"
        | "error"
        | "missile-hit"
        | "bubbling"
        | "clinking"
        | "angry-grunt"
        | "cash-register",
    ) => {
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!ctxRef.current) {
          ctxRef.current = new AudioContextClass();
        }
        const ctx = ctxRef.current;

        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (type === "success" || type === "cash-register") {
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + 0.1,
          );
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.1);
        } else if (type === "error" || type === "angry-grunt") {
          oscillator.type = "square";
          oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + 0.2,
          );
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.2);
        } else if (type === "missile-hit" || type === "bubbling") {
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(110, ctx.currentTime); // A2
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + 0.3,
          );
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
        } else if (type === "clinking") {
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(1320, ctx.currentTime); // E6
          gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            ctx.currentTime + 0.05,
          );
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.05);
        }
      } catch (e) {
        console.warn("Audio synth failed", e);
      }
    },
    [],
  );

  const playSound = useCallback(
    (
      type:
        | "success"
        | "error"
        | "missile-hit"
        | "bubbling"
        | "clinking"
        | "angry-grunt"
        | "cash-register",
    ) => {
      // Try to play file first
      try {
        const audio = new Audio(`/games/sounds/${type}.mp3`);
        audio.volume = 0.5;
        const playback = audio.play();
        void Promise.resolve(playback).catch(() => playSynth(type));
      } catch {
        playSynth(type);
      }
    },
    [playSynth],
  );

  return { playSound };
}
