"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

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
  /** Required canonical-pack attribution. */
  readonly requiredCredit: "Pixel art assets by ElvGames";
  /** Requests a replay. */
  readonly onReplay: () => void;
  /** Requests host-owned exit navigation. */
  readonly onExit: () => void;
};

/**
 * Renders complete terminal results, required attribution, replay, and exit actions.
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
  requiredCredit,
  onReplay,
  onExit,
  ...props
}: GameResultPanelProps) {
  if (![score, accuracy, correctAnswers, totalAttempts, xp].every(Number.isFinite)
    || accuracy < 0 || accuracy > 1 || correctAnswers < 0 || totalAttempts < correctAnswers || xp < 0) {
    throw new Error("Game result presentation received invalid result values");
  }
  return (
    <section aria-label="Game result" data-apk-region="modal" {...props}>
      <h2>{outcome === "victory" ? "Victory" : outcome === "defeat" ? "Try again" : "Complete"}</h2>
      <dl>
        <div><dt>Score</dt><dd>{score}</dd></div>
        <div><dt>Accuracy</dt><dd>{Math.round(accuracy * 100)}%</dd></div>
        <div><dt>Correct answers</dt><dd>{correctAnswers}</dd></div>
        <div><dt>Total attempts</dt><dd>{totalAttempts}</dd></div>
        <div><dt>Display XP</dt><dd>{xp}</dd></div>
      </dl>
      <p data-apk-attribution="true">{requiredCredit}</p>
      <button type="button" onClick={onReplay}>Play again</button>
      <button type="button" onClick={onExit}>Exit</button>
    </section>
  );
}
