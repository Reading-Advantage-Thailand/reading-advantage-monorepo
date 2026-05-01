'use client';

import { useEffect, useRef, useState } from 'react';

interface ConfettiCelebrationProps {
  trigger: boolean;
  intensity?: 'low' | 'medium' | 'high';
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle';
  opacity: number;
}

const COLORS = [
  'oklch(0.33 0.04 150)',  // forest green
  'oklch(0.68 0.12 35)',   // terracotta coral
  'oklch(0.78 0.04 70)',   // warm tan
  'oklch(0.75 0.15 80)',   // gold/amber
  'oklch(0.65 0.18 30)',   // deep coral
  'oklch(0.50 0.06 150)',  // dark green
];

const INTENSITY_PARTICLES: Record<'low' | 'medium' | 'high', number> = {
  low: 20,
  medium: 50,
  high: 80,
};

function createParticle(canvasWidth: number): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: -10 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    opacity: 1,
  };
}

function ReducedMotionFallback({ onComplete }: { onComplete?: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="rounded-2xl border-4 border-amber-400 bg-white px-8 py-6 shadow-lg"
        role="status"
        aria-label="Congratulations"
      >
        <p className="text-2xl font-bold text-amber-600">Congratulations!</p>
      </div>
    </div>
  );
}

export function ConfettiCelebration({
  trigger,
  intensity = 'medium',
  onComplete,
}: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!trigger || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particleCount = INTENSITY_PARTICLES[intensity];
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(canvas.width)
    );
    startTimeRef.current = performance.now();

    function animate(now: number) {
      const elapsed = (now - startTimeRef.current) / 1000;
      if (elapsed > 3) {
        onComplete?.();
        return;
      }

      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.vy += 0.1; // gravity
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // fade out in last second
        if (elapsed > 2) {
          p.opacity = Math.max(0, 1 - (elapsed - 2));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trigger, intensity, onComplete, prefersReducedMotion]);

  if (!trigger) return null;

  if (prefersReducedMotion) {
    return <ReducedMotionFallback onComplete={onComplete} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  );
}
