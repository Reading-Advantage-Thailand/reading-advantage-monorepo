import english from "../../messages/en.json";
import thai from "../../messages/th.json";

/**
 * The frame of the Storytime look (option 1 "Storybook Quest"; track
 * storytime_look_20261107, Phase 2, spec FR-2; pins Q24 and Q25).
 *
 * The frame renders the hero window of a week screen: the game bar with the level and the week
 * of the route as text, the crest, and the title plaque. `variant` picks the hero: `cover` is
 * the tall window of the home view and the song, `band` is the slim window of the book and the
 * decodable page (AC-2.6 to AC-2.8).
 *
 * The level and week words come from the message file of the interface locale (council round 1,
 * task 2.3e): the English file holds the English words and the Thai file holds the Thai words.
 * The locale layout holds no client message provider, so the frame imports both files. The
 * visible label sits in its own box outside the progress track; the track keeps one visually
 * hidden copy of the text, so a screen reader reads the level and the week once. The component
 * renders only; it reads no week content, and the pieces (bar, crest, plaque tips) are decorative
 * drawings from `app/look/pieces/` that the CSS of `app/look.css` places.
 */

/** The hero variants of the frame. */
export type FrameVariant = "cover" | "band";

/** The props of the frame. */
export interface FrameProps {
  /** The level of the route, as a number. */
  level: number;
  /** The week of the route, as a number. */
  week: number;
  /** The title of the week, shown on the plaque. */
  title: string;
  /** The hero variant: `cover` or `band`. */
  variant: FrameVariant;
  /** The interface locale of the label. The default is `en`. */
  locale?: "en" | "th";
}

/**
 * Renders the hero frame of a week screen.
 * @param props See `FrameProps`.
 * @returns The header with the game bar, the crest, and the title plaque.
 */
export function Frame({ level, week, title, variant, locale = "en" }: FrameProps) {
  // The label shows the route level and week as text (Q25): the values come from the two message
  // keys of the interface locale, so no pair is baked in and a second fixture week shows its own
  // numbers.
  const messages = locale === "th" ? thai : english;
  const bar = `${messages.barLevel.replace("{level}", String(level))} · ${messages.barWeek.replace(
    "{week}",
    String(week),
  )}`;
  return (
    <header data-hero={variant}>
      {/* The label is the visible text; the track holds the one copy that a screen reader reads. */}
      <p data-level-week aria-hidden="true" lang={locale}>
        {bar}
      </p>
      <p data-game-bar lang={locale}>
        <span>{bar}</span>
      </p>
      {/* The crest and the plaque tips are decorative drawings (aria-hidden or CSS only). */}
      <span data-crest aria-hidden="true" />
      <h1 lang="en">{title}</h1>
    </header>
  );
}
