import type { workbooks } from "@reading-advantage/domain";

/** One selectable workbook level option, ported from the legacy dashboard. */
export interface WorkbookLevelOption {
  /** Level identifier stored as the draft's levelNumber. */
  value: string;
  /** Series name shown for the level. */
  series: string;
  /** CEFR band of the level. */
  cefr: string;
  /** Human label rendered in the level select. */
  label: string;
}

/** Workbook levels for secondary school, ported from the legacy dashboard. */
export const SECONDARY_LEVELS: WorkbookLevelOption[] = [
  { value: "1", series: "Origins", cefr: "A1", label: "1 - Origins" },
  { value: "2", series: "Origins", cefr: "A1", label: "2 - Origins" },
  { value: "3.1", series: "Origins", cefr: "A1", label: "3.1 - Origins" },
  { value: "3.2", series: "Origins", cefr: "A1", label: "3.2 - Origins" },
  { value: "4", series: "Quest", cefr: "A2", label: "4 - Quest" },
  { value: "5", series: "Quest", cefr: "A2", label: "5 - Quest" },
  { value: "6.1", series: "Quest", cefr: "A2", label: "6.1 - Quest" },
  { value: "6.2", series: "Quest", cefr: "A2", label: "6.2 - Quest" },
  { value: "7.1", series: "Adventure", cefr: "B1", label: "7.1 - Adventure" },
  { value: "7.2", series: "Adventure", cefr: "B1", label: "7.2 - Adventure" },
  { value: "8.1", series: "Adventure", cefr: "B1", label: "8.1 - Adventure" },
  { value: "8.2", series: "Adventure", cefr: "B1", label: "8.2 - Adventure" },
  { value: "8.3", series: "Adventure", cefr: "B1", label: "8.3 - Adventure" },
  { value: "9.1", series: "Adventure", cefr: "B1", label: "9.1 - Adventure" },
  { value: "9.2", series: "Adventure", cefr: "B1", label: "9.2 - Adventure" },
  { value: "9.3", series: "Adventure", cefr: "B1", label: "9.3 - Adventure" },
  { value: "10.1", series: "Hero", cefr: "B2", label: "10.1 - Hero" },
  { value: "10.2", series: "Hero", cefr: "B2", label: "10.2 - Hero" },
  { value: "11.1", series: "Hero", cefr: "B2", label: "11.1 - Hero" },
  { value: "11.2", series: "Hero", cefr: "B2", label: "11.2 - Hero" },
  { value: "11.3", series: "Hero", cefr: "B2", label: "11.3 - Hero" },
  { value: "12.1", series: "Hero", cefr: "B2", label: "12.1 - Hero" },
  { value: "12.2", series: "Hero", cefr: "B2", label: "12.2 - Hero" },
  { value: "12.3", series: "Hero", cefr: "B2", label: "12.3 - Hero" },
  { value: "13.1", series: "Legend", cefr: "C1", label: "13.1 - Legend" },
  { value: "13.2", series: "Legend", cefr: "C1", label: "13.2 - Legend" },
  { value: "14.1", series: "Legend", cefr: "C1", label: "14.1 - Legend" },
  { value: "14.2", series: "Legend", cefr: "C1", label: "14.2 - Legend" },
  { value: "14.3", series: "Legend", cefr: "C1", label: "14.3 - Legend" },
  { value: "15.1", series: "Legend", cefr: "C1", label: "15.1 - Legend" },
  { value: "15.2", series: "Legend", cefr: "C1", label: "15.2 - Legend" },
  { value: "15.3", series: "Legend", cefr: "C1", label: "15.3 - Legend" },
];

