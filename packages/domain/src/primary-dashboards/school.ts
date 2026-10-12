import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { AuthError, assertCan, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { getSchoolLicenseTiming, getSchoolSeatUsage } from "../licenses/usage.js";
import {
  activeStudentIdsSql,
  countActiveStudents,
  countActiveStudentsByDay,
  countActivityEvents,
  countArticlesOpened,
  countNewStudents,
  rowsOf,
  scopeStudentsSql,
  sumXpEarned,
  toInt,
  windowBoundsSql,
  xpEarnedByStudentSql,
} from "./activity.js";
import type { ActivityScope, DashboardWindow } from "./contracts.js";
import { dashboardWindow } from "./window.js";
import {
  schoolDashboardInputSchema,
  schoolDashboardSchema,
  type AdoptionRow,
  type SchoolDashboard,
  type SchoolDashboardInput,
  type TeacherRow,
} from "./school-contracts.js";
import {
  cefrMainLevel,
  compareCefrMainLevel,
  licenseEndedAlert,
  licenseEndsSoonAlert,
  lowActivityAlert,
  percentOf,
  seatsNearlyFullAlert,
  sortAlerts,
} from "./school-rules.js";

/** The key of the grade row for students who have no class. */
export const NO_GRADE_KEY = "none";
/** The window of the low student activity alert, in days. It ignores the range control. */
const LOW_ACTIVITY_DAYS = 30;

interface Params {
  db: DB;
  scope: ActivityScope;
  window: DashboardWindow;
}

/**
 * Opens the raw database for a school query. Each query below filters by the school id
 * (`users.school_id`, `classrooms.school_id`) and joins the REFERENTIAL tables to those rows.
 * @param params.db The database.
 * @param params.scope The school scope.
 * @returns The raw database.
 */
function schoolRaw(params: Params): DB {
  return createTenantDB(params.db, { schoolId: params.scope.schoolId }).unscoped(
    "primary-school-dashboard: teachers, classes, and rosters filter school_id; REFERENTIAL rows join through users.school_id or classrooms.school_id",
  );
}

/**
 * Counts the TEACHER users of the school who have an `auth:login` audit event or a class sign-in
 * session in the window, and all TEACHER users of the school.
 * @param params.db The database.
 * @param params.scope The school scope.
 * @param params.window The window.
 * @returns The active teachers and all teachers.
 */
async function countActiveTeachers(params: Params): Promise<{ active: number; total: number }> {
  const raw = schoolRaw(params);
  const b = windowBoundsSql(params.window);
  const rows = rowsOf<{ active: unknown; total: unknown }>(
    await raw.execute(sql`
      select (count(*) filter (where
                exists (select 1 from audit_events a where a.actor_user_id = t.id and a.action = 'auth:login'
                        and a.created_at >= ${b.start} and a.created_at < ${b.end})
                or exists (select 1 from primary_class_login_sessions l where l.teacher_id = t.id and l.school_id = ${params.scope.schoolId}::uuid
                           and l.created_at >= ${b.utcStart} and l.created_at < ${b.utcEnd})))::int as active,
             count(*)::int as total
      from users t where t.school_id = ${params.scope.schoolId}::uuid and t.role = 'TEACHER'`),
  );
  return { active: toInt(rows[0]?.active), total: toInt(rows[0]?.total) };
}

/**
 * Counts the not archived classes of the school that have at least one active student.
 * @param params.db The database.
 * @param params.scope The school scope.
 * @param params.window The window.
 * @returns The classes with activity and all not archived classes.
 */
async function countClassesWithActivity(params: Params): Promise<{ active: number; total: number }> {
  const raw = schoolRaw(params);
  const rows = rowsOf<{ active: unknown; total: unknown }>(
    await raw.execute(sql`
      select (count(*) filter (where exists (
                select 1 from classroom_students cs join (${activeStudentIdsSql(params.scope, params.window)}) a on a.sid = cs.student_id
                where cs.classroom_id = c.id)))::int as active,
             count(*)::int as total
      from classrooms c where c.school_id = ${params.scope.schoolId}::uuid and c.archived = false`),
  );
  return { active: toInt(rows[0]?.active), total: toInt(rows[0]?.total) };
}

/**
 * Builds the adoption rows by CEFR main level. A sub-level counts in its main level and a missing
 * level counts as A0. A level with no students has no row.
 * @param params.db The database.
 * @param params.scope The school scope.
 * @param params.window The window.
 * @returns One row for each main level that has students, in scale order.
 */
async function adoptionByCefr(params: Params): Promise<AdoptionRow[]> {
  const raw = schoolRaw(params);
  const rows = rowsOf<{ level: string | null; students: unknown; active: unknown; xp: unknown }>(
    await raw.execute(sql`
      select s.cefr_level as level, count(*)::int as students, count(a.sid)::int as active, coalesce(sum(x.xp), 0)::int as xp
      from (${scopeStudentsSql(params.scope)}) s
      left join (${activeStudentIdsSql(params.scope, params.window)}) a on a.sid = s.id
      left join (${xpEarnedByStudentSql(params.scope, params.window)}) x on x.sid = s.id
      group by s.cefr_level`),
  );
  const merged = new Map<string, { students: number; active: number; xp: number }>();
  for (const row of rows) {
    const key = cefrMainLevel(row.level);
    const entry = merged.get(key) ?? { students: 0, active: 0, xp: 0 };
    entry.students += toInt(row.students);
    entry.active += toInt(row.active);
    entry.xp += toInt(row.xp);
    merged.set(key, entry);
  }
  return [...merged.entries()]
    .sort(([a], [b]) => compareCefrMainLevel(a, b))
    .map(([key, v]) => ({ key, students: v.students, active: v.active, percent: percentOf(v.active, v.students), averageXp: Math.round(v.xp / v.students) }));
}

/**
 * Builds the adoption rows by class grade. A student counts once in each grade of the student's
 * not archived classes. A student with no such class counts in the row "none".
 * @param params.db The database.
 * @param params.scope The school scope.
 * @param params.window The window.
 * @returns One row for each grade, low grades first, and the row "none" last.
 */
async function adoptionByGrade(params: Params): Promise<AdoptionRow[]> {
  const raw = schoolRaw(params);
  const schoolId = params.scope.schoolId;
  const rows = rowsOf<{ grade: string | null; students: unknown; active: unknown; xp: unknown }>(
    await raw.execute(sql`
      with sg as (
        select distinct cs.student_id as sid, c.grade as grade
        from classroom_students cs
        join classrooms c on c.id = cs.classroom_id and c.school_id = ${schoolId}::uuid and c.archived = false
        join (${scopeStudentsSql(params.scope)}) s on s.id = cs.student_id
        union
        select s.id, null from (${scopeStudentsSql(params.scope)}) s
        where not exists (select 1 from classroom_students cs join classrooms c on c.id = cs.classroom_id
                          where cs.student_id = s.id and c.school_id = ${schoolId}::uuid and c.archived = false))
      select sg.grade::text as grade, count(*)::int as students, count(a.sid)::int as active, coalesce(sum(x.xp), 0)::int as xp
      from sg
      left join (${activeStudentIdsSql(params.scope, params.window)}) a on a.sid = sg.sid
      left join (${xpEarnedByStudentSql(params.scope, params.window)}) x on x.sid = sg.sid
      group by sg.grade order by sg.grade nulls last`),
  );
  return rows.map((row) => {
    const students = toInt(row.students);
    const active = toInt(row.active);
    return {
      key: row.grade ?? NO_GRADE_KEY,
      students,
      active,
      percent: percentOf(active, students),
      averageXp: Math.round(toInt(row.xp) / students),
    };
  });
}

/**
 * Builds the teachers table: for each TEACHER user, the not archived classes (owned or co-taught),
 * the distinct students of those classes, the active students, and the engagement percent.
 * @param params.db The database.
 * @param params.scope The school scope.
 * @param params.window The window.
 * @returns The rows, highest engagement first. Teachers without students go last.
 */
async function teachersTable(params: Params): Promise<TeacherRow[]> {
  const raw = schoolRaw(params);
  const schoolId = params.scope.schoolId;
  const rows = rowsOf<{ id: string; name: string | null; classes: unknown; students: unknown; active: unknown }>(
    await raw.execute(sql`
      with cls as (select id, teacher_id from classrooms where school_id = ${schoolId}::uuid and archived = false),
      tc as (
        select teacher_id as tid, id as cid from cls where teacher_id is not null
        union select ct.teacher_id, ct.classroom_id from classroom_teachers ct join cls on cls.id = ct.classroom_id),
      ts as (
        select distinct tc.tid, cs.student_id as sid from tc
        join classroom_students cs on cs.classroom_id = tc.cid
        join (${scopeStudentsSql(params.scope)}) s on s.id = cs.student_id)
      select t.id, t.name,
             (select count(distinct tc.cid) from tc where tc.tid = t.id)::int as classes,
             count(ts.sid)::int as students, count(a.sid)::int as active
      from users t
      left join ts on ts.tid = t.id
      left join (${activeStudentIdsSql(params.scope, params.window)}) a on a.sid = ts.sid
      where t.school_id = ${schoolId}::uuid and t.role = 'TEACHER'
      group by t.id, t.name`),
  );
  return rows
    .map((row) => {
      const students = toInt(row.students);
      const active = toInt(row.active);
      return {
        teacherId: row.id,
        name: row.name,
        classes: toInt(row.classes),
        students,
        active,
        engagementPercent: students === 0 ? null : percentOf(active, students),
      };
    })
    .sort((a, b) => {
      if (a.engagementPercent === null || b.engagementPercent === null) {
        return a.engagementPercent === b.engagementPercent ? a.teacherId.localeCompare(b.teacherId) : a.engagementPercent === null ? 1 : -1;
      }
      return b.engagementPercent - a.engagementPercent || a.teacherId.localeCompare(b.teacherId);
    });
}

/**
 * Reads the school dashboard (FR-3 to FR-9): key numbers, adoption by CEFR level and by class
 * grade, alerts, the teachers table, and activity by day, for one school and the last N Bangkok
 * days. It runs a fixed number of aggregate queries and loads no raw activity rows.
 * @param params.db The database.
 * @param params.user The signed-in user. ADMIN and SYSTEM only.
 * @param params.input The school and the range (7, 30, or 90; an unknown value gives 30).
 * @param params.now The current instant. Tests replace it.
 * @returns The dashboard data. It passed the output schema.
 * @throws {AuthError} FORBIDDEN when the role cannot read the dashboard, or when a caller that is
 *   not SYSTEM names a school other than the session school.
 * @throws {ZodError} When the school id is not a UUID.
 */
export async function getSchoolDashboard(params: {
  db: DB;
  user: UserContext;
  input: SchoolDashboardInput;
  now?: Date;
}): Promise<SchoolDashboard> {
  const { db, user } = params;
  const now = params.now ?? new Date();
  assertCan(user, "admin:dashboard", { schoolId: user.schoolId });
  const input = schoolDashboardInputSchema.parse(params.input);
  // assertCan checks the role only: the school check is here.
  if (user.role !== "SYSTEM" && user.schoolId !== input.schoolId) {
    throw new AuthError(`User ${user.id} cannot read the dashboard of another school`, "FORBIDDEN");
  }
  const range = input.range ?? 30;
  const scope: ActivityScope = { kind: "school", schoolId: input.schoolId };
  const window = dashboardWindow(range, now);
  const lowWindow = range === LOW_ACTIVITY_DAYS ? window : dashboardWindow(LOW_ACTIVITY_DAYS, now);
  const base = { db, scope };

  const [
    activeStudents,
    lowActivity,
    activeTeachers,
    classes,
    articlesOpened,
    xpEarned,
    newStudents,
    cefrRows,
    gradeRows,
    teachers,
    byDay,
    totalEvents,
    seats,
    licenseTiming,
  ] = await Promise.all([
    countActiveStudents({ ...base, window }),
    range === LOW_ACTIVITY_DAYS ? null : countActiveStudents({ ...base, window: lowWindow }),
    countActiveTeachers({ ...base, window }),
    countClassesWithActivity({ ...base, window }),
    countArticlesOpened({ ...base, window }),
    sumXpEarned({ ...base, window }),
    countNewStudents({ ...base, window }),
    adoptionByCefr({ ...base, window }),
    adoptionByGrade({ ...base, window }),
    teachersTable({ ...base, window }),
    countActiveStudentsByDay({ ...base, window }),
    countActivityEvents({ ...base, window }),
    getSchoolSeatUsage({ db, schoolId: input.schoolId, now }),
    getSchoolLicenseTiming({ db, schoolId: input.schoolId, now }),
  ]);

  const low = lowActivity ?? activeStudents;
  const peak = byDay.reduce<(typeof byDay)[number] | null>((best, day) => (day.activeStudents > (best?.activeStudents ?? 0) ? day : best), null);
  const dailySum = byDay.reduce((sum, day) => sum + day.activeStudents, 0);

  return schoolDashboardSchema.parse({
    schoolId: input.schoolId,
    range,
    startDay: window.startDay,
    endDay: window.endDay,
    kpis: {
      activeStudents,
      activeTeachers,
      classesWithActivity: classes,
      articlesOpened,
      xpEarned,
      newStudents,
    },
    adoptionByCefr: cefrRows,
    adoptionByGrade: gradeRows,
    alerts: sortAlerts([
      lowActivityAlert(low.active, low.total),
      licenseEndedAlert(licenseTiming.ended),
      licenseEndsSoonAlert(licenseTiming.daysToEndSoon),
      seatsNearlyFullAlert(seats.seatsUsed, seats.seats),
    ]),
    teachers,
    activityByDay: {
      days: byDay,
      totalEvents,
      peakDay: peak,
      dailyAverage: Math.round((dailySum / window.days) * 10) / 10,
    },
  });
}
