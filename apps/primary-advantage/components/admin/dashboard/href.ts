import type { DashboardRange } from "@reading-advantage/domain/primary-dashboards";

/** The adoption view: by CEFR main level or by class grade. */
export type AdoptionView = "cefr" | "grade";

/**
 * Builds a dashboard URL that keeps the range, the adoption view, and the SYSTEM school.
 * The default values (30 days, CEFR) stay out of the URL.
 * @param state.range The range in days.
 * @param state.by The adoption view.
 * @param state.school The school id that a SYSTEM user chose, if any.
 * @returns The path with its query string.
 */
export function dashboardHref(state: { range: DashboardRange; by: AdoptionView; school?: string | null }): string {
  const query = new URLSearchParams();
  if (state.range !== 30) query.set("range", String(state.range));
  if (state.by !== "cefr") query.set("by", state.by);
  if (state.school) query.set("school", state.school);
  const text = query.toString();
  return text ? `/admin/dashboard?${text}` : "/admin/dashboard";
}