/** Workbook levels for primary school, ported from the legacy dashboard. */
export const PRIMARY_LEVELS: WorkbookLevelOption[] = [
  // Origins — A0 (levels 1–3)
  { value: "1", series: "Origins", cefr: "A0", label: "1 - Origins" },
  { value: "2", series: "Origins", cefr: "A0", label: "2 - Origins" },
  { value: "3.1", series: "Origins", cefr: "A0", label: "3.1 - Origins" },
  { value: "3.2", series: "Origins", cefr: "A0", label: "3.2 - Origins" },
  // Quest — A1 (levels 4–6)
  { value: "4", series: "Quest", cefr: "A1", label: "4 - Quest" },
  { value: "5", series: "Quest", cefr: "A1", label: "5 - Quest" },
  { value: "6.1", series: "Quest", cefr: "A1", label: "6.1 - Quest" },
  { value: "6.2", series: "Quest", cefr: "A1", label: "6.2 - Quest" },
  // Adventure — A2 (levels 7–9)
  { value: "7.1", series: "Adventure", cefr: "A2", label: "7.1 - Adventure" },
  { value: "7.2", series: "Adventure", cefr: "A2", label: "7.2 - Adventure" },
  { value: "8.1", series: "Adventure", cefr: "A2", label: "8.1 - Adventure" },
  { value: "8.2", series: "Adventure", cefr: "A2", label: "8.2 - Adventure" },
  { value: "8.3", series: "Adventure", cefr: "A2", label: "8.3 - Adventure" },
  { value: "9.1", series: "Adventure", cefr: "A2", label: "9.1 - Adventure" },
  { value: "9.2", series: "Adventure", cefr: "A2", label: "9.2 - Adventure" },
  { value: "9.3", series: "Adventure", cefr: "A2", label: "9.3 - Adventure" },
  // Hero — B1 (levels 10–12)
  { value: "10.1", series: "Hero", cefr: "B1", label: "10.1 - Hero" },
  { value: "10.2", series: "Hero", cefr: "B1", label: "10.2 - Hero" },
  { value: "11.1", series: "Hero", cefr: "B1", label: "11.1 - Hero" },
  { value: "11.2", series: "Hero", cefr: "B1", label: "11.2 - Hero" },
  { value: "11.3", series: "Hero", cefr: "B1", label: "11.3 - Hero" },
  { value: "12.1", series: "Hero", cefr: "B1", label: "12.1 - Hero" },
  { value: "12.2", series: "Hero", cefr: "B1", label: "12.2 - Hero" },
  { value: "12.3", series: "Hero", cefr: "B1", label: "12.3 - Hero" },
  // Legend — B2 (levels 13–15)
  { value: "13.1", series: "Legend", cefr: "B2", label: "13.1 - Legend" },
  { value: "13.2", series: "Legend", cefr: "B2", label: "13.2 - Legend" },
  { value: "14.1", series: "Legend", cefr: "B2", label: "14.1 - Legend" },
  { value: "14.2", series: "Legend", cefr: "B2", label: "14.2 - Legend" },
  { value: "14.3", series: "Legend", cefr: "B2", label: "14.3 - Legend" },
  { value: "15.1", series: "Legend", cefr: "B2", label: "15.1 - Legend" },
  { value: "15.2", series: "Legend", cefr: "B2", label: "15.2 - Legend" },
  { value: "15.3", series: "Legend", cefr: "B2", label: "15.3 - Legend" },
];

/**
 * Resolves the level list for a workbook type.
 * @param type Workbook type: "primary" or "secondary".
 * @returns The level options for the workbook type.
 */
export function getWorkbookLevelOptions(
  type: "primary" | "secondary",
): WorkbookLevelOption[] {
  return type === "primary" ? PRIMARY_LEVELS : SECONDARY_LEVELS;
}

/**
 * Ensures an existing level number survives the option list.
 *
 * A level number carried by the draft that is not part of the standard list is
 * prepended as an extra option so a current value is never silently lost when
 * the user opens or edits the settings dialog.
 * @param options Level options to extend.
 * @param settings Draft settings carrying the current level, or null when none.
 * @returns The options list, extended with the current level when it is unknown.
 */
export function ensureMetadataLevelOption(
  options: WorkbookLevelOption[],
  settings?: workbooks.WorkbookDraftSettings | null,
): WorkbookLevelOption[] {
  const levelNumber = settings?.levelNumber;
  if (!levelNumber) return options;

  const hasExistingOption = options.some(
    (option) => option.value === levelNumber,
  );
  if (hasExistingOption) return options;

  return [
    {
      value: levelNumber,
      series: settings.seriesName ?? "",
      cefr: settings.cefrLevel ?? "",
      label: `${levelNumber} - ${settings.seriesName ?? ""}`,
    },
    ...options,
  ];
}
