"use client";

/**
 * The Storytime client reader (plan task 3.3, spec FR-6).
 *
 * The server page loads and gates the week, then passes the read-along book and the translated
 * labels. The reader holds the audio element, the page turner, the modes, and the page-end stop.
 * It never speaks with the phone voice (rule 10.5): every sound is a recorded file.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ReadAlongPassage } from "@reading-advantage/read-along/components/read-along/read-along-passage";
import type { ReadAlongSentence } from "@reading-advantage/read-along/lib/align";
import {
  findPosition,
  NO_POSITION,
  sentencesOfPage,
  type ReadAlongPosition,
} from "@reading-advantage/read-along/lib/position";
import { seekOrWait, wordCutBounds } from "@reading-advantage/read-along/lib/seek";
import { seekAndRun, stopAtMediaEnd } from "../../../../../lib/audio-seek";
import type { BookQuestion } from "../../../../../lib/questions";
import { StorytimeQuestions, type QuestionLabels, type QuestionTile } from "./questions";

/** The decodable part of the client reader (plan task 3.4, spec FR-7). */
export { StorytimeDecodable } from "./decodable";

/** One timed sentence of a book audio, with its 1-based page. */
type TimedSentence = ReadAlongSentence & { page?: number };

/** One picture of a book page. */
interface ReaderImage {
  /** The file, relative to the media base. */
  file?: string;
  /** The alt text; an empty caption gives an empty alt. */
  caption?: string;
}

/** One page of the read-along book. */
interface ReaderPage {
  /** The page text. */
  text?: string;
  /** The page picture. */
  image?: ReaderImage;
}

/** The narration and the real slow reading of the book. */
interface ReaderAudio {
  /** The normal recording. */
  file?: string;
  /** The real slow recording (rule 10.1). */
  slowFile?: string;
  /** The sentence timings of the normal recording. */
  sentences?: TimedSentence[];
  /** The sentence timings of the slow recording. */
  slowSentences?: TimedSentence[];
}

/** The read-along book that the server page passes. */
interface ReaderBook {
  /** The pages in order. */
  pages: ReaderPage[];
  /** The audio of the book. */
  audio?: ReaderAudio;
}

/** The translated labels of the reader controls. */
interface ReaderLabels {
  /** "Read it to me". */
  readToMe: string;
  /** "My turn". */
  myTurn: string;
  /** The slow mode. */
  slow: string;
  /** The previous page arrow. */
  previousPage: string;
  /** The next page arrow. */
  nextPage: string;
  /** The message of a failed sound. */
  audioError: string;
  /** The message at the end of the book. */
  finished: string;
}

/** The props of the client reader. */
interface StorytimeReaderProps {
  /** The read-along book of the week. */
  book: ReaderBook;
  /** The page language; it also names the language of the error message. */
  locale: string;
  /** The translated control labels. */
  labels: ReaderLabels;
  /** The questions of the read-along book; the screen shows when the page passes them. */
  questions?: BookQuestion[];
  /** The three tiles of the week page, which the end of the question screen shows. */
  tiles?: QuestionTile[];
  /** The translated labels of the question screen. */
  questionLabels?: QuestionLabels;
  /** The media base URL; the default is `/media`. */
  mediaBase?: string;
}

/** The Thai message of a failed sound, so the Thai page needs no Thai label from the caller. */
const THAI_AUDIO_ERROR = "เล่นเสียงไม่ได้";

/** The horizontal swipe distance, in pixels, that turns one page. */
const SWIPE_MIN_PX = 50;

/** The last window of a page, in seconds, inside which the page stop arms its timer (finding F123). */
const PAGE_STOP_WINDOW_S = 0.3;

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
 * Renders one read-along book for a child (spec FR-6).
 *
 * "Read it to me" plays the page recording and lights the current word. "My turn" stays silent
 * until a word tap, then plays the measured word cut. "Slow" plays the real slow recording at a
 * normal rate. The arrows and a horizontal swipe move one page. The audio stops at the last
 * sentence of the page and at the end of a word cut.
 * @param props See `StorytimeReaderProps`.
 * @returns The book page, the controls, and the audio element.
 */
