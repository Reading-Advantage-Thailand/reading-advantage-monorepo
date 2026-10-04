"use client";

import * as React from "react";
import { cn } from "@reading-advantage/utils";

/**
 * Hover lift and press scale for a clickable card. Movement runs only when the user allows motion.
 * Add it to the className of a Card or of a link styled as a card.
 */
export const cardHoverClassName =
  "hover:shadow-md motion-safe:transition-[box-shadow,transform] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.985]";

/**
 * Shows a loading placeholder with a moving shine. The app stylesheet must define the
 * `shimmer` keyframe (Primary: styles/globals.css); without it the placeholder stays still.
 * The placeholder is hidden from assistive technology: mark the loading region with aria-busy.
 * @param props Div attributes; set the size with className.
 * @returns The skeleton element.
 */
export function ShimmerSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      data-slot="shimmer-skeleton"
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,var(--border)_25%,var(--muted)_50%,var(--border)_75%)] bg-[length:600px_100%] motion-safe:animate-[shimmer_1.5s_linear_infinite]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Fades and slides page content in when it mounts (needs tw-animate-css). It does not move
 * when the user asks for reduced motion. Give it a `key` to replay on a route change.
 * @param props Div attributes and the page content as children.
 * @returns The wrapper element.
 */
export function PageTransition({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="page-transition"
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
        className,
      )}
      {...props}
    />
  );
}

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
