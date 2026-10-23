"use client";

import { BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, Volume2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { ReadAlongPlayer } from "@/components/read-along/read-along-player";
import { rpgButton } from "@/components/rpg/chrome";
import { useReadAlong } from "@/hooks/use-read-along";
import { HIGHLIGHT_CLASSES } from "@/lib/audio-highlight";
import { buildWordMaps, splitDisplayWords } from "@/lib/read-along/align";
import { seekOrWait } from "@/lib/read-along/seek";
import { blendParts } from "@/lib/storytime/blend";
import { playSequence, playStretch, speak } from "@/lib/storytime/speak";
import type { StorytimeBook as Book, StorytimeWeek } from "@/lib/storytime/week";
import { cn } from "@/lib/utils";

/** The two speeds of the Storytime player (qr-page-spec section 4). */
export const STORYTIME_SPEEDS = [0.75, 1] as const;
/** A 64 px target (qr-page-spec section 3). */
const BIG = "inline-flex size-16 shrink-0 items-center justify-center p-0";

/** Props of one Storytime book. */
export interface StorytimeBookProps {
  /** The book with public media URLs. */
  book: Book;
  /** The sound of the week, for the sounds page of the decodable book. */
  element: StorytimeWeek["element"];
  /** The bucket URL of the Workbooks content folder, for the blend sounds. */
  mediaBase: string;
}

/**
 * One Storytime book (qr-page-spec sections 4 and 5): one picture and one sentence on each page,
 * large arrows and a swipe to turn the page, "read it to me" (the voice plays and the word lights
 * up) and "my turn" (no voice; a tap on a word plays that word). A book with a sounds page (the
 * decodable book) starts with it, and its words play sound by sound, then whole.
 * @param props See `StorytimeBookProps`.
 * @returns The book.
 */
export function StorytimeBook({ book, element, mediaBase }: StorytimeBookProps) {
  const t = useTranslations("Storytime");
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopSound = useRef<(() => void) | null>(null);
  const { position, isPlaying, select } = useReadAlong({ audioRef, sentences: book.sentences });
  const sounds = book.sounds;
  const offset = sounds ? 1 : 0;
  const count = book.pages.length + offset;
  const [page, setPage] = useState(0);
  const hasVoice = Boolean(book.audio && book.sentences.length);
  const [mode, setMode] = useState<"read" | "turn">(hasVoice ? "read" : "turn");
  const [speed, setSpeed] = useState(1);
  const [blend, setBlend] = useState<{ key: string; step: number } | null>(null);
  const touchX = useRef<number | null>(null);
  const tricky = useMemo(() => new Set((sounds?.tricky ?? []).map((word) => word.toLowerCase())), [sounds]);

  /** The sentence entry of a book page (0-based): the entry with its page number, else the same index. */
  const sentenceOf = (bookPage: number) => {
    const byPage = book.sentences.findIndex((sentence) => sentence.page === bookPage + 1);
    return byPage >= 0 ? byPage : bookPage < book.sentences.length ? bookPage : -1;
  };

  // While the voice plays, the page follows it.
  useEffect(() => {
    if (!isPlaying || position.sentenceIndex < 0) return;
    const sentence = book.sentences[position.sentenceIndex];
    setPage((sentence?.page ?? position.sentenceIndex + 1) - 1 + offset);
  }, [isPlaying, position.sentenceIndex, book.sentences, offset]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => () => stopSound.current?.(), []);

  const stop = () => {
    stopSound.current?.();
    stopSound.current = null;
    setBlend(null);
    audioRef.current?.pause();
  };
  const go = (next: number) => {
    if (next < 0 || next >= count) return;
    stop();
    setPage(next);
  };
  const playSentence = (index: number) => {
    const audio = audioRef.current;
    const sentence = book.sentences[index];
    if (!audio || !sentence) return;
    stop();
    seekOrWait(audio, sentence.startTime);
    select({ sentenceIndex: index, wordIndex: -1 });
    audio.play().catch(() => undefined);
  };

  const bookPage = page - offset;
  const sentenceIndex = bookPage >= 0 ? sentenceOf(bookPage) : -1;
  const sentence = sentenceIndex >= 0 ? book.sentences[sentenceIndex] : undefined;
  const display = useMemo(() => splitDisplayWords(bookPage >= 0 ? book.pages[bookPage].text : ""), [book.pages, bookPage]);
  const maps = useMemo(
    () => (sentence ? buildWordMaps(display.words.map((word) => word.text), sentence.words.map((word) => word.word)) : null),
    [display, sentence],
  );
  const marked = maps && position.sentenceIndex === sentenceIndex && position.wordIndex >= 0 ? maps.audioToDisplay[position.wordIndex] : -1;

  const playPause = () => {
    if (isPlaying) return audioRef.current?.pause();
    // Resume inside the sentence of this page; else start the sentence of this page.
    if (position.sentenceIndex === sentenceIndex && sentenceIndex >= 0) audioRef.current?.play().catch(() => undefined);
    else playSentence(sentenceIndex >= 0 ? sentenceIndex : 0);
  };

  /**
   * Plays a tapped word: sound by sound and then whole in a blend book, else whole. The whole word
   * comes from the book voice when the timing has it, else from the phone voice.
   */
  const tapWord = (key: string, text: string, audioWord: number) => {
    stop();
    const word = sentence && audioWord >= 0 ? sentence.words[audioWord] : undefined;
    const whole = () => {
      const audio = audioRef.current;
      if (audio && word && hasVoice) {
        select({ sentenceIndex, wordIndex: audioWord });
        stopSound.current = playStretch(audio, word.start, word.end);
      } else speak(text, "en-US");
    };
    const parts = book.blend && !tricky.has(text.toLowerCase()) ? blendParts(text) : null;
    if (!parts) return whole();
    stopSound.current = playSequence(
      parts.map((part) => mediaBase + part.file),
      (step) => {
        if (step < parts.length) return setBlend({ key, step });
        setBlend(null);
        whole();
      },
    );
  };

  /** A word: its sounds while it blends, else its text. */
  const wordFace = (key: string, text: string) => {
    if (blend?.key !== key) return text;
    return blendParts(text)?.map((part, i) => (
      <span key={i} className={cn("rounded", i === blend.step && HIGHLIGHT_CLASSES.currentWord)}>
        {part.grapheme}
      </span>
    ));
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start === null) return;
    const dx = event.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 50) go(dx < 0 ? page + 1 : page - 1);
  };

  return (
    <div className="flex flex-col gap-3 pb-28">
      <h2 className="text-center text-2xl font-bold">{book.title}</h2>
      {hasVoice ? (
        <div role="group" aria-label={book.title} className="flex justify-center gap-2">
          {(["read", "turn"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => {
                stop();
                setMode(value);
              }}
              className={cn(rpgButton(mode === value ? "gold" : "wood"), "min-h-16 px-4 text-lg")}
            >
              {t(value === "read" ? "readToMe" : "myTurn")}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center">{t("audioSoon")}</p>
      )}
      {book.audio && <audio ref={audioRef} src={book.audio} preload="none" />}
      <div
        className="flex flex-col items-center gap-3"
        onTouchStart={(event) => {
          touchX.current = event.touches[0].clientX;
        }}
        onTouchEnd={onTouchEnd}
      >
        {bookPage < 0 && sounds ? (
          <div className="flex flex-col items-center gap-3">
            <h3 className="text-xl font-bold">{t("soundsTitle")}</h3>
            {element && (
              <button
                type="button"
                aria-label={t("playSound", { sound: element.sound })}
                onClick={() => {
                  stop();
                  if (!element.audio) return speak(element.graphemes[0], "en-US");
                  const audio = new Audio(element.audio);
                  stopSound.current = () => audio.pause();
                  audio.play().catch(() => undefined);
                }}
                className={cn(rpgButton("gold"), "min-h-24 min-w-24 px-6 text-6xl font-bold")}
              >
                {element.graphemes.join(" ")}
              </button>
            )}
            <p className="flex flex-wrap justify-center gap-2 text-2xl">
              {sounds.words.map((word) => (
                <button key={word} type="button" onClick={() => tapWord(`s:${word}`, word, -1)} className="min-h-16 rounded px-3">
                  {wordFace(`s:${word}`, word)}
                </button>
              ))}
            </p>
            {sounds.tricky.length > 0 && (
              <p className="text-lg">
                {t("trickyWords")}: {sounds.tricky.join(", ")}
              </p>
            )}
          </div>
        ) : (
          <>
            {book.pages[bookPage].picture ? (
              <img src={book.pages[bookPage].picture ?? undefined} alt="" className="aspect-[4/3] w-full max-w-md rounded-md object-cover" />
            ) : (
              <div className="bg-muted flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-md">
                <BookOpenIcon aria-hidden="true" className="size-16 opacity-40" />
              </div>
            )}
            <p className="text-center text-3xl leading-relaxed font-semibold">
              {display.words.map((word) => {
                const key = `${bookPage}:${word.index}`;
                const lit = word.index === marked;
                return (
                  <span key={word.index}>
                    {word.lead}
                    {mode === "turn" ? (
                      <button
                        type="button"
                        onClick={() => tapWord(key, word.text, maps?.displayToAudio[word.index] ?? -1)}
                        className={cn("min-h-16 rounded px-1", lit && HIGHLIGHT_CLASSES.currentWord)}
                      >
                        {wordFace(key, word.text)}
                      </button>
                    ) : (
                      <span className={cn("rounded px-1", lit && HIGHLIGHT_CLASSES.currentWord)}>{word.text}</span>
                    )}
                  </span>
                );
              })}
              {display.tail}
            </p>
          </>
        )}
        <div className="flex w-full items-center justify-between gap-2">
          <button type="button" aria-label={t("prevPage")} disabled={page === 0} onClick={() => go(page - 1)} className={cn(rpgButton("wood"), BIG)}>
            <ChevronLeftIcon aria-hidden="true" className="size-8" />
          </button>
          <span className="text-lg tabular-nums">{t("pageOf", { page: page + 1, count })}</span>
          <button
            type="button"
            aria-label={t("nextPage")}
            disabled={page === count - 1}
            onClick={() => go(page + 1)}
            className={cn(rpgButton("wood"), BIG)}
          >
            <ChevronRightIcon aria-hidden="true" className="size-8" />
          </button>
        </div>
      </div>
      {mode === "turn" && bookPage >= 0 && (
        <p className="flex items-center justify-center gap-2 text-center">
          <Volume2Icon aria-hidden="true" className="size-5" />
          {t(book.blend ? "blendHint" : "myTurnHint")}
        </p>
      )}
      {hasVoice && mode === "read" && bookPage >= 0 && (
        <ReadAlongPlayer
          playing={isPlaying}
          speed={speed}
          speeds={STORYTIME_SPEEDS}
          sentenceIndex={position.sentenceIndex}
          sentenceCount={book.sentences.length}
          onPlayPause={playPause}
          onPlaySentence={playSentence}
          onSpeedChange={setSpeed}
          className="bottom-0"
        />
      )}
    </div>
  );
}
