"use client";
import Image from "next/image";
import React, { useCallback } from "react";
import { useTheme } from "next-themes";

type Props = {
  audioUrl: string;
  startTimestamp: number;
  endTimestamp?: number; // Optional - if not provided, play till end
};

export default function AudioImg({
  audioUrl,
  startTimestamp,
  endTimestamp,
}: Props) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { resolvedTheme } = useTheme();

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      // If audio is playing, pause it first
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }

      audioRef.current.currentTime = startTimestamp;

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          
          // If no endTimestamp provided, just let it play without stopping
          if (endTimestamp !== undefined) {
            const tolerance = 0.5;

            const checkProgress = setInterval(() => {
              if (
                audioRef.current &&
                audioRef.current.currentTime + tolerance >= endTimestamp
              ) {
                audioRef.current.pause();
                clearInterval(checkProgress);
                setIsPlaying(false);
              }
            }, 5);
          } else {
            // Listen for audio end event if no endTimestamp
            const handleAudioEnd = () => {
              setIsPlaying(false);
              audioRef.current?.removeEventListener('ended', handleAudioEnd);
            };
            
            audioRef.current?.addEventListener('ended', handleAudioEnd);
          }
        })
        .catch((error) => {
          console.error("Audio playback failed:", error);
          setIsPlaying(false);
        });
    }
  }, [startTimestamp, endTimestamp, isPlaying]);

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
          onClick={handlePlay}
        />
      ) : (
        <Image
          src={"/sound-play-sound-black.png"}
          alt="play sound"
          width={20}
          height={20}
          className={"mx-3 mt-1 cursor-pointer"}
          onClick={handlePlay}
        />
      )}
    </div>
  );
}
