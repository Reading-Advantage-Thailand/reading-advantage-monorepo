// Server-safe motion helpers (no hooks). AnimatedCounter lives in ./AnimatedCounter (client entry).
import * as React from "react";
import { cn } from "@reading-advantage/utils";

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
