/**
 * Shared audio-segment and highlight helpers for primary-advantage.
 * Keeps every audio component on the native HTMLAudioElement API with no
 * polling timers, and gives the readers one highlight-colour contract.
 */

/** Tolerance in seconds when stopping a segment at its end timestamp. */
export const SEGMENT_STOP_TOLERANCE = 0.5;

/** Epsilon in seconds for deciding a seek is unnecessary. */
export const SEEK_EPSILON = 0.05;

/**
 * A playable slice of an audio resource.
 */
export interface AudioSegment {
  url: string;
  start: number;
  end: number;
}

/**
 * A sentence match carrying its audio slice.
 */
export interface SentenceSegment {
  sentence: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Client-side field names for one ordering sentence or word.
 */
export interface OrderingFields {
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
  translation?: Record<string, string | undefined>;
}

/**
 * Resolves the effective end of a segment.
 * @param endTimestamp The segment end, if any.
 * @param duration The resource duration.
 * @returns The end timestamp, or the duration when it is missing or zero.
 */
export function resolveSegmentEnd(
  endTimestamp: number | undefined,
  duration: number,
): number {
  if (endTimestamp === undefined || endTimestamp <= 0) return duration;
  return endTimestamp;
}

/**
 * Decides whether playback has reached the end of a segment.
 * @param currentTime The element playback position.
 * @param endTimestamp The segment end, if any.
 * @param tolerance Seconds of slack before the end.
 * @returns True only for a real end timestamp inside tolerance.
 */
export function shouldStopSegment(
  currentTime: number,
  endTimestamp: number | undefined,
  tolerance: number = SEGMENT_STOP_TOLERANCE,
): boolean {
  if (endTimestamp === undefined || endTimestamp <= 0) return false;
  return currentTime + tolerance >= endTimestamp;
}

/**
 * Decides whether setting currentTime needs a seek.
 * @param targetTime The desired playback position.
 * @param currentTime The element playback position.
 * @param epsilon Slack below which no seek happens.
 * @returns False when the element already sits at the target time.
 */
export function needsSeek(
  targetTime: number,
  currentTime: number,
  epsilon: number = SEEK_EPSILON,
): boolean {
  return Math.abs(targetTime - currentTime) > epsilon;
}

/**
 * Maps one ordering sentence or word to client field names.
 * @param raw A server row in either naming convention.
 * @returns The same data under audioUrl, startTime, endTime, translation.
 */
export function mapOrderingSentenceFields(raw: {
  audio_url?: string;
  start_time?: number;
  end_time?: number;
  translationMap?: Record<string, string | undefined>;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
  translation?: Record<string, string | undefined>;
}): OrderingFields {
  return {
    audioUrl: raw.audioUrl ?? raw.audio_url,
    startTime: raw.startTime ?? raw.start_time,
    endTime: raw.endTime ?? raw.end_time,
    translation: raw.translation ?? raw.translationMap,
  };
}

/**
 * Resolves the cloze hint segment from the matched article sentence.
 * @param sentences Article sentences carrying segment times.
 * @param sentenceText The flashcard sentence text.
 * @param audioUrl The article audio URL.
 * @returns Real segment times, or zeroes when nothing matches.
 */
export function resolveClozeSegment(
  sentences: SentenceSegment[],
  sentenceText: string,
  audioUrl: string,
): AudioSegment {
  const match = sentences.find((s) => s.sentence === sentenceText);
  return {
    url: audioUrl,
    start: match?.startTime ?? 0,
    end: match?.endTime ?? 0,
  };
}

/**
 * Returns the word slice at a word index.
 * @param words The sentence words in order.
 * @param wordIndex The word position, not the sentence position.
 * @returns The word at that position, if any.
 */
export function getWordSegment<T>(words: T[], wordIndex: number): T | undefined {
  if (wordIndex < 0 || wordIndex >= words.length) return undefined;
  return words[wordIndex];
}

/**
 * The three highlight states, distinct in both themes.
 */
export const HIGHLIGHT_CLASSES = {
  playingSentence: "bg-amber-200 dark:bg-amber-800/60",
  hoverWord: "hover:bg-emerald-200 dark:hover:bg-emerald-800/50",
  currentWord: "bg-blue-500 text-white dark:bg-blue-400 dark:text-blue-950",
} as const;
