"use client";

import { HandIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { rpgButton } from "@/components/rpg/chrome";
import { useReadAlong } from "@/hooks/use-read-along";
import { HIGHLIGHT_CLASSES } from "@/lib/audio-highlight";
import { buildWordMaps, splitDisplayWords } from "@/lib/read-along/align";
import { seekOrWait } from "@/lib/read-along/seek";
import type { StorytimeWeek } from "@/lib/storytime/week";
import { cn } from "@/lib/utils";

/** The song of a week. */
type Song = NonNullable<StorytimeWeek["song"]>;

/**
 * The song of a week (qr-page-spec section 6): the 16:9 music video with its poster, and the
 * karaoke cut (the lyrics light up word by word, and each line shows its gesture and picture). No
 * sound plays before a tap. The phone file of the video plays on a narrow screen.
 * @param props.song The song with public media URLs.
 * @returns The song part.
 */
export function StorytimeSong({ song }: { song: Song }) {
  const t = useTranslations("Storytime");
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lineRef = useRef<HTMLLIElement>(null);
  const { position, isPlaying, select } = useReadAlong({ audioRef, sentences: song.times });
  const karaoke = Boolean(song.audio && song.times.length);

  // The current line stays in view while the song plays.
  useEffect(() => {
    if (isPlaying) lineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isPlaying, position.sentenceIndex]);

  const singFrom = (index: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    videoRef.current?.pause();
    seekOrWait(audio, song.times[index]?.startTime ?? 0);
    select({ sentenceIndex: index, wordIndex: -1 });
    audio.play().catch(() => undefined);
  };
  const playPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) return audio.pause();
    if (position.sentenceIndex < 0) return singFrom(0);
    videoRef.current?.pause();
    audio.play().catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">{song.title}</h2>
      {song.video && (
        <video
          ref={videoRef}
          controls
          playsInline
          preload="none"
          poster={song.poster ?? undefined}
          onPlay={() => audioRef.current?.pause()}
          className="aspect-video w-full rounded-md bg-black"
        >
          {song.videoPhone && <source src={song.videoPhone} media="(max-width: 640px)" type="video/mp4" />}
          <source src={song.video} type="video/mp4" />
        </video>
      )}
      {karaoke && (
        <section aria-label={t("singAlong")} className="flex flex-col gap-3">
          <audio ref={audioRef} src={song.audio ?? undefined} preload="none" />
          <div className="flex justify-center gap-3">
            <button type="button" onClick={playPause} className={cn(rpgButton("gold"), "min-h-16 px-6 text-lg")}>
              {isPlaying ? <PauseIcon aria-hidden="true" className="size-6" /> : <PlayIcon aria-hidden="true" className="size-6" />}
              {isPlaying ? t("pause") : t("singAlong")}
            </button>
            <button type="button" aria-label={t("replay")} onClick={() => singFrom(0)} className={cn(rpgButton("wood"), "size-16 p-0")}>
              <RotateCcwIcon aria-hidden="true" className="size-7" />
            </button>
          </div>
          <ol className="flex flex-col gap-2">
            {song.lines.map((line, i) => {
              const time = song.times[i];
              const current = position.sentenceIndex === i;
              const display = splitDisplayWords(line.text);
              const marked =
                current && time && position.wordIndex >= 0
                  ? buildWordMaps(display.words.map((word) => word.text), time.words.map((word) => word.word)).audioToDisplay[position.wordIndex]
                  : -1;
              return (
                <li key={i} ref={current ? lineRef : undefined}>
                  <button
                    type="button"
                    disabled={!time}
                    onClick={() => singFrom(i)}
                    className={cn(
                      "flex min-h-16 w-full items-center gap-3 rounded-lg border p-2 text-left",
                      current && HIGHLIGHT_CLASSES.playingSentence,
                    )}
                  >
                    {line.picture ? (
                      <img src={line.picture} alt="" loading="lazy" className="size-16 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="bg-muted size-16 shrink-0 rounded" aria-hidden="true" />
                    )}
                    <span className="flex flex-col gap-1">
                      <span className="text-xl leading-snug font-semibold">
                        {display.words.map((word) => (
                          <span key={word.index}>
                            {word.lead}
                            <span className={cn("rounded", word.index === marked && HIGHLIGHT_CLASSES.currentWord)}>{word.text}</span>
                          </span>
                        ))}
                        {display.tail}
                      </span>
                      <span className="flex items-center gap-1 text-base">
                        <HandIcon aria-hidden="true" className="size-4" />
                        {line.gesture}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {!song.video && !karaoke && <p className="text-center">{t("audioSoon")}</p>}
    </div>
  );
}
