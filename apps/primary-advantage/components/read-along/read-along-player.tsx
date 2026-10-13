"use client";
/**
 * The one read-along player (track primary_parity_read_along_20261011, Phase S3).
 * It knows no article page: the host passes the state and the callbacks as props.
 */
import type { ReactNode } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { Panel, rpgButton, Sign } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";

/** The playback speeds, in the order of the speed sign. */
export const READ_ALONG_SPEEDS = [0.75, 1, 1.25] as const;

/**
 * Gives the speed that follows a speed in the list.
 * @param speed The current speed.
 * @returns The next speed; the list wraps around, and an unknown speed gives 1.
 */
export function nextSpeed(speed: number): number {
  const i = READ_ALONG_SPEEDS.indexOf(speed as (typeof READ_ALONG_SPEEDS)[number]);
  return i === -1 ? 1 : READ_ALONG_SPEEDS[(i + 1) % READ_ALONG_SPEEDS.length];
}

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
  children,
  className,
}: ReadAlongPlayerProps) {
  const t = useTranslations("Components");
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
          aria-label={t("previousSentence")}
          disabled={current <= 0}
          onClick={() => onPlaySentence(current - 1)}
          className={cn(rpgButton("wood"), SMALL)}
        >
          <SkipBack className="size-5" />
        </button>
        <button
          type="button"
          aria-label={t("replaySentence")}
          onClick={() => onPlaySentence(current)}
          className={cn(rpgButton("wood"), SMALL)}
        >
          <RotateCcw className="size-5" />
        </button>
        <button
          type="button"
          id="playPauseButton"
          aria-label={playing ? t("stopAudio") : t("playAudio")}
          onClick={onPlayPause}
          className={cn(rpgButton("gold"), "inline-flex size-14 items-center justify-center p-0")}
        >
          {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
        </button>
        <button
          type="button"
          aria-label={t("nextSentence")}
          disabled={current >= sentenceCount - 1 && sentenceIndex >= 0}
          onClick={() => onPlaySentence(sentenceIndex < 0 ? 0 : current + 1)}
          className={cn(rpgButton("wood"), SMALL)}
        >
          <SkipForward className="size-5" />
        </button>
        <button
          type="button"
          aria-label={t("changeSpeed", { speed: String(speed) })}
          onClick={() => onSpeedChange(nextSpeed(speed))}
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
