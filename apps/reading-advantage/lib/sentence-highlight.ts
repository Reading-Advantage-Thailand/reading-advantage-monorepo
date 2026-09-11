/**
 * Shared Tailwind classes for the three sentence highlight states used by
 * the article and stories reading views. Playing, hover, and selected
 * states each have a distinct color.
 */

/** Base classes applied to every sentence span. */
export const SENTENCE_BASE_CLASS =
  "cursor-pointer text-muted-foreground rounded-md";

/** Hover state classes. */
export const SENTENCE_HOVER_CLASS =
  "hover:bg-emerald-100 hover:dark:bg-emerald-900 hover:text-primary";

/** Playing state classes; matches the lesson phase highlight color. */
export const SENTENCE_PLAYING_CLASS =
  "bg-amber-200 dark:bg-amber-700 text-primary";

/** Selected state classes. */
export const SENTENCE_SELECTED_CLASS = "bg-blue-200 dark:bg-blue-900";
