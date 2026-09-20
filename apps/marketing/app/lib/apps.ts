import { APPS } from "@reading-advantage/db/marketing-constants";

export { APPS };

/** One Marketing application identifier from the shared app catalog. */
export type MarketingApp = (typeof APPS)[number];

const APP_COLOR_VALUES = [
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#FF9800",
  "#00BCD4",
  "#E91E63",
  "#F44336",
  "#607D8B",
] as const;

const APP_NAME_VALUES = [
  "Reading Advantage",
  "Primary Advantage",
  "Storytime",
  "Math Advantage",
  "Science Advantage",
  "STEM Advantage",
  "Zhongwen Advantage",
  "Tutor Advantage",
] as const;

export const APP_COLORS: Record<(typeof APPS)[number], string> = Object.fromEntries(
  APPS.map((app, index) => [app, APP_COLOR_VALUES[index] ?? "#607D8B"]),
) as Record<(typeof APPS)[number], string>;

export const APP_NAMES: Record<(typeof APPS)[number], string> = Object.fromEntries(
  APPS.map((app, index) => [app, APP_NAME_VALUES[index] ?? app]),
) as Record<(typeof APPS)[number], string>;
