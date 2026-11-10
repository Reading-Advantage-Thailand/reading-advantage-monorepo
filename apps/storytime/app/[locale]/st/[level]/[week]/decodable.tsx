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
import { mediaUrl } from "../../../../../lib/media/url";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { markPartDone } from "../../../../../lib/done";
import { isAbortError } from "../../../../../lib/is-abort-error";
import { blendPlanForWord } from "../../../../../lib/blend";
import { seekAndRun, stopAtMediaEnd } from "../../../../../lib/audio-seek";
import type { StorytimeBook, StorytimeWeek } from "../../../../../lib/contracts/week";
import { PHONEME_BANK, PHONEME_BANK_COUNT } from "../../../../../lib/phoneme-bank";

/**
 * The translated labels of the decodable part (finding F137). The server page passes the labels
 * from the message files; the defaults keep the exact strings that the component held before,
 * so a caller without labels still renders the same text.
 */
interface DecodableLabels {
  /** The accessible name of the sounds-page section. */
  soundOfWeek: string;
  /** The label of the button that plays the recorded sound of the focus element. */
  playSound: string;
  /** The heading and accessible name of the tricky-words section. */
  trickyWords: string;
  /** The accessible name of the previous-page button. */
  previousPage: string;
  /** The accessible name of the next-page button. */
  nextPage: string;
  /** The alert that shows when a recorded sound fails to play. */
  audioError: string;
  /** The label of the sound button while its sound plays. */
  playing: string;
}

/** The props of the decodable part. */
interface StorytimeDecodableProps {
  /** The week, with its decodable book. */
  week: StorytimeWeek;
  /** The page language; it selects the Thai control labels. */
  locale: string;
  /** The signed media URL of each file name; a file with no entry gets an empty URL. */
  mediaUrls?: Record<string, string>;
  /** The translated labels; the default keeps the exact pre-remediation strings (finding F137). */
  labels?: Partial<DecodableLabels>;
  /** The `<level>:<week>:<part>` key that the book writes to the done record at its last page. */
  doneKey?: string;
}

/**
 * Builds the label set of one render: the page labels override the locale defaults, which keep
 * the exact strings that the component hard-coded before finding F137 moved them to the message
 * files.
 * @param locale The page language.
 * @param labels The labels from the server page, when given.
 * @returns The full label set for this render.
 */
