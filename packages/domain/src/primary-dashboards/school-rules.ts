import type { SchoolAlert } from "./school-contracts.js";

/** The main levels of the Primary CEFR scale, in order. */
export const CEFR_MAIN_LEVELS = ["A0", "A1", "A2", "B1", "B2"] as const;
/** Fewer than this percent of students active in 30 days raises the low activity alert. */
export const LOW_ACTIVITY_PERCENT = 30;
/** Fewer than this percent of students active in 30 days makes the alert "high". */
export const LOW_ACTIVITY_HIGH_PERCENT = 10;
/** An active license that ends within this many days raises the license alert. */
export const LICENSE_SOON_DAYS = 30;
/** An end within this many days makes the license alert "critical". */
export const LICENSE_CRITICAL_DAYS = 7;
/** Seats used at this percent of the seats or more raise the seats alert. */
export const SEATS_NEARLY_FULL_PERCENT = 90;

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2 } as const;

/**
 * Finds the main CEFR level of a level. A sub-level counts in its main level (`A1-`, `A1`, and
 * `A1+` count in A1). A level above B2 (C1, C2) counts in B2, because the scale has no row above
 * B2. A missing or unreadable level counts as A0.
 * @param level The stored level, for example "A1+".
 * @returns The main level, for example "A1".
 */
export function cefrMainLevel(level: string | null | undefined): string {
  const match = /^([ABC][0-9])/i.exec((level ?? "").trim());
  if (!match) return "A0";
  const main = match[1].toUpperCase();
  return main.startsWith("C") ? "B2" : main;
}

/**
 * Sorts main levels in scale order. Levels outside the scale go last, in text order.
 * @param a A main level.
 * @param b A main level.
 * @returns The sort sign.
 */
export function compareCefrMainLevel(a: string, b: string): number {
  const ia = (CEFR_MAIN_LEVELS as readonly string[]).indexOf(a);
  const ib = (CEFR_MAIN_LEVELS as readonly string[]).indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.localeCompare(b);
}

/**
 * Rounds a whole percent.
 * @param part The part.
 * @param whole The whole.
 * @returns The percent, or 0 when the whole is 0.
 */
export function percentOf(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((100 * part) / whole);
}

/**
 * Low student activity: the school has students and fewer than 30 percent are active in the last 30 days.
 * @param active Students active in the last 30 days.
 * @param total All students of the school.
 * @returns The alert, or null.
 */
export function lowActivityAlert(active: number, total: number): SchoolAlert | null {
  if (total <= 0 || active * 100 >= LOW_ACTIVITY_PERCENT * total) return null;
  const severity = active * 100 < LOW_ACTIVITY_HIGH_PERCENT * total ? "high" : "medium";
  return { code: "low-activity", severity, values: { active, total, percent: percentOf(active, total) } };
}

/**
 * License ends soon: an active license ends from today to 30 days after today.
 * @param daysToEnd Days to the nearest end date, or null when no license ends in that period.
 * @returns The alert (critical at 7 days or less, else medium), or null.
 */
export function licenseEndsSoonAlert(daysToEnd: number | null): SchoolAlert | null {
  if (daysToEnd === null || daysToEnd < 0 || daysToEnd > LICENSE_SOON_DAYS) return null;
  return { code: "license-ends-soon", severity: daysToEnd <= LICENSE_CRITICAL_DAYS ? "critical" : "medium", values: { days: daysToEnd } };
}

/**
 * License ended: the school has an ended license and no valid active license.
 * @param ended The ended flag of the license timing.
 * @returns The critical alert, or null.
 */
export function licenseEndedAlert(ended: boolean): SchoolAlert | null {
  return ended ? { code: "license-ended", severity: "critical", values: {} } : null;
}

/**
 * Seats nearly full: the seats used are 90 percent of the seats or more. A school with no seats
 * (no valid active license) gets no seat alert, because the percent has no meaning.
 * @param seatsUsed The STUDENT users of the school.
 * @param seats The seats of the active licenses.
 * @returns The alert (critical at 100 percent or more, else high), or null.
 */
export function seatsNearlyFullAlert(seatsUsed: number, seats: number): SchoolAlert | null {
  if (seats <= 0 || seatsUsed * 100 < SEATS_NEARLY_FULL_PERCENT * seats) return null;
  return {
    code: "seats-nearly-full",
    severity: seatsUsed >= seats ? "critical" : "high",
    values: { seatsUsed, seats, percent: percentOf(seatsUsed, seats) },
  };
}

/**
 * Sorts alerts critical, high, medium. The sort is stable, so alerts of one severity keep their input order.
 * @param alerts The alerts, with null for a rule that did not fire.
 * @returns The alerts that fired, sorted.
 */
export function sortAlerts(alerts: Array<SchoolAlert | null>): SchoolAlert[] {
  return alerts
    .filter((alert): alert is SchoolAlert => alert !== null)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
