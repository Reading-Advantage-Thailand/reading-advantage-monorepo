"use client";

/**
 * The Storytime song part (plan task 3.5, spec FR-8).
 *
 * The stage shows the poster and plays no sound before a tap. A portrait phone uses the phone
 * video and the phone poster; every other screen uses the regular pair. Without a video the stage
 * plays the song audio. The lyric lines light from `song.times`. Amendment M-3 keeps the lyric
 * list free of pictures: each line shows its lyric and its gesture as text under it, and the
 * stage poster and the song tile picture stay (rule 9.1). The component never uses the phone
 * voice (rule 10.5): every sound is a recorded file.
 */
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import type { StorytimeWeek } from "../../../../../lib/contracts/week";

/** The media query that marks a portrait phone (spec FR-8, AC-8.2). */
const PHONE_QUERY = "(max-width: 640px) and (orientation: portrait)";

/** The English control labels; the page passes the translated labels. */
const DEFAULT_LABELS: SongLabels = { play: "Play", pause: "Pause" };

/** The translated labels of the song controls. */
interface SongLabels {
  /** "Play". */
  play: string;
  /** "Pause". */
  pause: string;
}

/** The props of the client song view. */
interface StorytimeSongProps {
  /** The song of the week. */
  song: NonNullable<StorytimeWeek["song"]>;
  /** The media base URL; the default is `/media`. */
  mediaBase?: string;
  /** The translated control labels. */
  labels?: SongLabels;
}

/**
 * Builds the URL of one recorded file.
 * @param base The media base URL.
 * @param file The file, relative to the base.
 * @returns The URL, with one slash between the base and the file.
 */
function mediaUrl(base: string, file: string): string {
  return `${base.replace(/\/+$/, "")}/${file.replace(/^\/+/, "")}`;
}

/**
 * Renders one song for a child (spec FR-8).
 * @param props See `StorytimeSongProps`.
 * @returns The media stage with its play control, and the timed lyric lines.
 */
export function StorytimeSong({
  song,
  mediaBase = "/media",
  labels = DEFAULT_LABELS,
}: StorytimeSongProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [phone, setPhone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState(-1);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(PHONE_QUERY);
    setPhone(query.matches);
    const onChange = (event: MediaQueryListEvent) => setPhone(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  const hasVideo = Boolean(song.video || song.videoPhone);
  const videoFile = phone ? (song.videoPhone ?? song.video) : song.video;
  const posterFile = phone ? (song.posterPhone ?? song.poster) : song.poster;
  const mediaFile = hasVideo ? videoFile : song.audio;
  const mediaSrc = mediaFile ? mediaUrl(mediaBase, mediaFile) : undefined;
  const poster = posterFile ? mediaUrl(mediaBase, posterFile) : undefined;
  const times = song.times;

  /**
   * Plays or pauses the media element; it never starts on its own.
   */
  function togglePlayback(): void {
    const element = mediaRef.current;
    if (!element) return;
    if (element.paused) {
      const result = element.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => setPlaying(false));
      }
    } else {
      element.pause();
    }
  }

  /**
   * Marks the lyric line whose time interval holds the current playback time.
   * @param event The time update of the media element.
   */
  function onTimeUpdate(event: SyntheticEvent<HTMLMediaElement>): void {
    const current = event.currentTarget.currentTime;
    setActiveLine(times.findIndex((row) => current >= row.startTime && current < row.endTime));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="song-stage" data-phone={phone ? "true" : "false"}>
        {hasVideo ? (
          // F280: a landscape phone caps the stage so the play control stays inside the
          // viewport. The cap keeps the 16:9 shape. The query holds only below 500 px of
          // height AND in landscape orientation, so a short desktop window and a portrait
          // phone with a soft keyboard (F290) keep the full-size box, and the measured phone
          // 9:16 and laptop 16:9 boxes stay as they are. The important flags override the
          // .song-stage video rule of globals.css.
          <video
            ref={(node) => {
              mediaRef.current = node;
            }}
            src={mediaSrc}
            poster={poster}
            preload="none"
            playsInline
            aria-label={song.title}
            onTimeUpdate={onTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="[@media(max-height:500px)_and_(orientation:landscape)]:h-44! [@media(max-height:500px)_and_(orientation:landscape)]:w-auto!"
          />
        ) : (
          <audio
            ref={(node) => {
              mediaRef.current = node;
            }}
            src={mediaSrc}
            preload="none"
            aria-label={song.title}
            onTimeUpdate={onTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        )}
      </div>
      <button
        type="button"
        onClick={togglePlayback}
        className="min-h-12 rounded-xl border border-neutral-300 px-4"
      >
        {playing ? labels.pause : labels.play}
      </button>
      <ol className="flex flex-col gap-2">
        {song.lines.map((line, index) => {
          const active = index === activeLine;
          return (
            <li
              key={index}
              data-line-index={index}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "flex items-center gap-3 rounded-xl bg-amber-100 p-2"
                  : "flex items-center gap-3 rounded-xl p-2"
              }
            >
              <span className="flex flex-col">
                <span className="text-lg" lang="en">
                  {line.text}
                </span>
                <span className="text-sm text-neutral-600" lang="en">
                  {line.gesture}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
