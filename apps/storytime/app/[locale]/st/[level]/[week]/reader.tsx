"use client";

/**
 * The Storytime client reader (plan task 3.3, spec FR-6).
 *
 * The server page loads and gates the week, then passes the read-along book and the translated
 * labels. The reader holds the audio element, the page turner, the modes, and the page-end stop.
 * The highlight follows each frame through the `useReadAlong` loop of the package. A tap on a word
 * in "My turn" plays the clip of that word from the week package; it never plays a slice of the
 * sentence recording. It never speaks with the phone voice (rule 10.5): every sound is a recorded
 * file.
 */
import { mediaUrl } from "../../../../../lib/media/url";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReadAlongPassage } from "@reading-advantage/read-along/components/read-along/read-along-passage";
import type { ReadAlongSentence } from "@reading-advantage/read-along/lib/align";
import { useReadAlong } from "@reading-advantage/read-along/hooks/use-read-along";
import { findPosition, sentencesOfPage } from "@reading-advantage/read-along/lib/position";
import { seekOrWait } from "@reading-advantage/read-along/lib/seek";
import { markPartDone } from "../../../../../lib/done";
import { highlightWindows } from "../../../../../lib/highlight-windows";
import type { BookQuestion } from "../../../../../lib/questions";
import { StorytimeQuestions, WeekTileLinks, type QuestionLabels, type QuestionTile } from "./questions";

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
  /** The lower-case word to the clip file of that word; a tap plays the clip. */
  wordClips?: Record<string, string>;
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
  /** The label of an audio button while its sound plays; the locale default holds without it. */
  playing?: string;
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
  /** The signed media URL of each file name; a file with no entry gets an empty URL. */
  mediaUrls?: Record<string, string>;
  /** The `<level>:<week>:<part>` key that the book writes to the done record at its last page. */
  doneKey?: string;
}

/** The Thai message of a failed sound, so the Thai page needs no Thai label from the caller. */
const THAI_AUDIO_ERROR = "เล่นเสียงไม่ได้";

/** The playing label of each locale, for a caller that passes none (draft Thai, plan task 1.5). */
const DEFAULT_PLAYING = { th: "กำลังเล่น", en: "Playing" } as const;

/** The horizontal swipe distance, in pixels, that turns one page. */
const SWIPE_MIN_PX = 50;

/** The last window of a page, in seconds, inside which the page stop arms its timer (finding F123). */
const PAGE_STOP_WINDOW_S = 0.3;

/** The longest wait, in milliseconds, for the picture of the next page before the page turns. */
const PAGE_TURN_HOLD_MS = 3000;

/**
 * Builds the URL of one recorded file.
 * @param base The media base URL.
 * @param file The file, relative to the base.
 * @returns The URL, with one slash between the base and the file.
 */


