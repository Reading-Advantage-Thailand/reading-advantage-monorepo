import { AUDIO_URL, AUDIO_WORDS_URL } from "@/server/constants";

const GCS_BASE_URL =
  "https://storage.googleapis.com/artifacts.reading-advantage.appspot.com";

/**
 * Builds a full URL for an artifact stored in the Reading Advantage GCS bucket.
 * @param bucketPath Object path inside the bucket, for example `tts/abc.mp3`.
 * @returns The absolute GCS URL.
 */
export function getGcsAudioUrl(bucketPath: string): string {
  return `${GCS_BASE_URL}/${bucketPath}`;
}

/**
 * Builds the word-audio URL for a vocabulary item.
 * @param id The article id (or `storyId-chapterNumber`) of the audio file.
 * @returns The absolute GCS URL of the `.mp3` word audio.
 */
export function getGcsWordAudioUrl(id: string): string {
  return getGcsAudioUrl(`${AUDIO_WORDS_URL}/${id}.mp3`);
}

/**
 * Builds the sentence-audio URL for a TTS artifact.
 * @param file The TTS file name, or an article id when no file exists.
 * @param cacheKey Optional cache-busting key appended as a query parameter.
 * @returns The absolute GCS URL of the TTS audio.
 */
export function getGcsTtsAudioUrl(
  file: string,
  cacheKey?: string | number,
): string {
  const suffix = cacheKey ? `?v=${cacheKey}` : "";
  return getGcsAudioUrl(`${AUDIO_URL}/${file}`) + suffix;
}
