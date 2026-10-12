/**
 * Data profile of the read-along timings (track primary_parity_read_along_20261011, Phase 0).
 * Pure functions: the script `scripts/profile-read-along.ts` reads the rows and calls them.
 */

/** One sentence row of `articles.sentences` (the shape of `SentenceTimepoint`). */
export interface ProfileSentence {
  sentence: string;
  startTime: number;
  endTime: number;
  words: { word: string; start: number; end: number }[];
}

import { tokenizeWords } from "./align";

/** The tags that mark a sentence shape the alignment must handle. */
export type ProfileTag =
  | "no-words"
  | "audio-dropped"
  | "audio-extra"
  | "word-mismatch"
  | "curly-quote"
  | "contraction"
  | "digit"
  | "hyphen";

const squash = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Tags one sentence with the shapes that need care in the alignment.
 * @param sentence The sentence row.
 * @returns The tags, and the display and audio word counts.
 */
export function classifySentence(sentence: ProfileSentence): { tags: ProfileTag[]; display: number; audio: number } {
  const display = tokenizeWords(sentence.sentence);
  const audio = sentence.words.flatMap((w) => tokenizeWords(w.word));
  const tags: ProfileTag[] = [];
  if (sentence.words.length === 0) tags.push("no-words");
  else if (audio.length < display.length) tags.push("audio-dropped");
  else if (audio.length > display.length) tags.push("audio-extra");
  else if (display.some((word, i) => squash(word) !== squash(audio[i]))) tags.push("word-mismatch");
  if (/[“”‘’]/u.test(sentence.sentence)) tags.push("curly-quote");
  if (/\p{L}['’]\p{L}/u.test(sentence.sentence)) tags.push("contraction");
  if (/\d/.test(sentence.sentence)) tags.push("digit");
  if (/[\p{L}\p{N}]-[\p{L}\p{N}]/u.test(sentence.sentence)) tags.push("hyphen");
  return { tags, display: display.length, audio: audio.length };
}

/** The counts of the profile. */
export interface Profile {
  articles: number;
  withSentences: number;
  sentences: number;
  tagCounts: Record<string, number>;
  articlesWithTag: Record<string, number>;
}

/**
 * Counts articles, sentences, and tags.
 * @param rows The article ids and their `sentences` value (null or an array).
 * @returns The profile.
 */
export function profileArticles(rows: { id: string; sentences: ProfileSentence[] | null }[]): Profile {
  const profile: Profile = { articles: rows.length, withSentences: 0, sentences: 0, tagCounts: {}, articlesWithTag: {} };
  for (const row of rows) {
    if (!Array.isArray(row.sentences) || row.sentences.length === 0) continue;
    profile.withSentences++;
    const seen = new Set<string>();
    for (const sentence of row.sentences) {
      profile.sentences++;
      for (const tag of classifySentence(sentence).tags) {
        profile.tagCounts[tag] = (profile.tagCounts[tag] ?? 0) + 1;
        seen.add(tag);
      }
    }
    for (const tag of seen) profile.articlesWithTag[tag] = (profile.articlesWithTag[tag] ?? 0) + 1;
  }
  return profile;
}
