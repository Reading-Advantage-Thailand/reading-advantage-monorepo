"use client";

/**
 * The decodable part of a Storytime week (plan task 3.4, spec FR-7).
 *
 * The sounds page shows the element, its graphemes, and its sound; a tap plays the recorded bank
 * clip. A tap on a decodable word asks `blendPlanForWord` how the word plays. A blend word plays its
 * graphemes from the phoneme bank in reading order, then the whole word from the book recording. A
 * tricky word and every word of a sound book play whole. The component never uses the phone voice
 * (rule 10.5): every sound is a recorded file.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { blendPlanForWord } from "../../../../../lib/blend";
import { seekAndRun } from "../../../../../lib/audio-seek";
import type { StorytimeBook, StorytimeWeek } from "../../../../../lib/contracts/week";
import { PHONEME_BANK, PHONEME_BANK_COUNT } from "../../../../../lib/phoneme-bank";

/** The props of the decodable part. */
interface StorytimeDecodableProps {
  /** The week, with its decodable book. */
  week: StorytimeWeek;
  /** The page language; it selects the Thai control labels. */
  locale: string;
  /** The media base URL; the default is `/media`. */
  mediaBase?: string;
}

/** The pattern of one word of a page; spaces and punctuation stay outside the match. */
const WORD_PATTERN = /([\p{L}\p{N}][\p{L}\p{N}'’-]*)/u;

/** The pattern of one token that is a whole word. */
const WORD_TOKEN = /^[\p{L}\p{N}][\p{L}\p{N}'’-]*$/u;

/** The first bank clip of each grapheme. */
const CLIP_BY_GRAPHEME = new Map<string, string>();
for (const clip of PHONEME_BANK) {
  if (!CLIP_BY_GRAPHEME.has(clip.grapheme)) CLIP_BY_GRAPHEME.set(clip.grapheme, clip.file);
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
 * Reports whether a token of the page text is a word.
 * @param token One token of the split page text.
 * @returns `true` for a word with no edge punctuation.
 */
function isWord(token: string): boolean {
  return WORD_TOKEN.test(token);
}

/**
 * Renders one decodable part for a child (spec FR-7).
 * @param props See `StorytimeDecodableProps`.
 * @returns The sounds page, the current book page, the tricky words, and the audio elements.
 */
export function StorytimeDecodable({
  week,
  locale,
  mediaBase = "/media",
}: StorytimeDecodableProps) {
  const phonemeRef = useRef<HTMLAudioElement | null>(null);
  const wholeRef = useRef<HTMLAudioElement | null>(null);
  const wholeEndRef = useRef<number | null>(null);
  const wholeStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blendGenerationRef = useRef(0);
  const [phonemeSrc, setPhonemeSrc] = useState<string | null>(null);
  const [wholeSrc, setWholeSrc] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const decodable: StorytimeBook | undefined = week.books.find(
    (book) => book.kind === "decodable",
  );
  const page = decodable?.pages[pageIndex];
  const pageNumber = pageIndex + 1;
  const element = week.focus?.element;
  const soundsPage = decodable?.soundsPage;
  const tricky = useMemo(() => {
    const words = new Map<string, string>();
    for (const word of week.focus?.trickyWords ?? []) {
      if (!words.has(word.toLowerCase())) words.set(word.toLowerCase(), word);
    }
    for (const word of soundsPage?.tricky ?? []) {
      if (!words.has(word.toLowerCase())) words.set(word.toLowerCase(), word);
    }
    return [...words.values()];
  }, [week.focus?.trickyWords, soundsPage?.tricky]);

  /**
   * Reports whether a play rejection is the abort of a replaced load (finding F120).
   * @param error The rejection value of a play promise.
   * @returns `true` for an `AbortError` DOMException.
   */
  function isAbortError(error: unknown): boolean {
    return typeof error === "object" && error !== null
      && (error as { name?: string }).name === "AbortError";
  }

  /**
   * Plays one audio element and records a failed sound (rule 10.4). An aborted play is the
   * normal effect of a newer load on the same element, so it shows no error alert (finding F120).
   * @param target The audio element.
   */
  function playElement(target: HTMLAudioElement | null): void {
    if (!target) return;
    try {
      const result = target.play();
      if (result && typeof result.catch === "function") {
        result.catch((error: unknown) => {
          if (!isAbortError(error)) setFailed(true);
        });
      }
    } catch (error) {
      if (!isAbortError(error)) setFailed(true);
    }
  }

  /**
   * Plays one clip on one element and settles when the element ends the clip (finding F120).
   * The promise settles on the `ended` event, not on the play start, so a caller can chain
   * clips.
   * @param target The audio element.
   * @returns The promise of the clip end; it rejects on a failed or aborted play.
   */
  function playClip(target: HTMLAudioElement): Promise<void> {
    return new Promise((resolveClip, rejectClip) => {
      const stop = () => {
        target.removeEventListener("ended", onEnded);
        target.removeEventListener("error", onError);
      };
      const onEnded = () => {
        stop();
        resolveClip();
      };
      const onError = () => {
        stop();
        rejectClip(new Error("The clip could not be played."));
      };
      target.addEventListener("ended", onEnded);
      target.addEventListener("error", onError);
      try {
        const result = target.play();
        if (result && typeof result.catch === "function") {
          result.catch((error: unknown) => {
            stop();
            rejectClip(error);
          });
        }
      } catch (error) {
        stop();
        rejectClip(error);
      }
    });
  }

  /**
   * Stops a running blend sequence and starts a new generation: a sequence returns at its next
   * step when the generation number no longer matches (finding F120).
   * @returns The new generation number.
   */
  function stopBlendSequence(): number {
    blendGenerationRef.current += 1;
    return blendGenerationRef.current;
  }

  /**
   * Plays one recorded clip on the phoneme element. A tap here also stops a running blend
   * sequence (finding F120).
   * @param file The clip file, relative to the media base.
   */
  function playPhoneme(file: string): void {
    stopBlendSequence();
    const url = mediaUrl(mediaBase, file);
    const target = phonemeRef.current;
    if (target) {
      target.src = url;
      playElement(target);
    }
    setPhonemeSrc(url);
    setFailed(false);
  }

  /**
   * Plays the grapheme clips of a blend word one at a time in reading order, then the whole
   * word after the last clip ends (spec FR-7, finding F120).
   * @param graphemes The graphemes of the word, in reading order.
   * @param word The whole word, played after the last clip ends.
   * @returns `true` when every grapheme has a bank clip and the sequence started.
   */
  function playBlend(graphemes: string[], word: string): boolean {
    const files: string[] = [];
    for (const grapheme of graphemes) {
      const file = CLIP_BY_GRAPHEME.get(grapheme);
      if (!file) return false;
      files.push(file);
    }
    const generation = stopBlendSequence();
    runBlendSequence(files, word, generation).catch(() => setFailed(true));
    return true;
  }

  /**
   * Runs one blend sequence: the phoneme element plays each clip, and the next clip starts
   * when the element ends the previous one. The whole word starts after the last clip ends. A
   * second word tap, a sounds-page tap, or a page turn raises the generation number and stops
   * this sequence; the abort of its pending play shows no error alert.
   * @param files The clip files, in reading order.
   * @param word The whole word.
   * @param generation The generation of this sequence.
   */
  async function runBlendSequence(files: string[], word: string, generation: number): Promise<void> {
    setFailed(false);
    for (const file of files) {
      const target = phonemeRef.current;
      if (!target || blendGenerationRef.current !== generation) return;
      const url = mediaUrl(mediaBase, file);
      setPhonemeSrc(url);
      target.src = url;
      try {
        await playClip(target);
      } catch (error) {
        // A newer load on the element aborts this play; that is not a failure (finding F120).
        if (!isAbortError(error)) setFailed(true);
        return;
      }
    }
    if (blendGenerationRef.current !== generation) return;
    playWhole(word);
  }

  /**
   * Finds the recorded time range of one word on a page.
   * @param word The word from the page.
   * @param pageNumber The 1-based page number.
   * @returns The start and end seconds, or `null` when the timing has no such word.
   */
  function wordBounds(word: string, pageNumber: number): { start: number; end: number } | null {
    const sentences = decodable?.audio?.sentences ?? [];
    const lower = word.toLowerCase();
    const onPage = sentences.filter((sentence) => sentence.page === pageNumber);
    for (const sentence of [...onPage, ...sentences]) {
      const timing = sentence.words.find((entry) => entry.word.toLowerCase() === lower);
      if (timing) return { start: timing.start, end: timing.end };
    }
    return null;
  }

  /** Clears the pending stop timer of the whole-word recording (finding F123). */
  function clearWholeStopTimer(): void {
    if (wholeStopRef.current !== null) {
      clearTimeout(wholeStopRef.current);
      wholeStopRef.current = null;
    }
  }

  /**
   * Arms the timer that stops the whole-word recording at its word-cut end without a
   * `timeupdate` event. A browser fires `timeupdate` about every 250 ms, so a 0.3 s cut can
   * overshoot when the stop waits for it (finding F123).
   * @param bounds The start and end of the word cut, in seconds.
   */
  function armWholeStop(bounds: { start: number; end: number }): void {
    clearWholeStopTimer();
    wholeStopRef.current = setTimeout(() => {
      wholeStopRef.current = null;
      wholeEndRef.current = null;
      wholeRef.current?.pause();
    }, Math.max(0, (bounds.end - bounds.start) * 1000));
  }

  /**
   * Plays one whole word from the book recording.
   * @param word The word from the page or the tricky-word list.
   */
  function playWhole(word: string): void {
    const file = decodable?.audio?.file;
    const target = wholeRef.current;
    if (!file || !target) {
      setFailed(true);
      return;
    }
    const bounds = wordBounds(word, pageNumber);
    const url = mediaUrl(mediaBase, file);
    target.src = url;
    setWholeSrc(url);
    if (bounds) {
      // The seek re-applies on loadedmetadata when the element has no metadata yet (finding
      // F122). The cut stop arms once the seek is in place, so the timer starts with the cut.
      seekAndRun(target, bounds.start, () => armWholeStop(bounds));
      wholeEndRef.current = bounds.end;
    } else {
      clearWholeStopTimer();
      wholeEndRef.current = null;
      target.currentTime = 0;
    }
    playElement(target);
    setFailed(false);
  }

  /**
   * Stops the whole-word recording at the end of its measured word cut.
   */
  function onWholeTimeUpdate(): void {
    const target = wholeRef.current;
    const end = wholeEndRef.current;
    if (!target || end === null) return;
    if (target.currentTime >= end) {
      target.pause();
      clearWholeStopTimer();
      wholeEndRef.current = null;
    }
  }

  useEffect(() => () => {
    clearWholeStopTimer();
    stopBlendSequence();
  }, []);

  /**
   * Plays one tapped word: a blend word plays its graphemes first and the whole word after the
   * last clip ends; every other word plays whole at once (finding F120). When no clip bank
   * covers the word, only the whole word plays, as before.
   * @param word The word from the page or the tricky-word list.
   */
  function onWordTap(word: string): void {
    const plan = blendPlanForWord(word, week);
    if (plan.mode === "blend" && playBlend(plan.graphemes, word)) return;
    playWhole(word);
  }

  const thai = locale === "th";

  return (
    <div className="flex flex-col gap-4" data-phoneme-bank={PHONEME_BANK_COUNT}>
      <audio ref={phonemeRef} preload="none" src={phonemeSrc ?? undefined} onError={() => setFailed(true)} />
      <audio
        ref={wholeRef}
        preload="none"
        src={wholeSrc ?? undefined}
        onTimeUpdate={onWholeTimeUpdate}
        onError={() => setFailed(true)}
      />
      {element ? (
        <section aria-label={thai ? "เสียงของสัปดาห์" : "Sound of the week"} className="flex flex-col gap-2">
          <p className="text-3xl font-semibold" lang="en">
            {element.graphemes.join(" ")}
          </p>
          <p className="text-2xl" lang="en">
            {element.sound}
          </p>
          {element.audio ? (
            <button
              type="button"
              onClick={() => playPhoneme(element.audio!)}
              className="min-h-12 rounded-xl border border-neutral-300 px-4"
            >
              {thai ? "เล่นเสียง" : "Play the sound"}
            </button>
          ) : null}
        </section>
      ) : null}
      {page ? (
        <section data-page-number={pageNumber} className="flex flex-col gap-3">
          {page.image?.file ? (
            <img
              src={mediaUrl(mediaBase, page.image.file)}
              alt={page.image.caption ?? ""}
              loading="lazy"
              decoding="async"
              className="w-full rounded-2xl object-cover"
            />
          ) : null}
          <p className="flex flex-wrap items-center gap-x-1 whitespace-pre-wrap text-2xl" lang="en">
            {page.text.split(WORD_PATTERN).map((token, index) =>
              isWord(token) ? (
                <button
                  key={index}
                  type="button"
                  onClick={() => onWordTap(token)}
                  className="rounded px-0.5 hover:bg-neutral-100"
                >
                  {token.toUpperCase()}
                </button>
              ) : (
                <span key={index}>{token}</span>
              ),
            )}
          </p>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-label={thai ? "หน้าก่อน" : "Previous page"}
          disabled={pageIndex === 0}
          onClick={() => {
            stopBlendSequence();
            setPageIndex((index) => Math.max(0, index - 1));
          }}
          className="min-h-12 rounded-xl border border-neutral-300 px-4 disabled:opacity-40"
        >
          ←
        </button>
        <button
          type="button"
          aria-label={thai ? "หน้าต่อไป" : "Next page"}
          disabled={!decodable || pageIndex >= decodable.pages.length - 1}
          onClick={() => {
            stopBlendSequence();
            setPageIndex((index) => Math.min((decodable?.pages.length ?? 1) - 1, index + 1));
          }}
          className="min-h-12 rounded-xl border border-neutral-300 px-4 disabled:opacity-40"
        >
          →
        </button>
      </div>
      {tricky.length > 0 ? (
        <section aria-label={thai ? "คำที่จำทั้งคำ" : "Tricky words"} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold" lang="en">
            {thai ? "คำที่จำทั้งคำ" : "Tricky words"}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {tricky.map((word) => (
              <li key={word}>
                <button
                  type="button"
                  onClick={() => onWordTap(word)}
                  className="min-h-12 rounded-full border border-neutral-300 px-4"
                >
                  {word.toUpperCase()}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {failed ? (
        <p role="alert" lang={locale} className="text-red-700">
          {thai ? "เล่นเสียงไม่ได้" : "The sound could not be played."}
        </p>
      ) : null}
    </div>
  );
}
