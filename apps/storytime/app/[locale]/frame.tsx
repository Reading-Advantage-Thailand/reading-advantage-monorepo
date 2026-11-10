import logoAsset from "../look/logo/storytime-advantage.svg";
import english from "../../messages/en.json";
import thai from "../../messages/th.json";
import type { CSSProperties } from "react";

/**
 * The frame of the Storytime look (option 1 "Storybook Quest"; track
 * storytime_look_20261107, Phase 2, spec FR-2; Phase 2b, spec FR-4; pins Q24, Q25, and Q44).
 *
 * The frame renders the hero window of a week screen: the level and week label of the route, the
 * Storytime Advantage logo, and the title plaque. `variant` picks the hero: `cover` is the tall
 * window of the home view and the song, `band` is the slim window of the book and the decodable
 * page (AC-2.6 to AC-2.8).
 *
 * The level and week words come from the message file of the interface locale (council round 1,
 * task 2.3e): the English file holds the English words and the Thai file holds the Thai words.
 * The locale layout holds no client message provider, so the frame imports both files. The visible
 * label is the only copy of the text, so a screen reader reads the level and the week once. The
 * component renders only; it reads no week content. The logo is a static asset from
 * `app/look/logo/` and sits at the top left of the hero, away from the plaque (remediation r1,
 * finding F-1). The plaque hands the title length to the CSS, so the title fits one line (finding
 * F-2).
 */

/** The hero variants of the frame. */
export type FrameVariant = "cover" | "band";

/**
 * The props of the frame.
 */
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
 * The URL of the logo file. Vite gives a string; the Next image loader gives an object with `src`.
 */
const logoSource =
  typeof logoAsset === "string" ? logoAsset : (logoAsset as { src: string }).src;

/**
 * Renders the hero frame of a week screen.
 * @param props See `FrameProps`.
 * @returns The header with the level and week label, the logo, and the title plaque.
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
      {/* The label is the one copy of the route text that a screen reader reads (AC-4.2). */}
      <p data-level-week lang={locale}>
        {bar}
      </p>
      {/* The logo replaces the sprout crest (AC-4.3, Q44). It carries its own text alternative. */}
      <img data-logo src={logoSource} alt="Storytime Advantage" width={46} height={46} />
      <h1
        lang="en"
        style={
          {
            "--title-chars": title.length,
            // The font follows the plaque width, so a shipped title stays on one line and a
            // 60-character title wraps at the 24 px floor (remediation r1, finding F-2).
            fontSize: `clamp(24px, calc((100cqi - 64px) / (${title.length} * 0.68)), ${
              variant === "band" ? 44 : 72
            }px)`,
          } as CSSProperties
        }
      >
        {title}
      </h1>
    </header>
  );
}
