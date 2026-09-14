"use client";
import React from "react";
import { Volume2Icon } from "lucide-react";
import { getAudioUrl } from "@/lib/storage-config";
import { useAudioSegment } from "@/hooks/useAudioSegment";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Components");
  const { audioRef, isPlaying, playSegment, stopSegment } = useAudioSegment(
    audioUrl,
    startTimestamp,
    endTimestamp,
  );

  const handlePlay = () => {
    if (isPlaying) {
      stopSegment();
      return;
    }
    void playSegment();
  };

  return (
    <div className="select-none">
      <audio ref={audioRef} src={getAudioUrl(audioUrl)} />
      <button
        type="button"
        onClick={handlePlay}
        aria-label={isPlaying ? t("stopAudio") : t("playAudio")}
        aria-pressed={isPlaying}
        className="cursor-pointer rounded p-1"
      >
        <Volume2Icon
          className={`mx-3 mt-1 h-5 w-5 ${isPlaying ? "text-green-500" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
