'use client';

import { useEffect, useState } from 'react';
import { getLevelName } from '@/lib/gamification/xp';

interface LevelUpAnimationProps {
  oldLevel: number;
  newLevel: number;
  onDismiss?: () => void;
}

function ParticleEffects({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-amber-400"
          style={{
            animation: `particle-burst 1.5s ease-out forwards`,
            animationDelay: `${i * 0.05}s`,
            '--angle': `${(i / 12) * 360}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function LevelUpAnimation({ oldLevel, newLevel, onDismiss }: LevelUpAnimationProps) {
  const [visible, setVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alert"
      aria-label={`Level up! You are now ${getLevelName(newLevel)}`}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
      />

      <div
        className={`relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-amber-300 bg-white p-10 shadow-2xl ${
          prefersReducedMotion ? '' : 'animate-level-up'
        }`}
      >
        <ParticleEffects reducedMotion={prefersReducedMotion} />

        <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
          Level Up!
        </p>

        <div className="flex items-center gap-4 text-2xl font-bold text-gray-900">
          <span className="rounded-lg bg-gray-100 px-4 py-2">
            {getLevelName(oldLevel)}
          </span>
          <span className="text-amber-500" aria-hidden="true">
            →
          </span>
          <span className="rounded-lg bg-amber-100 px-4 py-2 text-amber-700">
            {getLevelName(newLevel)}
          </span>
        </div>

        <button
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="mt-2 rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
