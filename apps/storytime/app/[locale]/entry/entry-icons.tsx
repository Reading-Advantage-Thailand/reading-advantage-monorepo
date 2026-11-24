/** The five tile names of the join page. */
export type EntryIconName =
  | "daily-lessons"
  | "letters-phonics"
  | "sight-words"
  | "songs-readers"
  | "home-app";

/**
 * Draws one owned icon of the program.
 *
 * The icons are inline SVG, so they add no dependency, no network request, and no stock art. Each
 * uses simple shapes, and every icon is decorative: its label is the tile line beside it.
 * @param name The tile that the icon stands for.
 * @returns One decorative icon.
 */
export function EntryIcon({ name }: { name: EntryIconName }) {
  const shared = {
    "aria-hidden": "true" as const,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
  };
  if (name === "daily-lessons") {
    return (
      <svg {...shared}>
        <circle cx="16" cy="17" r="10" />
        <circle cx="16" cy="17" r="1.6" fill="currentColor" />
        <rect x="15" y="8" width="2" height="9" rx="1" fill="currentColor" />
        <rect x="16" y="16" width="7" height="2" rx="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "letters-phonics") {
    return (
      <svg {...shared}>
        <rect x="3" y="7" width="12" height="18" rx="2" />
        <rect x="17" y="7" width="12" height="18" rx="2" />
        <rect x="6" y="11" width="6" height="2" rx="1" fill="currentColor" />
        <rect x="6" y="16" width="6" height="2" rx="1" fill="currentColor" />
        <circle cx="23" cy="13" r="3" />
        <circle cx="23" cy="21" r="3" />
      </svg>
    );
  }
  if (name === "sight-words") {
    return (
      <svg {...shared}>
        <ellipse cx="16" cy="16" rx="13" ry="8" />
        <circle cx="16" cy="16" r="4" />
        <circle cx="16" cy="16" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  if (name === "songs-readers") {
    return (
      <svg {...shared}>
        <rect x="3" y="7" width="12" height="19" rx="2" />
        <rect x="17" y="7" width="12" height="19" rx="2" />
        <circle cx="21" cy="23" r="2" />
        <circle cx="26" cy="22" r="2" />
        <rect x="22" y="12" width="2" height="10" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...shared}>
      <rect x="5" y="13" width="22" height="15" rx="2" />
      <rect x="13" y="21" width="6" height="7" rx="1" />
      <rect
        x="12"
        y="4"
        width="8"
        height="8"
        rx="1"
        transform="rotate(45 16 8)"
      />
    </svg>
  );
}