export function StorytimeReader({
  book,
  locale,
  labels,
  questions = [],
  tiles = [],
  questionLabels,
  mediaBase = "/media",
}: StorytimeReaderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // F140: cancels the pending media-clock stop of the word cut; `clearStopTimer` runs it.
  const stopCancelRef = useRef<(() => void) | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [mode, setMode] = useState<"idle" | "listen" | "myTurn" | "slow">("idle");
  const [position, setPosition] = useState<ReadAlongPosition>(NO_POSITION);
  const [cutEnd, setCutEnd] = useState<number | null>(null);
  const [audioFailed, setAudioFailed] = useState(false);
  const [finished, setFinished] = useState(false);

  const pageNumber = pageIndex + 1;
  const normalSentences = useMemo(
    () => sentencesOfPage(book.audio?.sentences ?? [], pageNumber),
    [book.audio, pageNumber],
  );
  const slowSentences = useMemo(
    () => sentencesOfPage(book.audio?.slowSentences ?? [], pageNumber),
    [book.audio, pageNumber],
  );
  const timingSentences =
    mode === "slow" && slowSentences.length > 0 ? slowSentences : normalSentences;
  const page = book.pages[pageIndex];

  useEffect(() => clearStopTimer, []);

  /**
   * Plays the audio element and reports a rejected playback as a failed sound.
   * @param element The audio element.
   */
  function playAudio(element: HTMLAudioElement): void {
    try {
      const result = element.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => setAudioFailed(true));
      }
    } catch {
      setAudioFailed(true);
    }
  }

  /** Clears the pending media-clock stop and the pending stop timer (findings F123, F140). */
  function clearStopTimer(): void {
    if (stopCancelRef.current !== null) {
      stopCancelRef.current();
      stopCancelRef.current = null;
    }
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  /**
   * Arms the timer that stops the audio at an end time without a `timeupdate` event. A browser
   * fires `timeupdate` about every 250 ms, so a 0.3 s cut can overshoot when the stop waits for
   * it (finding F123).
   * @param delayMs The delay from now, in milliseconds.
   * @param onFire The stop action.
   */
  function armStop(delayMs: number, onFire: () => void): void {
    clearStopTimer();
    stopTimerRef.current = setTimeout(() => {
      stopTimerRef.current = null;
      onFire();
    }, Math.max(0, delayMs));
  }

  /**
   * Stops the audio and clears the current mark.
   */
  function stopAudio(): void {
    const element = audioRef.current;
    if (!element) return;
    element.pause();
    element.currentTime = 0;
    clearStopTimer();
    setCutEnd(null);
    setPosition(NO_POSITION);
  }

  /**
   * Resets the marks of the previous mode.
   */
  function resetMarks(): void {
    clearStopTimer();
    setCutEnd(null);
    setPosition(NO_POSITION);
    setAudioFailed(false);
    setFinished(false);
  }

  /**
   * Starts the page recording from the first sentence of the page.
   */
  function startListen(): void {
    resetMarks();
    setMode("listen");
    const element = audioRef.current;
    if (!element || !book.audio?.file) return;
    element.src = mediaUrl(mediaBase, book.audio.file);
    element.playbackRate = 1;
    const first = normalSentences[0];
    // A seek at readyState 0 applies on the loadedmetadata event (finding F122).
    if (first) seekOrWait(element, Math.max(0, first.startTime - 0.05));
    if (first) setPosition({ sentenceIndex: 0, wordIndex: -1 });
    playAudio(element);
  }

  /**
   * Starts "My turn": the reader stays silent until the child taps a word.
   */
  function startMyTurn(): void {
    resetMarks();
    setMode("myTurn");
    const element = audioRef.current;
    if (!element || !book.audio?.file) return;
    element.src = mediaUrl(mediaBase, book.audio.file);
    element.playbackRate = 1;
    element.pause();
  }

  /**
   * Starts the slow mode from the real slow recording at a normal playback rate (rule 10.1).
   */
  function startSlow(): void {
    resetMarks();
    setMode("slow");
    const element = audioRef.current;
    if (!element || !book.audio?.slowFile) return;
    element.src = mediaUrl(mediaBase, book.audio.slowFile);
    element.playbackRate = 1;
    playAudio(element);
  }

  /**
   * Plays one word cut in "My turn" (rule 10.2).
   * @param sentenceIndex Index of the sentence on the page.
   * @param audioWordIndex Index of the audio word; -1 when the screen word has no timing.
   */
  function onWordTap(sentenceIndex: number, audioWordIndex: number): void {
    if (mode !== "myTurn") return;
    const element = audioRef.current;
    const sentence = timingSentences[sentenceIndex] ?? normalSentences[sentenceIndex];
    const word = sentence?.words[audioWordIndex];
    if (!element || !word) return;
    const bounds = wordCutBounds(word);
    // The seek re-applies on loadedmetadata when the element has no metadata yet (finding
    // F122). The cut stop follows the media clock: the timer re-arms while `currentTime` is
    // still below the cut end, so output latency and a mid-word stall do not cut the end of
    // the word (finding F140).
    seekAndRun(element, bounds.start, () => {
      stopCancelRef.current = stopAtMediaEnd(element, bounds.end, () => {
        audioRef.current?.pause();
        setCutEnd(null);
        setPosition(NO_POSITION);
      });
    });
    setCutEnd(bounds.end);
    setPosition({ sentenceIndex, wordIndex: audioWordIndex });
    playAudio(element);
  }

  /**
   * Follows the playback and stops at the word cut end or at the last sentence of the page.
   */
  function onTimeUpdate(): void {
    const element = audioRef.current;
    if (!element) return;
    if (cutEnd !== null && element.currentTime >= cutEnd) {
      element.pause();
      clearStopTimer();
      setCutEnd(null);
      setPosition(NO_POSITION);
      return;
    }
    if (mode !== "listen" && mode !== "slow") return;
    setPosition(findPosition(timingSentences, element.currentTime, position));
    const last = timingSentences[timingSentences.length - 1];
    if (!last) return;
    const remaining = last.endTime - element.currentTime;
    // A browser fires timeupdate about every 250 ms, so the stop arms a timer inside the last
    // window and runs without the next timeupdate (finding F123).
    if (remaining > 0 && remaining <= PAGE_STOP_WINDOW_S && stopTimerRef.current === null) {
      armStop(remaining * 1000, () => audioRef.current?.pause());
    }
    if (element.currentTime >= last.endTime) element.pause();
  }

  /**
   * Moves to one page, or to the end view past the last page.
   * @param next The next page index.
   */
  function goToPage(next: number): void {
    stopAudio();
    setMode("idle");
    setFinished(false);
    if (next < 0) return;
    if (next >= book.pages.length) {
      setFinished(true);
      return;
    }
    setPageIndex(next);
  }

  const image = page?.image;

  return (
    <div
      className="flex flex-col gap-4"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        const touch = event.changedTouches[0];
        touchStartRef.current = null;
        if (!start || !touch) return;
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < SWIPE_MIN_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;
        goToPage(deltaX < 0 ? pageIndex + 1 : pageIndex - 1);
      }}
    >
      {finished && questions.length > 0 && questionLabels ? (
        <StorytimeQuestions
          questions={questions}
          pages={book.pages}
          tiles={tiles}
          locale={locale}
          labels={questionLabels}
          mediaBase={mediaBase}
        />
      ) : finished ? (
        <p className="text-lg font-semibold">{labels.finished}</p>
      ) : (
        <>
          <div data-page-content data-page-number={pageNumber} className="flex flex-col gap-3">
            {image?.file ? (
              <img
                src={mediaUrl(mediaBase, image.file)}
                alt={image.caption ?? ""}
                loading="lazy"
                decoding="async"
                className="w-full rounded-2xl object-cover"
              />
            ) : null}
            {/* The book text is English on every locale, so the nearest lang of a word is en
                even on the printed th route (finding F134). */}
            <div lang="en">
              <ReadAlongPassage
                sentences={normalSentences}
                passage=""
                position={position}
                active={mode !== "idle"}
                onWordTap={mode === "myTurn" ? onWordTap : undefined}
                tapTargetFloor
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={labels.previousPage}
              disabled={pageIndex === 0}
              onClick={() => goToPage(pageIndex - 1)}
              className="min-h-12 rounded-xl border border-neutral-300 px-4 disabled:opacity-40"
            >
              ←
            </button>
            <button
              type="button"
              aria-label={labels.nextPage}
              onClick={() => goToPage(pageIndex + 1)}
              className="min-h-12 rounded-xl border border-neutral-300 px-4"
            >
              →
            </button>
            <button
              type="button"
              onClick={startListen}
              className="min-h-12 rounded-xl border border-neutral-300 px-4"
            >
              {labels.readToMe}
            </button>
            <button
              type="button"
              onClick={startMyTurn}
              className="min-h-12 rounded-xl border border-neutral-300 px-4"
            >
              {labels.myTurn}
            </button>
            <button
              type="button"
              onClick={startSlow}
              className="min-h-12 rounded-xl border border-neutral-300 px-4"
            >
              {labels.slow}
            </button>
          </div>
          <audio
            ref={audioRef}
            preload="metadata"
            onError={() => setAudioFailed(true)}
            onTimeUpdate={onTimeUpdate}
          />
          {audioFailed ? (
            <p role="alert" lang={locale} className="text-red-700">
              {locale === "th" ? THAI_AUDIO_ERROR : labels.audioError}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
