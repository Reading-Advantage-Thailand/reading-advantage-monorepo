import type { ProgressCell } from "@reading-advantage/domain/primary-books";

/** Cell colors of the class progress grid by status; every pair keeps WCAG AA contrast. */
export const CELL_TONE: Record<ProgressCell["status"], string> = {
  done: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  not_started: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
