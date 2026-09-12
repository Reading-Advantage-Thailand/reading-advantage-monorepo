"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";

import {
  getRetroArcadeButtonStyle,
  RETRO_ARCADE_PANEL_STYLE,
} from "./retro-arcade-theme.js";

/** Public briefing and lifecycle contracts exposed beside the presentation primitives. */
export {
  gameBriefingControlHintSchema,
  gameBriefingControlSchema,
  gameBriefingInstructionSchema,
  gameBriefingLabelsSchema,
  gameBriefingLearningPreviewSchema,
  gameBriefingSchema,
  gameBriefingStartPhaseSchema,
  gameBriefingTextSchema,
  gameLifecycleEventSchema,
  gameLifecyclePhaseSchema,
  gameLifecycleTransitionSchema,
  resolveGameBriefingStartPhase,
} from "./game-briefing-contract.js";

/** Public briefing and lifecycle contract types exposed by the presentation module. */
export type {
  GameBriefing,
  GameBriefingControl,
  GameBriefingControlHint,
  GameBriefingInstruction,
  GameBriefingLabels,
  GameBriefingLearningPreview,
  GameBriefingStartPhase,
  GameLifecycleEvent,
  GameLifecyclePhase,
  GameLifecycleTransition,
} from "./game-briefing-contract.js";

/** Standardized accessible briefing screen shown before normal gameplay. */
export { GameBriefingScreen } from "./game-briefing-screen.js";

/** Public props for the standardized briefing screen. */
export type { GameBriefingScreenProps } from "./game-briefing-screen.js";

/** Props for the outer accessible game presentation region. */
export type PresentationShellProps = ComponentProps<"section"> & {
  /** Accessible name announced for the complete game experience. */
  readonly accessibleName: string;
};

/**
 * Provides the semantic DOM region surrounding canvas and non-canvas game information.
 * @param props Accessible name plus native section attributes.
 * @returns A named game region with presentation data semantics.
 */
export function PresentationShell({ accessibleName, ...props }: PresentationShellProps) {
  return <section aria-label={accessibleName} data-apk-presentation="root" {...props} />;
}

/** Props for the polite loading status. */
export type GameLoadingStateProps = ComponentProps<"div"> & {
  /** Complete loading message. */
  readonly message?: string;
};

/**
 * Announces game loading state without interrupting assistive technology.
 * @param props Optional message plus native div attributes.
 * @returns A polite busy status region.
 */
export function GameLoadingState({ message = "Loading game…", ...props }: GameLoadingStateProps) {
  return <div role="status" aria-live="polite" aria-busy="true" data-apk-region="modal" {...props}>{message}</div>;
}

/** Props for an actionable game error state. */
export type GameErrorStateProps = ComponentProps<"div"> & {
  /** Complete actionable error message. */
  readonly message: string;
  /** Optional retry boundary. */
  readonly onRetry?: () => void;
};

/**
 * Announces a fail-closed game error and exposes an optional retry action.
 * @param props Error message, retry callback, and native div attributes.
 * @returns An assertive alert with a keyboard-native action when retry is available.
 */
