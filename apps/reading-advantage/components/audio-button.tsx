"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { buttonVariants } from "./ui/button";
import { useScopedI18n } from "@/locales/client";
import useAudioSegment from "@/hooks/use-audio-segment";

type Props = {
  audioUrl: string;
  startTimestamp: number;
  endTimestamp?: number;
};

/**
 * Renders a play/pause button that plays one audio segment.
 * @param audioUrl The audio URL to play.
 * @param startTimestamp Segment start position in seconds.
 * @param endTimestamp Segment end position in seconds.
 * @returns The labeled play/pause button with its audio element.
 */
export default function AudioButton({
  audioUrl,
  startTimestamp,
  endTimestamp,
}: Props) {
  const t = useScopedI18n("components.audioButton");
  const { audioRef, isPlaying, toggle } = useAudioSegment(
    audioUrl,
    startTimestamp,
    endTimestamp
  );

  return (
    <div className="select-none">
      <audio ref={audioRef}>
        <source src={audioUrl} />
      </audio>
      <button className={cn(buttonVariants({ size: "sm" }))} onClick={toggle}>
        {isPlaying ? t("pause") : t("play")}
      </button>
    </div>
  );
}
