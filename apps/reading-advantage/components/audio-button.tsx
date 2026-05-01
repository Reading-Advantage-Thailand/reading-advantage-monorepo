"use client";
import { cn } from "@/lib/utils";
import React from "react";
import { buttonVariants } from "./ui/button";
import { useScopedI18n } from "@/locales/client";

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
  const t = useScopedI18n("components.audioButton");
  const [isplaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  function handlePause() {
    setIsPlaying(!isplaying);
    if (isplaying) {
      audioRef.current?.pause();
    } else if (audioRef.current) {
      audioRef.current.currentTime = startTimestamp;
      audioRef.current?.play();

      // Use a tolerance for comparison due to floating-point precision
      const tolerance = 0.5; // You can adjust this value based on your needs

      // Set up a listener to check the playback progress
      const checkProgress = setInterval(() => {
        if (
          audioRef.current &&
          audioRef.current?.currentTime + tolerance >= endTimestamp
        ) {
          audioRef.current?.pause();
          clearInterval(checkProgress); // Clear the interval once the end time is reached
          setIsPlaying(false);
        }
      }, 10); // You can adjust the interval duration based on your needs
    }
  }
  return (
    <div className="select-none">
      <audio ref={audioRef}>
        <source src={audioUrl} />
      </audio>
      <button
        className={cn(buttonVariants({ size: "sm" }))}
        onClick={() => {
          handlePause();
        }}
      >
        {isplaying ? t("pause") : t("play")}
      </button>
    </div>
  );
}
