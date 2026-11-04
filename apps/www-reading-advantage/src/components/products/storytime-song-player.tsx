"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

const DESKTOP_VIDEO_ID = "Id4_X0nQnV4";
const PHONE_VIDEO_ID = "nwJW8yENJnY";
const DESKTOP_POSTER = "/images/storytime-advantage/song-week-1-desktop-poster.jpg";
const PHONE_POSTER = "/images/storytime-advantage/song-week-1-phone-poster.jpg";
const PHONE_MEDIA = "(max-width: 767px)";

/** The labels of the Storytime song player. */
export type StorytimeSongPlayerProps = {
  /** The text of the play button. */
  playLabel: string;
  /** The accessible title of the video player. */
  playerTitle: string;
};

/**
 * Shows the week 1 song poster and loads one YouTube player on a tap.
 * The component reads the screen width at the tap and picks the video.
 * @param props The play button label and the player accessible title.
 * @returns The poster box and, after a tap, the video player.
 */
export function StorytimeSongPlayer({ playLabel, playerTitle }: StorytimeSongPlayerProps) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const play = () => {
    const isPhone = window.matchMedia(PHONE_MEDIA).matches;
    setVideoId(isPhone ? PHONE_VIDEO_ID : DESKTOP_VIDEO_ID);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {videoId ? (
        <div
          data-testid="song-player-box"
          className={`relative mx-auto w-full overflow-hidden rounded-2xl border border-site-border shadow-lg ${
            videoId === PHONE_VIDEO_ID ? "aspect-9/16 max-w-storytime-song" : "aspect-video"
          }`}
        >
          <iframe
            ref={frameRef}
            title={playerTitle}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            tabIndex={-1}
            onLoad={() => frameRef.current?.focus()}
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <div
          data-testid="song-player-box"
          className="relative mx-auto aspect-9/16 w-full max-w-storytime-song overflow-hidden rounded-2xl border border-site-border shadow-lg md:aspect-video md:max-w-none"
        >
          <picture className="absolute inset-0 block">
            <source media="(max-width: 767px)" srcSet={PHONE_POSTER} />
            <img src={DESKTOP_POSTER} alt="" className="h-full w-full object-cover" />
          </picture>
          <button
            type="button"
            onClick={play}
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-3 bg-site-navy/40 text-white transition-colors hover:bg-site-navy/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-400"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-site-navy shadow-lg">
              <Play aria-hidden="true" className="h-8 w-8" />
            </span>
            <span className="rounded-full bg-site-navy/85 px-5 py-2 text-base font-bold shadow-md">
              {playLabel}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