function labelsFor(locale: string, labels?: Partial<DecodableLabels>): DecodableLabels {
  const thai = locale === "th";
  const defaults: DecodableLabels = thai
    ? {
        soundOfWeek: "เสียงของสัปดาห์",
        playSound: "เล่นเสียง",
        trickyWords: "คำที่จำทั้งคำ",
        previousPage: "หน้าก่อน",
        nextPage: "หน้าต่อไป",
        audioError: "เล่นเสียงไม่ได้",
        playing: "กำลังเล่น",
      }
    : {
        soundOfWeek: "Sound of the week",
        playSound: "Play the sound",
        trickyWords: "Tricky words",
        previousPage: "Previous page",
        nextPage: "Next page",
        audioError: "The sound could not be played.",
        playing: "Playing",
      };
  return { ...defaults, ...labels };
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


/**
 * Reports whether a token of the page text is a word.
 * @param token One token of the split page text.
 * @returns `true` for a word with no edge punctuation.
 */
function isWord(token: string): boolean {
  return WORD_TOKEN.test(token);
}

/** One piece of a decodable sentence: a plain token, or a word with its trailing punctuation. */
interface SentencePiece {
  /** The word of a tappable piece. */
  word?: string;
  /** The punctuation that sits right after the word, with no flex gap. */
  trailing?: string[];
  /** The plain text of a piece that is not a word. */
  text?: string;
}

/** The punctuation that ends a word before its gap, as one run (finding F240). */
const WORD_END_PUNCTUATION = /^([^\s\p{L}\p{N}]+)(\s[\s\S]*)$/u;

/**
 * Splits one page text into pieces. Trailing punctuation joins its word in one flex item, so
 * the flex gap cannot open a space before a stop (findings F151, F240) and a line break
 * cannot start a line with a stop. A comma that sits before a space joins its word too, and
 * the space stays a plain piece, so no character moves or doubles. The tap floor and the
 * word gaps stay.
 * @param text The page text.
 * @returns The pieces, in reading order.
 */
function sentencePieces(text: string): SentencePiece[] {
  const tokens = text.split(WORD_PATTERN);
  const pieces: SentencePiece[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (isWord(token)) {
      const trailing: string[] = [];
      const after: string[] = [];
      while (index + 1 < tokens.length) {
        const next = tokens[index + 1]!;
        if (next.length === 0 || isWord(next)) break;
        if (!/\s/.test(next)) {
          trailing.push(next);
          index += 1;
          continue;
        }
        // A gap that holds a space: the punctuation that ends the word joins it, and the
        // whitespace stays a plain piece (finding F240).
        const gap = WORD_END_PUNCTUATION.exec(next);
        if (!gap) break;
        trailing.push(gap[1]!);
        after.push(gap[2]!);
        index += 1;
        break;
      }
      pieces.push({ word: token, trailing });
      for (const rest of after) pieces.push({ text: rest });
      continue;
    }
    pieces.push({ text: token });
  }
  return pieces;
}

/**
 * Builds the inline box style of one word button. A word narrower than 48 px keeps a 48 px tap
 * box, and a negative margin takes back the blank so the glyphs keep their text gap. The first
 * word has no left neighbor, so its box grows to the left and its right edge stays at the glyph:
 * the measured gap to the next word box then equals the visible gap (look task 2.3f).
 * @param word The word of the button.
 * @param first True for the first word of the sentence.
 * @returns The inline style of the button.
 */
function wordBoxStyle(word: string, first: boolean): CSSProperties {
  if (first) return { marginInlineStart: `min(0px, calc(${word.length}ch - 48px))`, justifyContent: "flex-end" };
  return { marginInline: `min(0px, calc((${word.length}ch - 48px) / 2))` };
}

/**
 * Renders one decodable part for a child (spec FR-7).
 * @param props See `StorytimeDecodableProps`.
 * @returns The sounds page, the current book page, the tricky words, and the audio elements.
 */
export function StorytimeDecodable({
  week,
  locale,
  mediaUrls = {},
  labels: labelOverrides,
  doneKey,
}: StorytimeDecodableProps) {
  const phonemeRef = useRef<HTMLAudioElement | null>(null);
  const wholeRef = useRef<HTMLAudioElement | null>(null);
  const wholeEndRef = useRef<number | null>(null);
  const wholeStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // F140: cancels the pending media-clock stop of the whole-word cut; `clearWholeStopTimer`
  // runs it.
  const wholeStopCancelRef = useRef<(() => void) | null>(null);
  // F241: drops a stop arm queued on `loadedmetadata`; `clearWholeStopTimer` runs it too, so a
  // rejected play cannot arm a stop for playback that never starts.
  const wholeSeekCancelRef = useRef<(() => void) | null>(null);
  const blendGenerationRef = useRef(0);
  // True while the "Play the sound" button owns the phoneme element; a blend word clears it.
  const soundOwnerRef = useRef(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(false);

  const decodable: StorytimeBook | undefined = week.books.find(
    (book) => book.kind === "decodable",
  );
  const page = decodable?.pages[pageIndex];
  const pageNumber = pageIndex + 1;
  const lastPage = (decodable?.pages.length ?? 1) - 1;

  // The decodable is done on this device when it reaches its last page.
  useEffect(() => {
    if (lastPage > 0 && pageIndex >= lastPage) markPartDone(doneKey);
  }, [pageIndex, lastPage, doneKey]);
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
          if (!isAbortError(error)) {
            setFailed(true);
            // A rejected play fires no media event, so the rejection also cancels the
            // pending whole-word stop; playback that never starts must not keep a stop
            // armed (finding F147).
            clearWholeStopTimer();
          }
        });
      }
    } catch (error) {
      if (!isAbortError(error)) {
        setFailed(true);
        clearWholeStopTimer();
      }
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
            // A rejected clip fires no media event; the whole-word stop has nothing to wait
            // for, so the rejection cancels it too (finding F147).
            clearWholeStopTimer();
            rejectClip(error);
          });
        }
      } catch (error) {
        stop();
        clearWholeStopTimer();
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
    const url = mediaUrl(mediaUrls, file);
    const target = phonemeRef.current;
    if (target) {
      // The imperative write is the only src write (the live browser-gate row found that a
      // second write through React state re-runs the load algorithm and aborts the pending
      // play, so no clip ever reached its end).
      target.src = url;
      playElement(target);
    }
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
    soundOwnerRef.current = false;
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
      const url = mediaUrl(mediaUrls, file);
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

  /** Clears the pending media-clock stop and the pending stop timer (findings F123, F140). */
  function clearWholeStopTimer(): void {
    if (wholeSeekCancelRef.current !== null) {
      wholeSeekCancelRef.current();
      wholeSeekCancelRef.current = null;
    }
    if (wholeStopCancelRef.current !== null) {
      wholeStopCancelRef.current();
      wholeStopCancelRef.current = null;
    }
    if (wholeStopRef.current !== null) {
      clearTimeout(wholeStopRef.current);
      wholeStopRef.current = null;
    }
  }

  /**
   * Arms the stop of the whole-word recording at its word-cut end. The stop follows the
   * media clock: it re-arms while `currentTime` is still below the cut end, so output
   * latency and a mid-word stall do not cut the end of the word (finding F140). The timer
   * also keeps the stop off the `timeupdate` cadence of about 250 ms (finding F123).
   * @param bounds The start and end of the word cut, in seconds.
   */
  function armWholeStop(bounds: { start: number; end: number }): void {
    clearWholeStopTimer();
    const target = wholeRef.current;
    if (!target) return;
    wholeStopCancelRef.current = stopAtMediaEnd(target, bounds.end, () => {
      wholeEndRef.current = null;
      wholeRef.current?.pause();
    });
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
    const url = mediaUrl(mediaUrls, file);
    // The imperative write is the only src write; see playPhoneme.
    target.src = url;
    if (bounds) {
      // The seek re-applies on loadedmetadata when the element has no metadata yet (finding
      // F122). The cut stop follows the media clock, so the pause lands at the measured end
      // even with output latency or a stall (finding F140). The queued arm of an earlier cut
      // is dropped first, and a rejected play drops this one (findings F146, F241).
      wholeSeekCancelRef.current?.();
      wholeSeekCancelRef.current = seekAndRun(target, bounds.start, () => {
        wholeSeekCancelRef.current = null;
        armWholeStop(bounds);
      });
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

  const labels = labelsFor(locale, labelOverrides);

  return (
    <div
      className="flex flex-col gap-4 [@media(max-height:500px)]:gap-2"
      data-phoneme-bank={PHONEME_BANK_COUNT}
    >
      <audio
        ref={phonemeRef}
        preload="none"
        onPlay={() => setSoundPlaying(soundOwnerRef.current)}
        onPause={() => setSoundPlaying(false)}
        onEnded={() => setSoundPlaying(false)}
        onError={() => {
          setSoundPlaying(false);
          setFailed(true);
        }}
      />
      <audio
        ref={wholeRef}
        preload="none"
        onTimeUpdate={onWholeTimeUpdate}
        onError={() => setFailed(true)}
      />
      {element ? (
        <section
          aria-label={labels.soundOfWeek}
          className="flex flex-col gap-2 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-center"
        >
          <p className="text-3xl font-semibold" lang="en">
            {element.graphemes.join(" ")}
          </p>
          <p className="text-2xl" lang="en">
            {element.sound}
          </p>
          {element.audio ? (
            <button
              type="button"
              aria-pressed={soundPlaying}
              onClick={() => {
                playPhoneme(element.audio!);
                soundOwnerRef.current = true;
              }}
              className="min-h-12 rounded-xl border border-[#92400e] px-4 aria-pressed:border-amber-500 aria-pressed:bg-amber-100"
            >
              {soundPlaying ? labels.playing : labels.playSound}
            </button>
          ) : null}
        </section>
      ) : null}
      {page ? (
        <section
          data-page-number={pageNumber}
          className="flex flex-col gap-3 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-start"
        >
          {page.image?.file ? (
            <img
              src={mediaUrl(mediaUrls, page.image.file)}
              alt={page.image.caption ?? ""}
              loading="lazy"
              decoding="async"
              className="w-full rounded-2xl object-cover [@media(max-height:500px)]:max-h-[40vh] [@media(max-height:500px)]:basis-[45%] [@media(max-height:500px)]:shrink-0"
            />
          ) : null}
          <p className="flex flex-wrap items-center whitespace-pre-wrap text-2xl [@media(max-height:500px)]:flex-1" lang="en">
            {sentencePieces(page.text).map((piece, index, pieces) =>
              piece.word ? (
                <span key={index} className="inline-flex items-baseline">
                  <button
                    type="button"
                    onClick={() => onWordTap(piece.word!)}
                    style={wordBoxStyle(piece.word, index === pieces.findIndex((entry) => entry.word))}
                    className="inline-flex min-h-[44px] items-center rounded hover:bg-[#fef3c7]"
                  >
                    {piece.word}
                  </button>
                  {(piece.trailing ?? []).map((token, trailingIndex) => (
                    <span key={trailingIndex}>{token}</span>
                  ))}
                </span>
              ) : (
                <span key={index}>{piece.text}</span>
              ),
            )}
          </p>
        </section>
      ) : null}
      {/* F360: in landscape the page arrows and the tricky words share one row, so the
      tricky-word buttons stay inside the 390 px viewport; portrait keeps the column. */}
      <div className="flex flex-col gap-4 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-start [@media(max-height:500px)]:gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={labels.previousPage}
            disabled={pageIndex === 0}
            onClick={() => {
              stopBlendSequence();
              setPageIndex((index) => Math.max(0, index - 1));
            }}
            className="min-h-12 rounded-xl border border-[#92400e] bg-[#92400e] px-4 text-white disabled:opacity-40"
          >
            ←
          </button>
          <button
            type="button"
            aria-label={labels.nextPage}
            disabled={!decodable || pageIndex >= decodable.pages.length - 1}
            onClick={() => {
              stopBlendSequence();
              setPageIndex((index) => Math.min((decodable?.pages.length ?? 1) - 1, index + 1));
            }}
            className="min-h-12 rounded-xl border border-[#92400e] bg-[#92400e] px-4 text-white disabled:opacity-40"
          >
            →
          </button>
        </div>
        {tricky.length > 0 ? (
          <section aria-label={labels.trickyWords} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold [@media(max-height:500px)]:text-sm" lang="en">
              {labels.trickyWords}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {tricky.map((word) => (
                <li key={word}>
                  <button
                    type="button"
                    onClick={() => onWordTap(word)}
                    className="inline-flex min-h-12 min-w-[44px] items-center justify-center rounded-full border border-[#92400e] bg-[#fcd34d] px-4 text-[#92400e]"
                  >
                    {word}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {failed ? (
        <p role="alert" lang={locale} className="text-red-700">
          {labels.audioError}
        </p>
      ) : null}
    </div>
  );
}
