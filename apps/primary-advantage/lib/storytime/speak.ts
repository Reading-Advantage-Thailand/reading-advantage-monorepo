import { seekOrWait } from "@/lib/read-along/seek";

/**
 * Reads a short text aloud with the speech voice of the phone (Storytime QR page, qr-page-spec
 * section 3: the tiles are sound-first). Storytime has no recorded label audio yet; a phone with
 * no voice for the language stays silent, and the visible label still works.
 * @param text The label or the word.
 * @param lang A BCP 47 tag, for example `th-TH` for a tile label or `en-US` for a word of the week.
 * @returns True when the phone started to speak.
 */
export function speak(text: string, lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return true;
}

/** The speech language of an app locale. */
export const SPEECH_LANG: Readonly<Record<string, string>> = { th: "th-TH", en: "en-US", vi: "vi-VN", cn: "zh-CN", tw: "zh-TW" };

/** The aligner ends a word on its last sound, so the stop waits this much longer (seconds). */
const WORD_TAIL = 0.08;

/**
 * Plays one stretch of an audio element and stops at its end: a word in "my turn" mode. A timer
 * stops it on time; the `timeupdate` check (4 times a second) is the fallback.
 * @param audio The audio element of the book.
 * @param start The start time of the word, in seconds.
 * @param end The end time of the word, in seconds.
 * @returns A function that stops the stretch early.
 */
export function playStretch(audio: HTMLAudioElement, start: number, end: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    if (audio.currentTime >= end + WORD_TAIL) stop();
  };
  const stop = () => {
    clearTimeout(timer);
    audio.removeEventListener("timeupdate", check);
    audio.pause();
  };
  audio.addEventListener("timeupdate", check);
  seekOrWait(audio, start);
  audio.play().then(() => {
    timer = setTimeout(stop, ((end + WORD_TAIL - start) / (audio.playbackRate || 1)) * 1000);
  }, stop);
  return stop;
}

/**
 * Plays short sounds one after the other: the sounds of a blended word. A sound that does not end
 * within 1.5 s, or does not load, moves on to the next one.
 * @param urls The sound files in order.
 * @param onStep Called with the index of each sound as it starts, then with `urls.length` at the end.
 * @param gapMs The pause between two sounds.
 * @returns A function that stops the sequence.
 */
export function playSequence(urls: readonly string[], onStep: (index: number) => void, gapMs = 150): () => void {
  let stopped = false;
  let current: HTMLAudioElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const next = (index: number) => {
    if (stopped) return;
    onStep(index);
    if (index >= urls.length) return;
    let done = false;
    const advance = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      timer = setTimeout(() => next(index + 1), gapMs);
    };
    current = new Audio(urls[index]);
    current.addEventListener("ended", advance, { once: true });
    current.addEventListener("error", advance, { once: true });
    timer = setTimeout(advance, 1500);
    current.play().catch(advance);
  };
  next(0);
  return () => {
    stopped = true;
    clearTimeout(timer);
    current?.pause();
  };
}
