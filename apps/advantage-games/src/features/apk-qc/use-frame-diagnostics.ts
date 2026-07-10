"use client";

import { useEffect, useState } from "react";

/** Rolling browser animation-frame sample displayed by the QC diagnostics panel. */
export interface FrameDiagnostics {
  /** Approximate animation frames per second. */
  fps: number;
  /** Approximate milliseconds per animation frame. */
  frameTime: number;
}

/**
 * Samples browser animation frames without coupling the cartridge to telemetry.
 * @param enabled Whether the QC debug panel is collecting frame evidence.
 * @returns The latest rolling FPS and frame-time sample.
 */
export function useFrameDiagnostics(enabled: boolean): FrameDiagnostics {
  const [sample, setSample] = useState<FrameDiagnostics>({ fps: 0, frameTime: 0 });

  useEffect(() => {
    if (!enabled) return;
    let animationFrame = 0;
    let frameCount = 0;
    let windowStartedAt = performance.now();

    const measure = (now: number) => {
      frameCount += 1;
      const elapsed = now - windowStartedAt;
      if (elapsed >= 500) {
        const fps = Math.round((frameCount * 1_000) / elapsed);
        setSample({ fps, frameTime: fps === 0 ? 0 : Math.round((1_000 / fps) * 10) / 10 });
        frameCount = 0;
        windowStartedAt = now;
      }
      animationFrame = requestAnimationFrame(measure);
    };

    animationFrame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animationFrame);
  }, [enabled]);

  return sample;
}
