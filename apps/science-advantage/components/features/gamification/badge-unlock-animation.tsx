'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { BadgeDefinition } from '@/lib/gamification/badges';

interface BadgeUnlockAnimationProps {
  badge: BadgeDefinition;
  onDismiss?: () => void;
}

export function BadgeUnlockAnimation({ badge, onDismiss }: BadgeUnlockAnimationProps) {
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
    }, 4000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alert"
      aria-label={`Badge unlocked: ${badge.name}`}
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
      />
      <div
        className={`relative z-10 flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-white p-8 shadow-xl ${
          prefersReducedMotion ? '' : 'animate-badge-unlock'
        }`}
      >
        <button
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 ${
            prefersReducedMotion ? '' : 'animate-badge-glow'
          }`}
        >
          <span className="text-4xl" role="img" aria-label={badge.name}>
            🏅
          </span>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-600">
            Badge Unlocked!
          </p>
          <h3 className="mt-1 text-xl font-bold text-gray-900">{badge.name}</h3>
          <p className="mt-1 text-sm text-gray-600">{badge.description}</p>
        </div>
      </div>
    </div>
  );
}
