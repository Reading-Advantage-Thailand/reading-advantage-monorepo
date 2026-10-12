import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { z } from "zod";
import { createTenantDB } from "../db-contract.js";
import { SCHOOL_TIME_ZONE, calendarDayKey } from "../calendar-day.js";
import { rowsOf } from "../primary-dashboards/activity.js";

/** The seats of a school and the seats in use. */
export const schoolSeatUsageSchema = z.object({
  /** The sum of `max_users` of the active licenses that have not ended. 0 when the school has none. */
  seats: z.number().int().nonnegative(),
  /** The STUDENT users of the school. */
  seatsUsed: z.number().int().nonnegative(),
});

/** The seats of a school and the seats in use. */
export type SchoolSeatUsage = z.infer<typeof schoolSeatUsageSchema>;

/** The end dates of the licenses of a school, for the license alerts. */
export const schoolLicenseTimingSchema = z.object({
  /**
   * Days from today to the nearest end date of an active license that ends from today to 30 days
   * after today. Null when no active license ends in that period.
   */
  daysToEndSoon: z.number().int().min(0).max(30).nullable(),
  /** True when a license ended before today and no active license is still valid. */
  ended: z.boolean(),
});

/** The end dates of the licenses of a school, for the license alerts. */
export type SchoolLicenseTiming = z.infer<typeof schoolLicenseTimingSchema>;

const LICENSE_REASON = "licenses are FLAT: every query filters school_id; students are counted by users.school_id";

/**
 * A license end date as a Bangkok calendar day. `licenses.expiry_date` holds UTC without a zone.
 * A license without an end date has null and never ends.
 */
export const LICENSE_END_DAY = sql`(l.expiry_date AT TIME ZONE 'UTC' AT TIME ZONE ${sql.raw(`'${SCHOOL_TIME_ZONE}'`)})::date`;

/**
 * Reads the seat usage of a school: seats = the sum of `max_users` of the licenses with the status
 * `active` and an end date from today on (or none); seats used = the STUDENT users of the school.
 * The caller checks the permission.
 * @param params.db The database.
 * @param params.schoolId The school.
 * @param params.now The current instant. Tests replace it.
 * @returns The seats and the seats used.
 */
export async function getSchoolSeatUsage(params: { db: DB; schoolId: string; now?: Date }): Promise<SchoolSeatUsage> {
  const today = calendarDayKey(params.now ?? new Date());
  const raw = createTenantDB(params.db, { schoolId: params.schoolId }).unscoped(LICENSE_REASON);
  const rows = rowsOf<{ seats: unknown; used: unknown }>(
    await raw.execute(sql`
      select (select coalesce(sum(l.max_users), 0) from licenses l
              where l.school_id = ${params.schoolId}::uuid and l.status = 'active'
                and (${LICENSE_END_DAY} is null or ${LICENSE_END_DAY} >= ${today}::date))::int as seats,
             (select count(*) from users u where u.school_id = ${params.schoolId}::uuid and u.role = 'STUDENT')::int as used`),
  );
  return schoolSeatUsageSchema.parse({ seats: Number(rows[0]?.seats ?? 0), seatsUsed: Number(rows[0]?.used ?? 0) });
}

/**
 * Reads the license end dates of a school: the days to the nearest end of an active license that
 * ends within 30 days, and whether the school has only ended licenses. The caller checks the permission.
 * @param params.db The database.
 * @param params.schoolId The school.
 * @param params.now The current instant. Tests replace it.
 * @returns The days to the end (or null) and the ended flag.
 */
export async function getSchoolLicenseTiming(params: { db: DB; schoolId: string; now?: Date }): Promise<SchoolLicenseTiming> {
  const today = calendarDayKey(params.now ?? new Date());
  const raw = createTenantDB(params.db, { schoolId: params.schoolId }).unscoped(LICENSE_REASON);
  const rows = rowsOf<{ soon: unknown; ended: unknown }>(
    await raw.execute(sql`
      select (select min(${LICENSE_END_DAY} - ${today}::date) from licenses l
              where l.school_id = ${params.schoolId}::uuid and l.status = 'active'
                and ${LICENSE_END_DAY} between ${today}::date and ${today}::date + 30)::int as soon,
             (exists (select 1 from licenses l where l.school_id = ${params.schoolId}::uuid and ${LICENSE_END_DAY} < ${today}::date)
              and not exists (select 1 from licenses l where l.school_id = ${params.schoolId}::uuid and l.status = 'active'
                              and (${LICENSE_END_DAY} is null or ${LICENSE_END_DAY} >= ${today}::date))) as ended`),
  );
  const soon = rows[0]?.soon;
  return schoolLicenseTimingSchema.parse({
    daysToEndSoon: soon === null || soon === undefined ? null : Number(soon),
    ended: Boolean(rows[0]?.ended),
  });
}
