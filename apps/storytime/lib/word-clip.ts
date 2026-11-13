/**
 * The word clip lookup of the teacher views (plan task 6.2, round 3).
 *
 * The Workbooks clip maps hold the lower-case word to the whole clip file of that word. A week
 * that writes the tricky word `I` holds the clip under the key `i`, so every lookup lower-cases
 * the word. The lookup reads the own property of the map only, so a word that names an inherited
 * property finds no clip and stays plain text.
 */

/**
 * Gives the clip file of one word of a clip map.
 * @param clips The clip map of the week.
 * @param word The word of the view.
 * @returns The clip file, or undefined when the map holds no clip of that word.
 */
export function clipOfWord(
  clips: Record<string, string> | undefined,
  word: string,
): string | undefined {
  if (!clips) return undefined;
  const key = word.toLowerCase();
  if (!Object.hasOwn(clips, key)) return undefined;
  return clips[key];
}
