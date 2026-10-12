import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { schoolAdmins } from "@reading-advantage/db/schema";
import { AuthError, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { calendarDayKey } from "../calendar-day.js";
import { rowsOf } from "../primary-dashboards/activity.js";
import {
  SEAT_HOLDERS_PAGE_SIZE,
  schoolLicenseViewOutputSchema,
  seatHoldersInputSchema,
  seatHoldersOutputSchema,
  type SchoolLicenseViewOutput,
  type SeatHoldersOutput,
} from "./contracts.js";
import { LICENSE_END_DAY, getSchoolSeatUsage } from "./usage.js";

const UNSCOPED_REASON = "licenses and users are FLAT and filtered by school_id; classroom_students is REFERENTIAL, joined to classrooms of the same school";

/**
 * Checks that the caller may see the license data of a school: SYSTEM, an ADMIN of that school, or a
 * TEACHER with a `school_admins` row of that school (the `SCHOOL_ADMIN_ACCESS` rule of the app).
 * @param db The database.
 * @param user The caller.
 * @param schoolId The school to read.
 * @throws {AuthError} When the caller has none of these rights for the school.
 */
async function assertCanViewSchoolLicense(db: DB, user: UserContext, schoolId: string): Promise<void> {
  if (user.role === "SYSTEM") return;
  if (user.schoolId !== schoolId) throw new AuthError("The school belongs to another school", "FORBIDDEN");
  if (user.role === "ADMIN") return;
  if (user.role === "TEACHER") {
    const rows = await createTenantDB(db, { schoolId })
      .select({ id: schoolAdmins.id })
      .from(schoolAdmins)
      .where(and(eq(schoolAdmins.userId, user.id), eq(schoolAdmins.schoolId, schoolId)))
      .limit(1);
    if (rows.length > 0) return;
  }
  throw new AuthError("School admin access required", "FORBIDDEN");
}

/**
 * Reads the licenses of a school and the seat totals. View only: no license changes.
 * @param params.db The database.
 * @param params.user The caller (school admin of the school, or SYSTEM).
 * @param params.schoolId The school.
 * @param params.now The current instant. Tests replace it.
 * @returns Each license with its state, and the seats used, free, and over.
 * @throws {AuthError} When the caller is not a school admin of the school.
 */
export async function getSchoolLicenseView(params: {
  db: DB;
  user: UserContext;
  schoolId: string;
  now?: Date;
}): Promise<SchoolLicenseViewOutput> {
  const { db, user, schoolId } = params;
  const now = params.now ?? new Date();
  await assertCanViewSchoolLicense(db, user, schoolId);
  const today = calendarDayKey(now);
  const usage = await getSchoolSeatUsage({ db, schoolId, now });
  const raw = createTenantDB(db, { schoolId }).unscoped(UNSCOPED_REASON);
  const rows = rowsOf<{
    id: string; name: string | null; status: string; start_day: string | null; end_day: string | null; ended: boolean; max_users: number;
  }>(
    await raw.execute(sql`
      select l.id, coalesce(l.name, l.school_name) as name, l.status, l.max_users,
             to_char(l.start_date, 'YYYY-MM-DD') as start_day,
             to_char(${LICENSE_END_DAY}, 'YYYY-MM-DD') as end_day,
             (${LICENSE_END_DAY} < ${today}::date) as ended
      from licenses l where l.school_id = ${schoolId}::uuid
      order by l.start_date nulls last, l.created_at, l.id`),
  );
  const licenses = rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    state: row.ended ? ("ended" as const) : row.status === "active" ? ("active" as const) : ("inactive" as const),
    startDate: row.start_day,
    endDate: row.end_day,
    seats: Number(row.max_users),
  }));
  const hasActiveLicense = licenses.some((license) => license.state === "active");
  return schoolLicenseViewOutputSchema.parse({
    licenses,
    seats: usage.seats,
    seatsUsed: usage.seatsUsed,
    seatsFree: Math.max(usage.seats - usage.seatsUsed, 0),
    seatsOver: hasActiveLicense ? Math.max(usage.seatsUsed - usage.seats, 0) : 0,
    hasActiveLicense,
  });
}

/**
 * Lists one page of the students of a school (50 for each page): name, username, classes, join date.
 * @param params.db The database.
 * @param params.user The caller (school admin of the school, or SYSTEM).
 * @param params.schoolId The school.
 * @param params.page The page number, from 1.
 * @returns The page, the student total, and the students of the page.
 * @throws {AuthError} When the caller is not a school admin of the school.
 * @throws {ZodError} When the school id or the page is not valid.
 */
export async function listSeatHolders(params: {
  db: DB;
  user: UserContext;
  schoolId: string;
  page: number;
}): Promise<SeatHoldersOutput> {
  const { schoolId, page } = seatHoldersInputSchema.parse({ schoolId: params.schoolId, page: params.page });
  await assertCanViewSchoolLicense(params.db, params.user, schoolId);
  const raw = createTenantDB(params.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const offset = (page - 1) * SEAT_HOLDERS_PAGE_SIZE;
  const rows = rowsOf<{ id: string; name: string | null; username: string; classes: string[] | null; joined: Date | string; total: number }>(
    await raw.execute(sql`
      select u.id, u.name, u.username, u.created_at as joined,
             (select array_agg(distinct c.name order by c.name) from classroom_students cs
                join classrooms c on c.id = cs.classroom_id and c.school_id = u.school_id
              where cs.student_id = u.id) as classes,
             (select count(*) from users t where t.school_id = ${schoolId}::uuid and t.role = 'STUDENT')::int as total
      from users u where u.school_id = ${schoolId}::uuid and u.role = 'STUDENT'
      order by u.name, u.id limit ${SEAT_HOLDERS_PAGE_SIZE} offset ${offset}`),
  );
  let total = Number(rows[0]?.total ?? 0);
  if (rows.length === 0 && offset > 0) {
    const counted = rowsOf<{ total: number }>(
      await raw.execute(sql`select count(*)::int as total from users where school_id = ${schoolId}::uuid and role = 'STUDENT'`),
    );
    total = Number(counted[0]?.total ?? 0);
  }
  return seatHoldersOutputSchema.parse({
    page,
    pageSize: SEAT_HOLDERS_PAGE_SIZE,
    total,
    holders: rows.map((row) => ({
      id: row.id,
      name: row.name ?? "",
      username: row.username,
      classes: row.classes ?? [],
      joinedAt: new Date(row.joined).toISOString(),
    })),
  });
}
