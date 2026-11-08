/**
 * The place picker of the Storytime look (option 1 "Storybook Quest"; track
 * storytime_look_20261107, Phase 2, spec FR-2; pin Q36).
 *
 * A place is one of the five painted scenes that the look draws behind a week screen. Each part
 * of a week picks one place for the page ground and one for the hero window. The week page sets
 * `data-place` and `data-hero` on `main` from this function, so the CSS selects by attribute and
 * no `:has()` carries the place (an older browser still shows the right ground).
 */

/** The five painted places of the look. */
export type LookPlace = "meadow" | "grove" | "oak" | "trail" | "path";

/** The parts of a week that `?part=` may open, plus the home view. */
export type LookPart = "book" | "decodable" | "song";

/** The ground place and the hero place of one part. */
export interface PlaceChoice {
  /** The painted scene behind the whole page. */
  place: LookPlace;
  /** The painted scene inside the hero window. */
  hero: LookPlace;
}

/** The place table of the four part states (the study crops of the cover art). */
const PLACES: Record<"home" | LookPart, PlaceChoice> = {
  home: { place: "meadow", hero: "path" },
  book: { place: "grove", hero: "oak" },
  decodable: { place: "trail", hero: "path" },
  song: { place: "meadow", hero: "meadow" },
};

/**
 * Picks the places of one part of a week.
 * @param part The part that `?part=` opens, or `null` for the home view.
 * @returns The ground place and the hero place. The function is pure.
 */
export function placeFor(part: LookPart | null): PlaceChoice {
  return PLACES[part ?? "home"];
}
