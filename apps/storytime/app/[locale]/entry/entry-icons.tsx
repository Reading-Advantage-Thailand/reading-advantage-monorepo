/** The five tile names of the join page. */
export type EntryIconName =
  | "daily-lessons"
  | "letters-phonics"
  | "sight-words"
  | "songs-readers"
  | "home-app";

/**
 * Draws one owned line icon of the program.
 *
 * The icons are inline SVG, so they add no dependency, no network request, and no stock art.
 * Every icon is decorative: its label is the tile line beside it.
 * @param name The tile that the icon stands for.
 * @returns One decorative icon.
 */
export function EntryIcon({ name }: { name: EntryIconName }) {
  if (name === "daily-lessons") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="17" r="9" />
        <path d="M16 11v6l4 2M16 2v3M5 6l2 2M27 6l-2 2" />
      </svg>
    );
  }
  if (name === "letters-phonics") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 25 12 7l8 18M7 19h10" />
        <path d="m22 25 5-14M23 20h5" />
      </svg>
    );
  }
  if (name === "sight-words") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 16s5-8 14-8 14 8 14 8-5 8-14 8S2 16 2 16Z" />
        <circle cx="16" cy="16" r="4" />
      </svg>
    );
  }
  if (name === "songs-readers") {
    return (
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h10v20H4zM16 6h12v20H16zM16 11h8M16 16h8" />
        <path d="M23 21v-6l4-1v6" />
        <circle cx="21" cy="22" r="2" />
        <circle cx="25" cy="21" r="2" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 14 12-10 12 10M7 13v15h18V13M13 28v-9h6v9" />
    </svg>
  );
}
