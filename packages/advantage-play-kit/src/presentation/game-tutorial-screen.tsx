"use client";

import { useEffect, useRef, type ComponentProps, type CSSProperties, type KeyboardEvent } from "react";

import type { LayoutProfile } from "../responsive/responsive-composition.js";
import type { GameTutorialDefinition } from "./game-tutorial-contract.js";
import type { GameTutorialController, GameTutorialControllerSnapshot } from "./game-tutorial-controller.js";

/** Props for the host-neutral guided tutorial presentation. */
export type GameTutorialScreenProps = Omit<ComponentProps<"section">, "children" | "role" | "aria-label"> & {
  /** The validated cartridge tutorial definition. */
  readonly tutorial: GameTutorialDefinition;
  /** The current tutorial state supplied by the controller boundary. */
  readonly snapshot?: GameTutorialControllerSnapshot;
  /** The host-neutral controller that owns tutorial playback. */
  readonly controller: Pick<GameTutorialController, "pause" | "resume" | "advance" | "replay" | "skip">;
  /** The resolved label for the active semantic target. */
  readonly targetLabel?: string;
  /** The resolved label for the demonstrated cartridge action. */
  readonly actionLabel?: string;
  /** The host-provided educational feedback for the demonstrated consequence. */
  readonly consequenceFeedback?: string;
  /** The resolved feedback label for the demonstrated consequence. */
  readonly consequenceLabel?: string;
  /** Selects the responsive tutorial composition. */
  readonly layoutProfile?: LayoutProfile;
  /** Disables motion-dependent presentation. */
  readonly reducedMotion?: boolean;
  /** A host-neutral renderer error message. */
  readonly error?: string;
  /** Requests a host-owned retry after a renderer error. */
  readonly onRetry?: () => void;
  /** Hides duplicate control buttons when a host provides equivalent controls. */
  readonly showControls?: boolean;
  /** Hides duplicate title and narration landmarks in a compact host preview. */
  readonly compactLandmarks?: boolean;
};

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minBlockSize: "100%",
  maxBlockSize: "100%",
  overflow: "hidden",
  background: "var(--apk-tutorial-background, #07110e)",
  color: "var(--apk-tutorial-text, #f4f0dc)",
  fontFamily: "var(--apk-tutorial-body-font, ui-sans-serif, system-ui, sans-serif)",
};

const actionStyle: CSSProperties = {
  minBlockSize: "48px",
  border: "1px solid var(--apk-tutorial-action-border, #8ce0b8)",
  borderRadius: "var(--apk-tutorial-action-radius, 6px)",
  background: "var(--apk-tutorial-action-background, #102820)",
  color: "var(--apk-tutorial-text, #f4f0dc)",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
  padding: "0.7rem 1rem",
};

/**
 * Renders accessible tutorial guidance without taking gameplay or host authority.
 * @param props The tutorial state, labels, controller commands, and presentation options.
 * @returns A semantic tutorial region or a host-actionable error state.
 */
export function GameTutorialScreen({
  tutorial,
  snapshot,
  controller,
  targetLabel,
  actionLabel,
  consequenceFeedback,
  consequenceLabel,
  layoutProfile = "compact",
  reducedMotion = false,
  error,
  onRetry,
  showControls = true,
  compactLandmarks = false,
  style,
  ...sectionProps
}: GameTutorialScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentStep = snapshot?.currentStep;
  const progress = snapshot?.progress;
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? tutorial.steps.length;
  const stepNumber = Math.min(completed + 1, total);
  const consequence = snapshot?.currentAction?.consequence ?? "neutral";

  useEffect(() => {
    const heading = headingRef.current;
    heading?.focus();
    return () => {
      if (document.activeElement === heading) heading?.blur();
    };
  }, [snapshot?.currentStepId]);

  if (error || !currentStep || !snapshot?.currentTarget || !snapshot.currentAction) {
    return (
      <section {...sectionProps} data-apk-tutorial-screen="true" role="region" aria-label={tutorial.title} style={{ ...rootStyle, ...style }}>
        <div role="alert" style={{ padding: "1rem" }}>{error ?? "Tutorial renderer unavailable"}</div>
        {onRetry ? <button type="button" aria-label="Try tutorial again" onClick={onRetry} style={actionStyle}>Try tutorial again</button> : null}
      </section>
    );
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      controller.advance();
    }
  };
  const narration = consequenceFeedback ?? consequenceLabel ?? `Step ${stepNumber} of ${total}`;
  const regionLabel = tutorial.title.split(" — ")[0] ?? tutorial.title;

  return (
    <section
      {...sectionProps}
      aria-label={regionLabel}
      data-apk-layout-profile={layoutProfile}
      data-apk-reduced-motion={String(reducedMotion)}
      data-apk-tutorial-animation={reducedMotion ? "none" : "host-controlled"}
      data-apk-tutorial-screen="true"
      role="region"
      style={{ ...rootStyle, ...style }}
    >
      <header style={{ borderBlockEnd: "1px solid var(--apk-tutorial-border, #335c4b)", padding: "clamp(1rem, 3vw, 1.5rem)" }}>
        {compactLandmarks ? null : <h1 style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", margin: 0, overflowWrap: "anywhere" }}>{tutorial.title}</h1>}
      </header>
      <div
        data-apk-tutorial-region="body"
        style={{ display: "grid", flex: "1 1 auto", gap: "1rem", minInlineSize: "0", overflowY: "auto", overscrollBehavior: "contain", padding: "clamp(1rem, 3vw, 1.5rem)" }}
      >
        <article aria-label={`Tutorial step ${stepNumber}`} onKeyDown={handleCardKeyDown} style={{ border: "1px solid var(--apk-tutorial-border, #335c4b)", borderRadius: "8px", padding: "1rem" }}>
          <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, overflowWrap: "anywhere" }}>{currentStep.title}</h2>
          <p style={{ lineHeight: 1.6, overflowWrap: "anywhere" }}>{currentStep.explanation}</p>
          <div aria-label={tutorial.labels.progress} aria-valuemax={total} aria-valuemin={0} aria-valuenow={completed} role="progressbar">
            {stepNumber} of {total}
          </div>
        </article>
        <div
          aria-label="Highlighted tutorial target"
          data-apk-tutorial-highlight="true"
          data-apk-tutorial-target-id={snapshot.currentTarget.id}
          data-apk-tutorial-target-kind={snapshot.currentTarget.kind}
          role="region"
        >
          {targetLabel ?? snapshot.currentTarget.id}
        </div>
        <div aria-label="Demonstrated tutorial action" role="region">{actionLabel ?? snapshot.currentAction.id}</div>
        {compactLandmarks ? null : <div aria-live="polite" data-apk-tutorial-consequence={consequence} role="status">{narration}</div>}
      </div>
      {showControls ? <footer style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "1rem", borderBlockStart: "1px solid var(--apk-tutorial-border, #335c4b)" }}>
        {snapshot.status === "paused"
          ? <button type="button" onClick={controller.resume} style={actionStyle}>{tutorial.labels.resume}</button>
          : <button type="button" onClick={controller.pause} style={actionStyle}>{tutorial.labels.pause}</button>}
        <button type="button" aria-label="Next tutorial step" onClick={controller.advance} style={actionStyle}>{tutorial.labels.advance}</button>
        <button type="button" aria-label="Replay tutorial" onPointerUp={controller.replay} style={actionStyle}>{tutorial.labels.replay}</button>
        <button type="button" aria-label="Skip tutorial" onTouchEnd={controller.skip} style={actionStyle}>{tutorial.labels.skip}</button>
      </footer> : null}
    </section>
  );
}
