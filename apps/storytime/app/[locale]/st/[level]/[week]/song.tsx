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
 *
 * The stage holds the poster as its background until the video plays a frame (the `playing`
 * event), so a phone shows a picture and never a white box (council finding 9, AC-1.4). A video
 * starts the song `videoLeadInSeconds` after the song audio, so the lyric lines light from the
 * video time minus that lead-in (AC-1.13); the audio-only fallback has no lead-in.
 */
import { mediaUrl } from "../../../../../lib/media/url";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import type { StorytimeWeek } from "../../../../../lib/contracts/week";
import { markPartDone } from "../../../../../lib/done";

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
  /** The signed media URL of each file name; a file with no entry gets an empty URL. */
  mediaUrls?: Record<string, string>;
  /** The translated control labels. */
  labels?: SongLabels;
  /** The `<level>:<week>:<part>` key that the song writes to the done record when it ends. */
  doneKey?: string;
  /** The screen that shows the player: the at-home phone and the class screen of the teacher. */
  playerMode?: "at-home" | "class-screen";
}

/**
 * Picks the media files of the song for the screen that shows the player. The class screen is
 * 1920x1080, so it uses the regular pair and never the phone pair.
 * @param song The song of the week.
 * @param phone `true` when the screen is a portrait phone.
 * @param classScreen `true` when the player shows on a class screen.
 * @returns The video file, the poster file, and `true` when the player shows a video.
 */
function mediaFilesOf(
  song: NonNullable<StorytimeWeek["song"]>,
  phone: boolean,
  classScreen: boolean,
): { video: string | undefined; poster: string | undefined; hasVideo: boolean } {
  if (classScreen) {
    return { video: song.video, poster: song.poster, hasVideo: Boolean(song.video) };
  }
  const hasVideo = Boolean(song.video || song.videoPhone);
  if (phone) {
    return {
      video: song.videoPhone ?? song.video,
      poster: song.posterPhone ?? song.poster,
      hasVideo,
    };
  }
  return { video: song.video, poster: song.poster, hasVideo };
}

/**
 * Builds the URL of one recorded file.
 * @param base The media base URL.
 * @param file The file, relative to the base.
 * @returns The URL, with one slash between the base and the file.
 */


/**
 * Renders one song for a child (spec FR-8).
 * @param props See `StorytimeSongProps`.
 * @returns The media stage with its play control, and the timed lyric lines.
 */
export function StorytimeSong({
  song,
  mediaUrls = {},
  labels = DEFAULT_LABELS,
  doneKey,
  playerMode = "at-home",
}: StorytimeSongProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [phone, setPhone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState(-1);
  const [framePlayed, setFramePlayed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(PHONE_QUERY);
    setPhone(query.matches);
    const onChange = (event: MediaQueryListEvent) => setPhone(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  // The class screen is 1920x1080, so it never uses the phone pair of the song.
  const classScreen = playerMode === "class-screen";
  const phonePair = phone && !classScreen;
  const pair = mediaFilesOf(song, phonePair, classScreen);
  const hasVideo = pair.hasVideo;
  const mediaFile = hasVideo ? pair.video : song.audio;
  const mediaSrc = mediaFile ? mediaUrl(mediaUrls, mediaFile) : undefined;
  const poster = pair.poster ? mediaUrl(mediaUrls, pair.poster) : undefined;
  const times = song.times;
  const leadIn = hasVideo ? (song.videoLeadInSeconds ?? 0) : 0;

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
    const current = event.currentTarget.currentTime - leadIn;
    setActiveLine(times.findIndex((row) => current >= row.startTime && current < row.endTime));
  }

  /**
   * Stops the playing state and records the finished song on this device.
   */
  function onEnded(): void {
    setPlaying(false);
    markPartDone(doneKey);
  }

  return (
    <div
      className="flex flex-col gap-4"
      data-mode={classScreen ? "class-screen" : undefined}
    >
      <div
        className="song-stage"
        data-phone={phonePair ? "true" : "false"}
        style={
          poster && !framePlayed
            ? {
                backgroundImage: `url(${JSON.stringify(poster)})`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
              }
            : undefined
        }
      >
        {hasVideo ? (
          // F280: a landscape screen below 500 px of height caps the stage so the play control
          // stays inside the viewport; a short desktop window is landscape, so it gets the cap
          // too (F350). The cap keeps the 16:9 shape. A portrait phone with a soft keyboard
          // (short but not landscape) keeps the full-size box, and the measured phone 9:16 and
          // laptop 16:9 boxes stay as they are. The important flags override the .song-stage
          // video rule of globals.css.
          <video
            ref={(node) => {
              mediaRef.current = node;
            }}
            src={mediaSrc}
            poster={poster}
            preload="metadata"
            playsInline
            aria-label={song.title}
            style={framePlayed ? undefined : { background: "transparent" }}
            onTimeUpdate={onTimeUpdate}
            onPlaying={() => setFramePlayed(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={onEnded}
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
            onEnded={onEnded}
          />
        )}
      </div>
      <button
        type="button"
        onClick={togglePlayback}
        className="min-h-12 rounded-xl border border-[#92400e] bg-[#fcd34d] px-4 text-[#92400e]"
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
                <span data-action-chip className="text-sm text-neutral-600" lang="en">
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
