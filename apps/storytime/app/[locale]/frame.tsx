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
 * page (AC-2.6 to AC-2.8). The signed-in home page has no route level and week, so it passes a
 * `bar` text instead and the label reads the app name (plan task 3.3).
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

/** The props of a frame on a week screen: the route level and the route week. */
interface RouteFrameProps {
  /** The level of the route, as a number. */
  level: number;
  /** The week of the route, as a number. */
  week: number;
  /** A week screen shows the route numbers, never a bar text. */
  bar?: never;
}

/** The props of a frame on a screen without a route level and week (the signed-in home). */
interface BarFrameProps {
  /** The label text of a screen without a route level and week. */
  bar: string;
  /** A bar screen shows no route level. */
  level?: never;
  /** A bar screen shows no route week. */
  week?: never;
}

/**
 * The props of the frame.
 */
export type FrameProps = {
  /** The title, shown on the plaque. */
  title: string;
  /** The hero variant: `cover` or `band`. */
  variant: FrameVariant;
  /** The interface locale of the label. The default is `en`. */
  locale?: "en" | "th";
} & (RouteFrameProps | BarFrameProps);

/**
 * The URL of the logo file. Vite gives a string; the Next image loader gives an object with `src`.
 */
const logoSource =
  typeof logoAsset === "string" ? logoAsset : (logoAsset as { src: string }).src;

/**
 * Renders the hero frame of a week screen.
 * @param props See `FrameProps`.
 * @returns The header with the label, the logo, and the title plaque.
 */
export function Frame(props: FrameProps) {
  const { title, variant, locale = "en" } = props;
  // The label shows the route level and week as text (Q25): the values come from the two message
  // keys of the interface locale, so no pair is baked in and a second fixture week shows its own
  // numbers. A screen without a route (the signed-in home) passes its own bar text instead.
  const messages = locale === "th" ? thai : english;
  const bar =
    props.bar ??
    `${messages.barLevel.replace("{level}", String(props.level))} · ${messages.barWeek.replace(
      "{week}",
      String(props.week),
    )}`;
  // A page without a route carries an English bar text, so the label is tagged English; the route
  // pages keep the interface locale of their localized label. The plaque title stays English on a
  // week page (the week titles are English) and takes the page locale on a bar page, where the
  // title is the page heading (Review A N1 and N2).
  const hasBar = props.bar !== undefined;
  const labelLang = hasBar ? "en" : locale;
  const titleLang = hasBar ? locale : "en";
  return (
    <header data-hero={variant}>
      {/* The label is the one copy of the route text that a screen reader reads (AC-4.2). */}
      <p data-level-week lang={labelLang}>
        {bar}
      </p>
      {/* The logo replaces the sprout crest (AC-4.3, Q44). It carries its own text alternative. */}
      <img data-logo src={logoSource} alt="Storytime Advantage" width={48} height={48} />
      <h1 lang={titleLang} style={{ "--title-chars": title.length } as CSSProperties}>
        {title}
      </h1>
    </header>
  );
}
