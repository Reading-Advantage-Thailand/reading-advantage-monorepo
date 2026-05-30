import { useState, useEffect } from "react";

/**
 * A React hook for matching CSS media queries with live updates.
 * @param query - The media query string to match against (e.g., "(min-width: 768px)")
 * @returns A boolean indicating whether the query currently matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    setMatches(media.matches);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
