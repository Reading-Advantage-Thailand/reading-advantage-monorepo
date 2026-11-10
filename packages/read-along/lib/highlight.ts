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
  /** The word that the voice says now. The pair holds the 4.5:1 contrast floor of the app gates (finding F121, finding P-1): white on brown #92400e measures 7.09:1, and brown #92400e on amber #fcd34d measures 4.92:1. */
  currentWord: "bg-[#92400e] text-white dark:bg-[#fcd34d] dark:text-[#92400e]",
} as const;
