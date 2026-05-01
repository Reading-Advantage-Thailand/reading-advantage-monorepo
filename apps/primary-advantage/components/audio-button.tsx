"use client";
import React, { useCallback } from "react";
import { Volume2Icon } from "lucide-react";
import { getAudioUrl } from "@/lib/storage-config";

type Props = {
  audioUrl: string;
  startTimestamp: number;
  endTimestamp: number;
};

export default function AudioButton({
  audioUrl,
  startTimestamp,
  endTimestamp,
}: Props) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      // If audio is playing, pause it first
      if (isPlaying) {
        audioRef.current.pause();
        stopPlayback();
        return;
      }

      audioRef.current.currentTime = startTimestamp;

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          const tolerance = 0.5;

          intervalRef.current = setInterval(() => {
            if (
              audioRef.current &&
              audioRef.current.currentTime + tolerance >= endTimestamp
            ) {
              audioRef.current.pause();
              stopPlayback();
            }
          }, 5);
        })
        .catch((error) => {
          console.error("Audio playback failed:", error);
          stopPlayback();
        });
    }
  }, [startTimestamp, endTimestamp, isPlaying, stopPlayback]);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="select-none">
      <audio ref={audioRef} onEnded={stopPlayback}>
        <source src={getAudioUrl(audioUrl)} />
      </audio>
      <Volume2Icon
        className={`mx-3 mt-1 h-5 w-5 cursor-pointer ${
          isPlaying ? "text-green-500" : ""
        }`}
        onClick={handlePlay}
      />
    </div>
  );
}
