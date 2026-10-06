/** Idle time after which a student session ends (FR-9). */
export const STUDENT_SESSION_IDLE_SECONDS = 30 * 60;

/** Default local hour (24h clock, Asia/Bangkok) at which the school day ends (FR-9). */
export const SCHOOL_DAY_END_HOUR = 17;

/** Asia/Bangkok has a fixed UTC+7 offset and no daylight saving time. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Session options that enforce the student session policy. */
export interface StudentSessionOptions {
  expiresAt: Date;
  idleTimeoutSeconds: number;
  singleDevice: true;
}

/**
 * Finds the next end of the school day in Asia/Bangkok.
 * A sign-in at or after the end hour gets the end of the next day.
 * @param now The sign-in time.
 * @returns The first instant after `now` at which the Bangkok clock reads the end hour.
 */
export function schoolDayEnd(now: Date): Date {
  const local = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  const endLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), SCHOOL_DAY_END_HOUR);
  let end = endLocal - BANGKOK_OFFSET_MS;
  if (end <= now.getTime()) end += DAY_MS;
  return new Date(end);
}

/**
 * Builds the `createSession` options for a student session: end of the school day,
 * 30 minutes idle, and one device at a time. Every student sign-in path passes them.
 * @param now The sign-in time. Tests replace it.
 * @returns The options to give to `createSession`.
 */
export function studentSessionOptions(now: Date = new Date()): StudentSessionOptions {
  return { expiresAt: schoolDayEnd(now), idleTimeoutSeconds: STUDENT_SESSION_IDLE_SECONDS, singleDevice: true };
}
