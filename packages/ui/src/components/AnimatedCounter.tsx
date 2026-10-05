"use client";

import * as React from "react";
import { cn } from "@reading-advantage/utils";

/** Props for AnimatedCounter. */
export interface AnimatedCounterProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The number to count to. */
  value: number;
  /** Length of the count in milliseconds. */
  duration?: number;
  /** Turns the number into the shown text. */
  format?: (value: number) => string;
}

/**
 * Tells if the user asks for reduced motion.
 * @returns True when the reduced-motion media query matches.
 */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * Counts a number up to its value. With reduced motion it shows the value at once.
 * Screen readers get only the final value; the moving digits are hidden from them.
 * @param props The value, the duration, an optional formatter, and span attributes.
 * @returns The counter element.
 */
export function AnimatedCounter({
  value,
  duration = 800,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  className,
  ...props
}: AnimatedCounterProps) {
  const [shown, setShown] = React.useState(0);
  const shownRef = React.useRef(0);

  React.useEffect(() => {
    const from = shownRef.current;
    const show = (n: number) => {
      shownRef.current = n;
      setShown(n);
    };
    if (from === value || duration <= 0 || prefersReducedMotion()) {
      show(value);
      return;
    }
    let start: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      show(from + (value - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span data-slot="animated-counter" className={cn("tabular-nums", className)} {...props}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
