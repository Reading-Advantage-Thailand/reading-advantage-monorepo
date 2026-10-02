"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type MasteryHeroVideoProps = {
  src: string;
  poster: string;
  playLabel: string;
  pauseLabel: string;
};

/**
 * Muted, looping background video with a play and pause control. The video
 * stays paused on the poster when the visitor prefers reduced motion.
 * @param props The video and poster paths and the localized control labels.
 * @returns The video layer and the control button.
 */
export function MasteryHeroVideo({ src, poster, playLabel, pauseLabel }: MasteryHeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
        className="absolute bottom-4 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[#0c1437]/80 text-white backdrop-blur transition-colors hover:bg-[#0c1437] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
      </button>
    </>
  );
}
