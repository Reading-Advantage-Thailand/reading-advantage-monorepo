"use client";
import Image from "next/image";
import React from "react";
import { useTheme } from "next-themes";
import useAudioSegment from "@/hooks/use-audio-segment";

type Props = {
  audioUrl: string;
  startTimestamp: number;
  endTimestamp?: number; // Optional - if not provided, play till end
};

/**
 * Renders a speaker icon button that plays one audio segment.
 * @param audioUrl The audio URL to play.
 * @param startTimestamp Segment start position in seconds.
 * @param endTimestamp Optional segment end position in seconds.
 * @returns The themed play-sound image button with its audio element.
 */
export default function AudioImg({
  audioUrl,
  startTimestamp,
  endTimestamp,
}: Props) {
  const { resolvedTheme } = useTheme();
  const { audioRef, toggle } = useAudioSegment(
    audioUrl,
    startTimestamp,
    endTimestamp
  );

  return (
    <div className="select-none">
      <audio ref={audioRef}>
        <source src={audioUrl} />
      </audio>
      {resolvedTheme === "dark" ? (
        <Image
          src={"/sound-play-sound-white.png"}
          alt="play sound"
          width={20}
          height={20}
          className={"mx-3 mt-1 cursor-pointer"}
          onClick={toggle}
        />
      ) : (
        <Image
          src={"/sound-play-sound-black.png"}
          alt="play sound"
          width={20}
          height={20}
          className={"mx-3 mt-1 cursor-pointer"}
          onClick={toggle}
        />
      )}
    </div>
  );
}
