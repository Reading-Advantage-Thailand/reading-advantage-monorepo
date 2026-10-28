"use client";
/**
 * The one read-along player (track primary_parity_read_along_20261011, Phase S3).
 * It knows no article page and no app: the host passes the state, the callbacks, the labels, and
 * its own chrome as props.
 */
import type { ComponentType, ReactNode } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { cn } from "../../lib/cn";

/** The playback speeds, in the order of the speed sign. */
export const READ_ALONG_SPEEDS = [0.75, 1, 1.25] as const;

/**
 * Gives the speed that follows a speed in the list.
 * @param speed The current speed.
 * @param speeds The speeds of the player (the default is `READ_ALONG_SPEEDS`).
 * @returns The next speed; the list wraps around, and an unknown speed gives 1.
 */
export function nextSpeed(speed: number, speeds: readonly number[] = READ_ALONG_SPEEDS): number {
  const i = speeds.indexOf(speed);
  return i === -1 ? 1 : speeds[(i + 1) % speeds.length];
}

/** The spoken labels of the player. The app passes its translated labels. */
export interface ReadAlongPlayerLabels {
  /** The previous sentence button. */
  previous: string;
  /** The replay button. */
  replay: string;
  /** The next sentence button. */
  next: string;
  /** The play button. */
  play: string;
  /** The pause button. */
  stop: string;
  /** The speed button, with the current speed. */
  speed: (speed: number) => string;
}

/** The English labels, so a host without translations still names every control. */
export const DEFAULT_READ_ALONG_LABELS: ReadAlongPlayerLabels = {
  previous: "Previous sentence",
  replay: "Replay this sentence",
  next: "Next sentence",
  play: "Play audio",
  stop: "Stop audio",
  speed: (speed) => `Speed ${speed} times. Change speed`,
};

/** The props of the panel that holds the buttons. */
export interface ReadAlongPanelProps {
  dark?: boolean;
  className?: string;
  children?: ReactNode;
}

/** The props of the small sign of the speed. */
export interface ReadAlongSignProps {
  small?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * The app chrome of the player (the slot).
 *
 * The app passes its own panel, its own sign, and its own button classes, so this package holds no
 * app design and no app import. Without a chrome, the player renders plain elements.
 */
export interface ReadAlongPlayerChrome {
  /** The panel around the controls. */
  Panel: ComponentType<ReadAlongPanelProps>;
  /** The sign of the speed. */
  Sign: ComponentType<ReadAlongSignProps>;
  /** The class names of a button; `wood` is a secondary control, `gold` is play. */
  buttonClassName: (kind: "wood" | "gold") => string;
}

/** The plain panel, for a host that passes no chrome. */
function PlainPanel({ className, children }: ReadAlongPanelProps) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

/** The plain sign, for a host that passes no chrome. */
function PlainSign({ className, children }: ReadAlongSignProps) {
  return <span className={className}>{children}</span>;
}

/** The plain chrome, for a host that passes none. */
export const DEFAULT_READ_ALONG_CHROME: ReadAlongPlayerChrome = {
  Panel: PlainPanel,
  Sign: PlainSign,
  buttonClassName: () => "",
};

/** Props of the player. */
export interface ReadAlongPlayerProps {
  /** True while the audio plays. */
  playing: boolean;
  /** The playback speed. */
  speed: number;
  /** The current sentence entry; -1 when none. */
  sentenceIndex: number;
  /** The number of sentence entries. */
  sentenceCount: number;
  /** Play or pause. */
  onPlayPause: () => void;
  /** Play from the start of a sentence entry. */
  onPlaySentence: (sentenceIndex: number) => void;
  /** The speed that the student picked. */
  onSpeedChange: (speed: number) => void;
  /** The speeds of the speed sign (the default is `READ_ALONG_SPEEDS`). */
  speeds?: readonly number[];
  /** The labels of the controls (the default is English). */
  labels?: ReadAlongPlayerLabels;
  /** The app chrome (the default is plain elements). */
  chrome?: ReadAlongPlayerChrome;
  /** Content above the buttons, for example the translation of the sentence. */
  children?: ReactNode;
  className?: string;
}

const SMALL = "inline-flex size-12 items-center justify-center p-0";

/**
 * The player: previous, replay, play or pause, next, and the speed sign.
 * @param props See `ReadAlongPlayerProps`.
 * @returns The player panel: a bottom bar on a phone, sticky in the reading frame on a desktop.
 */
export function ReadAlongPlayer({
  playing,
  speed,
  sentenceIndex,
  sentenceCount,
  onPlayPause,
  onPlaySentence,
  onSpeedChange,
  speeds = READ_ALONG_SPEEDS,
  labels = DEFAULT_READ_ALONG_LABELS,
  chrome = DEFAULT_READ_ALONG_CHROME,
  children,
  className,
}: ReadAlongPlayerProps) {
  const Panel = chrome.Panel;
  const Sign = chrome.Sign;
  const current = Math.max(0, sentenceIndex);
  return (
    <div
      data-player
      className={cn(
        "fixed inset-x-0 bottom-(--bottom-nav-h) z-30 px-2 pb-2 lg:sticky lg:inset-x-auto lg:bottom-4 lg:px-0 lg:pb-0",
        className,
      )}
    >
      <Panel dark className="mx-auto max-w-xl gap-2 p-2">
        {children}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={labels.previous}
            disabled={current <= 0}
            onClick={() => onPlaySentence(current - 1)}
            className={cn(chrome.buttonClassName("wood"), SMALL)}
          >
            <SkipBack className="size-5" />
          </button>
          <button
            type="button"
            aria-label={labels.replay}
            onClick={() => onPlaySentence(current)}
            className={cn(chrome.buttonClassName("wood"), SMALL)}
          >
            <RotateCcw className="size-5" />
          </button>
          <button
            type="button"
            id="playPauseButton"
            aria-label={playing ? labels.stop : labels.play}
            onClick={onPlayPause}
            className={cn(chrome.buttonClassName("gold"), "inline-flex size-14 items-center justify-center p-0")}
          >
            {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
          </button>
          <button
            type="button"
            aria-label={labels.next}
            disabled={current >= sentenceCount - 1 && sentenceIndex >= 0}
            onClick={() => onPlaySentence(sentenceIndex < 0 ? 0 : current + 1)}
            className={cn(chrome.buttonClassName("wood"), SMALL)}
          >
            <SkipForward className="size-5" />
          </button>
          <button
            type="button"
            aria-label={labels.speed(speed)}
            onClick={() => onSpeedChange(nextSpeed(speed, speeds))}
            className="inline-flex min-h-12 min-w-14 items-center justify-center"
          >
            <Sign small className="px-3 text-base">
              {speed}×
            </Sign>
          </button>
        </div>
      </Panel>
    </div>
  );
}