export function GameErrorState({ message, onRetry, ...props }: GameErrorStateProps) {
  return (
    <div role="alert" data-apk-region="modal" {...props}>
      <p>Game could not continue: {message}</p>
      {onRetry ? <button type="button" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}

/** Props for the pre-game instructions dialog. */
export type InstructionsPanelProps = ComponentProps<"section"> & {
  /** Visible dialog heading. */
  readonly heading: string;
  /** Whether instructions are currently presented. */
  readonly open: boolean;
  /** Starts or resumes the game. */
  readonly onStart: () => void;
  /** Dialog body. */
  readonly children: ReactNode;
};

/**
 * Renders complete scrollable instructions outside active gameplay.
 * @param props Heading, visibility, start action, content, and native section attributes.
 * @returns A named modal dialog or null when closed.
 */
export function InstructionsPanel({ heading, open, onStart, children, ...props }: InstructionsPanelProps) {
  const titleId = useId();
  if (!open) return null;
  return (
    <section role="dialog" aria-modal="true" aria-labelledby={titleId} data-apk-region="modal" {...props}>
      <h2 id={titleId}>{heading}</h2>
      <div>{children}</div>
      <button type="button" onClick={onStart}>Start game</button>
    </section>
  );
}

/** Props for the complete educational prompt region. */
export type EducationalPromptProps = ComponentProps<"section"> & {
  /** Complete prompt text that must never be silently truncated. */
  readonly prompt: string;
  /** Optional supplemental instruction. */
  readonly instruction?: string;
};

/**
 * Renders complete educational content in the primary prompt region.
 * @param props Prompt, supplemental instruction, and native section attributes.
 * @returns A named prompt region with complete text.
 */
export function EducationalPrompt({ prompt, instruction, ...props }: EducationalPromptProps) {
  return (
    <section aria-label="Current learning prompt" data-apk-region="primary-prompt" {...props}>
      <p>{prompt}</p>
      {instruction ? <p>{instruction}</p> : null}
    </section>
  );
}

/** Props for educational progression. */
export type GameProgressProps = Omit<ComponentProps<"div">, "children"> & {
  /** One-based or zero-based current progress value. */
  readonly current: number;
  /** Positive terminal progress value. */
  readonly total: number;
  /** Accessible label for the progress measure. */
  readonly label?: string;
};

/**
 * Renders semantic educational progress with visible non-color text.
 * @param props Current value, total, label, and native div attributes.
 * @returns A progressbar and complete textual value.
 * @throws When values are non-finite or outside the declared range.
 */
export function GameProgress({ current, total, label = "Learning progress", ...props }: GameProgressProps) {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0 || current < 0 || current > total) {
    throw new Error("Game progress requires a finite current value between zero and a positive total");
  }
  return (
    <div data-apk-region="primary-status" {...props}>
      <label>
        {label}
        <progress
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={current}
          value={current}
          max={total}
        />
      </label>
      <span>{current} of {total}</span>
    </div>
  );
}

/** Props for primary and optional secondary status values. */
export type GameHudProps = ComponentProps<"dl"> & {
  /** Essential status labels and values. */
  readonly primary: Readonly<Record<string, string | number>>;
  /** Optional status labels and values collapsed before primary content. */
  readonly secondary?: Readonly<Record<string, string | number>>;
};

/**
 * Renders non-color primary and optional secondary status as a semantic description list.
 * @param props Primary values, optional secondary values, and native list attributes.
 * @returns A named HUD status list.
 */
export function GameHud({ primary, secondary, ...props }: GameHudProps) {
  return (
    <dl aria-label="Game status" data-apk-region="primary-status" {...props}>
      {Object.entries(primary).map(([label, value]) => (
        <div key={`primary:${label}`}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
      {secondary ? Object.entries(secondary).map(([label, value]) => (
        <div key={`secondary:${label}`} data-apk-secondary-status="true"><dt>{label}</dt><dd>{value}</dd></div>
      )) : null}
    </dl>
  );
}

/** Props for transient correct, incorrect, and neutral feedback. */
export type GameFeedbackProps = ComponentProps<"div"> & {
  /** Feedback meaning, always reinforced by complete text. */
  readonly kind: "correct" | "incorrect" | "neutral";
};

/**
 * Announces bounded transient feedback without relying on color alone.
 * @param props Feedback kind plus native div attributes and complete text.
 * @returns A polite status for normal feedback or assertive alert for incorrect feedback.
 */
export function GameFeedback({ kind, ...props }: GameFeedbackProps) {
  return (
    <div
      role={kind === "incorrect" ? "alert" : "status"}
      aria-live={kind === "incorrect" ? "assertive" : "polite"}
      data-apk-feedback={kind}
      data-apk-region="feedback"
      {...props}
    />
  );
}

/** Props for pause, mute, restart, and exit controls. */
export type GameNavigationControlsProps = ComponentProps<"nav"> & {
  /** Current paused state. */
  readonly paused: boolean;
  /** Current mute state. */
  readonly muted: boolean;
  /** Receives the next paused state. */
  readonly onPauseChange: (paused: boolean) => void;
  /** Receives the next mute state. */
  readonly onMutedChange: (muted: boolean) => void;
  /** Requests a confirmed or host-mediated restart. */
  readonly onRestart: () => void;
  /** Requests host-owned navigation out of the game. */
  readonly onExit: () => void;
};

/**
 * Renders keyboard-native game navigation controls with explicit state names.
 * @param props State callbacks plus native navigation attributes.
 * @returns A named control navigation region.
 */
export function GameNavigationControls({
  paused,
  muted,
  onPauseChange,
  onMutedChange,
  onRestart,
  onExit,
  ...props
}: GameNavigationControlsProps) {
  return (
    <nav aria-label="Game controls" data-apk-region="navigation" {...props}>
      <button type="button" aria-pressed={paused} onClick={() => onPauseChange(!paused)}>{paused ? "Resume game" : "Pause game"}</button>
      <button type="button" aria-pressed={muted} onClick={() => onMutedChange(!muted)}>{muted ? "Unmute game" : "Mute game"}</button>
      <button type="button" onClick={onRestart}>Restart game</button>
      <button type="button" onClick={onExit}>Exit game</button>
    </nav>
  );
}

/** Describes the host persistence state for a completed game. */
export type GamePersistenceState =
  | { readonly status: "not-applicable" }
  | { readonly status: "pending" }
  | { readonly status: "confirmed"; readonly xpEarned: number; readonly duplicate: boolean }
  | { readonly status: "failed"; readonly message: string };

/** Props for a terminal game result panel. */
export type GameResultPanelProps = Omit<ComponentProps<"section">, "children"> & {
  /** Terminal outcome text. */
  readonly outcome: "victory" | "defeat" | "complete";
  /** Display score. */
  readonly score: number;
  /** Accuracy from zero through one. */
  readonly accuracy: number;
  /** Number of correct answers. */
  readonly correctAnswers: number;
  /** Number of attempts. */
  readonly totalAttempts: number;
  /** Display XP; authoritative persistence remains host-owned. */
  readonly xp: number;
  /** Current host persistence state for the completed result. */
  readonly persistence?: GamePersistenceState;
  /** Attribution shown only when the session loaded credited art. */
  readonly requiredCredit: string;
  /** Requests a replay. */
  readonly onReplay: () => void;
  /** Retries host persistence for the same completed result. */
  readonly onRetrySave?: () => void;
  /** Requests host-owned exit navigation. */
  readonly onExit: () => void;
};

/**
 * Renders complete terminal results, optional attribution, replay, and exit actions.
 * @param props Outcome, result values, credit, callbacks, and native section attributes.
 * @returns A named result region with non-color semantic statistics.
 * @throws When result values are invalid.
 */
export function GameResultPanel({
  outcome,
  score,
  accuracy,
  correctAnswers,
  totalAttempts,
  xp,
  persistence = { status: "not-applicable" },
  requiredCredit,
  onReplay,
  onRetrySave,
  onExit,
  style,
  ...props
}: GameResultPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  if (![score, accuracy, correctAnswers, totalAttempts, xp].every(Number.isFinite)
    || accuracy < 0 || accuracy > 1 || correctAnswers < 0 || totalAttempts < correctAnswers || xp < 0) {
    throw new Error("Game result presentation received invalid result values");
  }
  if (persistence.status === "confirmed"
    && (!Number.isInteger(persistence.xpEarned) || persistence.xpEarned < 0)) {
    throw new Error("Game result presentation received invalid confirmed XP");
  }
  return (
    <section
      aria-label="Game result"
      data-apk-region="modal"
      data-apk-visual-theme="retro-arcade"
      {...props}
      style={{
        ...RETRO_ARCADE_PANEL_STYLE,
        background: "linear-gradient(180deg, #122443 0%, #060b18 100%)",
        boxShadow: "6px 6px 0 #030712, inset 0 0 0 2px #1e3a5f",
        color: "var(--apk-result-text, #f7f2d0)",
        fontFamily: "var(--apk-result-body-font, Tahoma, 'Noto Sans Thai', sans-serif)",
        margin: "clamp(0.75rem, 3vw, 1.5rem)",
        padding: "clamp(1rem, 4vw, 2rem)",
        textAlign: "center",
        ...style,
      }}
    >
      <p style={{ color: "#67e8f9", fontFamily: "monospace", letterSpacing: "0.18em", margin: 0 }}>SESSION COMPLETE</p>
      <h2 ref={headingRef} tabIndex={-1} style={{ fontFamily: "'Courier New', 'Noto Sans Thai', Tahoma, monospace", fontSize: "clamp(2rem, 8vw, 4rem)", margin: "0.35rem 0 1rem", textShadow: "3px 3px 0 #030712" }}>{outcome === "victory" ? "Victory" : outcome === "defeat" ? "Try again" : "Complete"}</h2>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))", gap: "0.5rem", margin: "0 0 1rem" }}>
        <div style={{ border: "1px solid #31577d", padding: "0.7rem" }}><dt>Score</dt><dd style={{ color: "#fbbf24", fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>{score}</dd></div>
        <div style={{ border: "1px solid #31577d", padding: "0.7rem" }}><dt>Accuracy</dt><dd style={{ color: "#fbbf24", fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>{Math.round(accuracy * 100)}%</dd></div>
        <div style={{ border: "1px solid #31577d", padding: "0.7rem" }}><dt>Correct</dt><dd style={{ color: "#fbbf24", fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>{correctAnswers}/{totalAttempts}</dd></div>
        {persistence.status === "not-applicable" ? <div style={{ border: "1px solid #31577d", padding: "0.7rem" }}><dt>XP preview</dt><dd style={{ color: "#fbbf24", fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>{xp}</dd></div> : null}
        {persistence.status === "confirmed" && !persistence.duplicate ? <div style={{ border: "1px solid #31577d", padding: "0.7rem" }}><dt>Confirmed XP</dt><dd style={{ color: "#fbbf24", fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>{persistence.xpEarned}</dd></div> : null}
      </dl>
      {persistence.status === "pending" ? <p role="status">Saving progress…</p> : null}
      {persistence.status === "confirmed" && persistence.duplicate ? <p role="status">Progress already saved</p> : null}
      {persistence.status === "failed" ? <p role="alert">{persistence.message}</p> : null}
      {persistence.status === "failed" && onRetrySave ? (
        <button type="button" onClick={onRetrySave} style={{ minBlockSize: "48px", border: "2px solid #f87171", borderRadius: "2px", background: "#3f121d", color: "#fff", font: "inherit", fontWeight: 800, padding: "0.7rem 1rem" }}>Retry save</button>
      ) : null}
      {requiredCredit ? <p data-apk-attribution="true">{requiredCredit}</p> : null}
      <button
        type="button"
        onClick={onReplay}
        style={{ ...getRetroArcadeButtonStyle("primary"), boxShadow: "4px 4px 0 #030712", font: "inherit", fontWeight: 900, margin: "0.5rem", padding: "0.35rem 1rem" }}
      >
        {persistence.status === "failed" ? "Play again without saving" : "Play again"}
      </button>
      <button type="button" onClick={onExit} style={{ ...getRetroArcadeButtonStyle("secondary"), font: "inherit", fontWeight: 800, margin: "0.5rem", padding: "0.35rem 1rem" }}>Exit</button>
    </section>
  );
}