/**
 * Renders one read-along book for a child (spec FR-6).
 *
 * "Read it to me" plays the page recording and lights the current word. "My turn" stays silent
 * until a word tap, then plays the clip of that word. "Slow" plays the real slow recording at a
 * normal rate. The arrows and a horizontal swipe move one page. A press on Next keeps the old
 * page until the new picture has loaded, so the sentence never shows over the wrong picture.
 * The audio stops at the last sentence of the page.
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
  mediaUrls = {},
  doneKey,
}: StorytimeReaderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipRef = useRef<HTMLAudioElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  // The page that waits for its picture after a press on Next; the shown page stays until then.
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<"idle" | "listen" | "myTurn" | "slow">("idle");
  const [clipPlaying, setClipPlaying] = useState(false);
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
  // The highlight windows borrow time for a short word; the page stop keeps the recorded times.
  const highlightSentences = useMemo(
    () =>
      timingSentences.map((sentence) => {
        const windows = highlightWindows(sentence.words);
        return {
          ...sentence,
          words: sentence.words.map((word, index) => ({ ...word, ...windows[index] })),
        };
      }),
    [timingSentences],
  );
  const { position, isPlaying, select, reset } = useReadAlong({
    audioRef,
    sentences: highlightSentences,
  });
  const page = book.pages[pageIndex];
  const wordClips = book.audio?.wordClips ?? {};
  const hasEnd = tiles.length > 0 || (questions.length > 0 && questionLabels !== undefined);
  const pressedMode = isPlaying || (mode === "myTurn" && clipPlaying) ? mode : null;
  const playingLabel = labels.playing ?? DEFAULT_PLAYING[locale === "th" ? "th" : "en"];

  useEffect(() => clearStopTimer, []);

  // The book is done on this device when it reaches its last page or its end view.
  useEffect(() => {
    if (finished || (book.pages.length > 1 && pageIndex >= book.pages.length - 1)) markPartDone(doneKey);
  }, [finished, pageIndex, book.pages.length, doneKey]);

  // The clip of a tapped word plays on its own element, never on the sentence recording.
  useEffect(() => {
    const clip = new Audio();
    const done = () => {
      setClipPlaying(false);
      reset();
    };
    const failed = () => {
      setAudioFailed(true);
      done();
    };
    clip.addEventListener("ended", done);
    clip.addEventListener("error", failed);
    clipRef.current = clip;
    return () => {
      clip.pause();
      clip.removeEventListener("ended", done);
      clip.removeEventListener("error", failed);
      clipRef.current = null;
    };
  }, [reset]);

  // A page that waits for its picture turns after the hold, so a failed picture cannot freeze it.
  useEffect(() => {
    if (pendingIndex === null) return;
    const timer = setTimeout(() => {
      setPageIndex(pendingIndex);
      setPendingIndex(null);
    }, PAGE_TURN_HOLD_MS);
    return () => clearTimeout(timer);
  }, [pendingIndex]);

  /**
   * Plays the audio element and reports a rejected playback as a failed sound.
   * A rejected play fires no media event, so the rejection also cancels the pending stop
   * loop or page stop; playback that never starts must not keep a stop armed (finding F147).
   * @param element The audio element.
   */
  function playAudio(element: HTMLAudioElement): void {
    try {
      const result = element.play();
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          setAudioFailed(true);
          clearStopTimer();
        });
      }
    } catch {
      setAudioFailed(true);
      clearStopTimer();
    }
  }

  /** Clears the pending page stop timer (finding F123). */
  function clearStopTimer(): void {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }

  /**
   * Arms the timer that stops the audio at an end time without a `timeupdate` event. A browser
   * fires `timeupdate` about every 250 ms, so the page stop can overshoot when it waits for the
   * next update (finding F123).
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
    reset();
  }

  /**
   * Resets the marks of the previous mode.
   */
  function resetMarks(): void {
    clearStopTimer();
    reset();
    setAudioFailed(false);
    setFinished(false);
  }

  /**
   * Starts the page recording from the first sentence of the page. A word clip that still
   * plays stops first, so the child never hears two sounds at once (carried item N3).
   */
  function startListen(): void {
    resetMarks();
    clipRef.current?.pause();
    setMode("listen");
    const element = audioRef.current;
    if (!element || !book.audio?.file) return;
    element.src = mediaUrl(mediaUrls, book.audio.file);
    element.playbackRate = 1;
    const first = normalSentences[0];
    // A seek at readyState 0 applies on the loadedmetadata event (finding F122).
    if (first) seekOrWait(element, Math.max(0, first.startTime - 0.05));
    if (first) select({ sentenceIndex: 0, wordIndex: -1 });
    playAudio(element);
  }

  /**
   * Starts "My turn": the reader stays silent until the child taps a word that has a clip.
   * A word clip that still plays stops first (carried item N3).
   */
  function startMyTurn(): void {
    resetMarks();
    clipRef.current?.pause();
    setMode("myTurn");
    audioRef.current?.pause();
  }

  /**
   * Starts the slow mode from the real slow recording at a normal playback rate (rule 10.1).
   * A word clip that still plays stops first, so the child never hears two sounds at once
   * (carried item N3).
   */
  function startSlow(): void {
    resetMarks();
    clipRef.current?.pause();
    setMode("slow");
    const element = audioRef.current;
    if (!element || !book.audio?.slowFile) return;
    element.src = mediaUrl(mediaUrls, book.audio.slowFile);
    element.playbackRate = 1;
    playAudio(element);
  }

  /**
   * Plays the clip of one tapped word in "My turn" (rule 10.2). A word with no clip does nothing.
   * The clip comes from the week package: a slice of the sentence recording would carry the
   * sound of the words next to it.
   * @param sentenceIndex Index of the sentence on the page.
   * @param audioWordIndex Index of the audio word; -1 when the screen word has no timing.
   */
  function onWordTap(sentenceIndex: number, audioWordIndex: number): void {
    if (mode !== "myTurn") return;
    const clip = clipRef.current;
    const sentence = timingSentences[sentenceIndex] ?? normalSentences[sentenceIndex];
    const word = sentence?.words[audioWordIndex];
    if (!clip || !word) return;
    const key = word.word.toLowerCase();
    if (!Object.hasOwn(wordClips, key)) return;
    const url = mediaUrl(mediaUrls, wordClips[key]!);
    if (url === "") {
      setAudioFailed(true);
      return;
    }
    setAudioFailed(false);
    select({ sentenceIndex, wordIndex: audioWordIndex });
    setClipPlaying(true);
    // A new clip replaces the one that plays: the source write restarts the same element.
    clip.src = url;
    const failed = () => {
      setAudioFailed(true);
      setClipPlaying(false);
      reset();
    };
    try {
      const result = clip.play();
      if (result && typeof result.catch === "function") {
        // A replaced clip aborts its own play; that is not a failure.
        result.catch((error: unknown) => {
          if ((error as { name?: string } | null)?.name !== "AbortError") failed();
        });
      }
    } catch {
      failed();
    }
  }

  /**
   * Follows the playback and stops at the last sentence of the page. The frame loop of
   * `useReadAlong` lights the words; this update lights them too, so a paused seek shows the word.
   */
  function onTimeUpdate(): void {
    const element = audioRef.current;
    if (!element) return;
    if (mode !== "listen" && mode !== "slow") return;
    select(findPosition(highlightSentences, element.currentTime, position));
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
   * Moves to one page at once, or to the end view past the last page.
   * @param next The next page index.
   */
  function goToPage(next: number): void {
    stopAudio();
    setMode("idle");
    setFinished(false);
    setPendingIndex(null);
    if (next < 0) return;
    if (next >= book.pages.length) {
      setFinished(true);
      return;
    }
    setPageIndex(next);
  }

  /**
   * Presses Next. A page with a picture waits for that picture to load before it shows, so the
   * old sentence and the old picture leave together with the new pair (council finding 12). A
   * second press before the load moves on from the waiting page.
   */
  function goToNext(): void {
    const next = (pendingIndex ?? pageIndex) + 1;
    if (next >= book.pages.length || !book.pages[next]?.image?.file) {
      goToPage(next);
      return;
    }
    stopAudio();
    setMode("idle");
    setFinished(false);
    setPendingIndex(next);
  }

  /**
   * Shows the page that waited for its picture.
   * @param next The index of the waiting page.
   */
  function showPendingPage(next: number): void {
    setPageIndex(next);
    setPendingIndex(null);
  }

  const pendingFile = pendingIndex === null ? undefined : book.pages[pendingIndex]?.image?.file;
  const audioButtonClass =
    "min-h-12 rounded-xl border border-neutral-300 px-4 aria-pressed:border-amber-500 aria-pressed:bg-amber-100";

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
          mediaUrls={mediaUrls}
        />
      ) : finished ? (
        // The end of the book always offers a way back: on a shipped week the loops part is
        // draft, so no question screen exists and the old end left the child with no control
        // (finding F149, UX1).
        <div data-reader-end className="flex flex-col gap-4">
          <p className="text-lg font-semibold">{labels.finished}</p>
          {tiles.length > 0 ? <WeekTileLinks tiles={tiles} mediaUrls={mediaUrls} /> : null}
        </div>
      ) : (
        <>
          <div
            data-page-content
            data-page-number={pageNumber}
            className="flex flex-col gap-3 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-start"
          >
            {image?.file ? (
              <img
                src={mediaUrl(mediaUrls, image.file)}
                alt={image.caption ?? ""}
                loading="lazy"
                decoding="async"
                className="w-full rounded-2xl object-cover [@media(max-height:500px)]:max-h-[40vh] [@media(max-height:500px)]:basis-[45%] [@media(max-height:500px)]:shrink-0"
              />
            ) : null}
            {/* The book text is English on every locale, so the nearest lang of a word is en
                even on the printed th route (finding F134). The passage stays interactive in
                every mode, so a child sees the clip-word marker from the first view (N2): a
                tap outside "My turn" still plays nothing, because onWordTap checks the mode,
                and the highlight follows the playback position alone. */}
            <div lang="en" className="[@media(max-height:500px)]:flex-1">
              <ReadAlongPassage
                sentences={normalSentences}
                passage=""
                position={position}
                active
                onWordTap={onWordTap}
                wordIsTarget={(audioWord) => Object.hasOwn(wordClips, audioWord.toLowerCase())}
                tapTargetFloor
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label={labels.previousPage}
              disabled={pageIndex === 0}
              onClick={() => goToPage(pageIndex - 1)}
              className="min-h-12 rounded-xl border border-neutral-300 px-4 disabled:opacity-40"
            >
              ←
            </button>
            <span aria-live="polite">{`${pageNumber} / ${book.pages.length}`}</span>
            <button
              type="button"
              aria-label={labels.nextPage}
              disabled={pendingIndex === null && pageIndex >= book.pages.length - 1 && !hasEnd}
              onClick={goToNext}
              className="min-h-12 rounded-xl border border-indigo-700 bg-indigo-700 px-4 text-white disabled:opacity-40"
            >
              →
            </button>
            <button
              type="button"
              aria-pressed={pressedMode === "listen"}
              data-mode-button
              onClick={startListen}
              className={audioButtonClass}
            >
              {pressedMode === "listen" ? playingLabel : labels.readToMe}
            </button>
            <button
              type="button"
              aria-pressed={pressedMode === "myTurn"}
              data-mode-button
              onClick={startMyTurn}
              className={audioButtonClass}
            >
              {pressedMode === "myTurn" ? playingLabel : labels.myTurn}
            </button>
            <button
              type="button"
              aria-pressed={pressedMode === "slow"}
              data-mode-button
              onClick={startSlow}
              className={audioButtonClass}
            >
              {pressedMode === "slow" ? playingLabel : labels.slow}
            </button>
          </div>
          {pendingFile ? (
            // The next picture loads here while the old page stays; its load turns the page.
            <img
              key={pendingIndex}
              hidden
              alt=""
              src={mediaUrl(mediaUrls, pendingFile) || undefined}
              loading="eager"
              decoding="async"
              onLoad={() => showPendingPage(pendingIndex!)}
              onError={() => showPendingPage(pendingIndex!)}
            />
          ) : null}
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
