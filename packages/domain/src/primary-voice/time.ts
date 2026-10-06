import { SCHOOL_TIME_ZONE } from "../calendar-day.js";

const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit" });

/**
 * The budget month of an instant on the school clock (Asia/Bangkok), FR-1.
 * @param date The instant.
 * @returns "YYYY-MM".
 */
export function voiceMonthKey(date: Date): string {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
}

/**
 * The seconds a session consumed: from the connection to the end, rounded up, never more than
 * the reservation, and none for a session that never connected.
 * @param startedAt When the browser connected, or null.
 * @param endedAt When the session ended.
 * @param reservedSeconds The reservation.
 * @returns The seconds to charge.
 */
export function consumedVoiceSeconds(startedAt: Date | null, endedAt: Date, reservedSeconds: number): number {
  if (!startedAt) return 0;
  return Math.min(reservedSeconds, Math.max(0, Math.ceil((endedAt.getTime() - startedAt.getTime()) / 1000)));
}
