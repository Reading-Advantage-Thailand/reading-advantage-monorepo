/**
 * The blend plan of a decodable word (plan task 2.5, spec FR-7).
 *
 * A pure function decides how a decodable word plays: sound by sound from the phoneme bank, then
 * the whole word from the book recording, or the whole word alone. The sound-book flag, the tricky
 * words, and the taught graphemes decide. A name is learned as a whole word too.
 */
import type { StorytimeWeek } from "./contracts/week";

/** The plan of one decodable word. */
export interface BlendPlan {
  /** `blend` plays the graphemes from the phoneme bank first; `whole` plays the book recording. */
  mode: "blend" | "whole";
  /** The graphemes of the word, in reading order. */
  graphemes: string[];
}

/** The tag prefix of a grapheme-phoneme correspondence node (`english.phonics.gpc.<g>.<g>`). */
const GPC_PREFIX = "english.phonics.gpc.";

/** The tag prefix of a tricky word node (`english.phonics.tricky.<word>`). */
const TRICKY_PREFIX = "english.phonics.tricky.";

/**
 * Gives the letters of a word, for the display of a whole word.
 * @param word The word.
 * @returns One entry per character.
 */
function lettersOf(word: string): string[] {
  return [...word];
}

/**
 * Lists the taught graphemes of a week.
 *
 * The phonics graph names a correspondence node as `english.phonics.gpc.<grapheme>.<sound>`, so the
 * fourth segment is the grapheme (`gpc.a.short-a` gives `a`, `gpc.sh.sh` gives `sh`).
 * @param week The week.
 * @returns The graphemes that the child has met.
 */
export function taughtGraphemes(week: StorytimeWeek): Set<string> {
  const graphemes = new Set<string>();
  const tags = week.tags ?? { taught: [], reviewed: [] };
  for (const id of [...tags.taught, ...tags.reviewed]) {
    if (!id.startsWith(GPC_PREFIX)) continue;
    const grapheme = id.slice(GPC_PREFIX.length).split(".")[0];
    if (grapheme) graphemes.add(grapheme);
  }
  for (const grapheme of week.focus?.element?.graphemes ?? []) graphemes.add(grapheme);
  return graphemes;
}

/**
 * Lists the tricky words of a week.
 *
 * The list joins the focus words, the word list of the decodable's sounds page, and the tricky-word
 * tags of the phonics graph.
 * @param week The week.
 * @returns The tricky words in lower case.
 */
export function trickyWords(week: StorytimeWeek): Set<string> {
  const words = new Set<string>();
  for (const word of week.focus?.trickyWords ?? []) words.add(word.toLowerCase());
  const decodable = week.books?.find((book) => book.kind === "decodable");
  for (const word of decodable?.soundsPage?.tricky ?? []) words.add(word.toLowerCase());
  const tags = week.tags ?? { taught: [], reviewed: [] };
  for (const id of [...tags.taught, ...tags.reviewed]) {
    if (!id.startsWith(TRICKY_PREFIX)) continue;
    const word = id.slice(TRICKY_PREFIX.length);
    if (word) words.add(word.toLowerCase());
  }
  return words;
}

/**
 * Cuts a word into the taught graphemes, longest grapheme first.
 * @param word The word in lower case.
 * @param taught The taught graphemes.
 * @returns The graphemes, or null when a letter is not taught.
 */
function segment(word: string, taught: Set<string>): string[] | null {
  const longest = Math.max(1, ...[...taught].map((grapheme) => grapheme.length));
  const parts: string[] = [];
  let index = 0;
  while (index < word.length) {
    let matched = "";
    for (let size = Math.min(longest, word.length - index); size >= 1; size -= 1) {
      const candidate = word.slice(index, index + size);
      if (taught.has(candidate)) {
        matched = candidate;
        break;
      }
    }
    if (!matched) return null;
    parts.push(matched);
    index += matched.length;
  }
  return parts;
}

/**
 * Gives the plan of one decodable word.
 *
 * A word plays whole in a sound book, when it is a tricky word, and when it is a name. A word plays
 * sound by sound when every grapheme is taught. Any other word plays whole.
 * @param word The word from the decodable page, with or without edge punctuation.
 * @param week The week that the word comes from.
 * @returns The mode and the graphemes of the word.
 */
export function blendPlanForWord(word: string, week: StorytimeWeek): BlendPlan {
  const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const lower = bare.toLowerCase();
  if (!lower) return { mode: "whole", graphemes: [] };
  if (bare !== lower) return { mode: "whole", graphemes: lettersOf(lower) };
  const decodable = week.books?.find((book) => book.kind === "decodable");
  if (decodable?.soundBook) return { mode: "whole", graphemes: lettersOf(lower) };
  if (trickyWords(week).has(lower)) return { mode: "whole", graphemes: lettersOf(lower) };
  if ((decodable?.names ?? []).some((name) => name.toLowerCase() === lower)) {
    return { mode: "whole", graphemes: lettersOf(lower) };
  }
  const graphemes = segment(lower, taughtGraphemes(week));
  if (!graphemes) return { mode: "whole", graphemes: lettersOf(lower) };
  return { mode: "blend", graphemes };
}
