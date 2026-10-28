/**
 * The highlight contract of the read-along (track primary_parity_read_along_20261011).
 *
 * The classes are plain Tailwind utilities, so the app supplies no style and the package needs no
 * app path. The Storytime app may restyle the three names for its own frame.
 */
export const HIGHLIGHT_CLASSES = {
  /** The band of the sentence that the voice says. */
  playingSentence: "bg-amber-200 dark:bg-amber-800/60",
  /** A word under the pointer. */
  hoverWord: "hover:bg-emerald-200 dark:hover:bg-emerald-800/50",
  /** The word that the voice says now. */
  currentWord: "bg-blue-500 text-white dark:bg-blue-400 dark:text-blue-950",
} as const;
