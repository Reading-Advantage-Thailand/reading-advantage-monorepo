import { APPS } from "@reading-advantage/db/marketing-constants";

export { APPS };

/** One Marketing application identifier from the shared app catalog. */
export type MarketingApp = (typeof APPS)[number];

/**
 * Badge colors keyed by application identifier, not by catalog index, so a
 * reorder or an addition in the shared app catalog cannot shift colors.
 */
export const APP_COLORS: Record<MarketingApp, string> = {
  "reading-advantage": "#4CAF50",
  "primary-advantage": "#2196F3",
  storytime: "#9C27B0",
  "math-advantage": "#FF9800",
  "science-advantage": "#00BCD4",
  "stem-advantage": "#E91E63",
  "zhongwen-advantage": "#F44336",
  "tutor-advantage": "#607D8B",
};
