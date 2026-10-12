/**
 * The shared activity counts of the Primary dashboards (admin dashboard, teacher home, system
 * dashboard). One rule defines an "activity event" and an "active student"; no dashboard writes
 * a second copy of a count. Every count reads the students of one scope and applies the window
 * [start, end) in Asia/Bangkok. The activity tables store UTC timestamps without a zone.
 */
import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { createTenantDB } from "../db-contract.js";
import { SCHOOL_TIME_ZONE } from "../calendar-day.js";
import {
  activityScopeSchema,
  type ActiveStudentsCount,
  type ActiveStudentsDay,
  type ActivityScope,
  type DashboardWindow,
} from "./contracts.js";

/** Activity type that the app writes when a student opens an article. */
export const ARTICLE_READ = "ARTICLE_READ";

/** The arguments of each count. */
export interface ActivityCountParams {
  db: DB;
  scope: ActivityScope;
  window: DashboardWindow;
}

/**
 * The Bangkok calendar day of a column that holds UTC without a zone, as "YYYY-MM-DD".
 * @param column The timestamp column (or expression).
 * @returns The SQL expression.
 */
export function bangkokDay(column: SQLWrapper): SQL<string> {
  return sql<string>`to_char(date_trunc('day', (${column} AT TIME ZONE 'UTC') AT TIME ZONE ${sql.raw(`'${SCHOOL_TIME_ZONE}'`)}), 'YYYY-MM-DD')`;
}

/**
 * Reads the rows of a raw query result. The postgres-js driver returns an array; the other
 * drivers return an object with `rows`.
 * @param result The result of `db.execute`.
 * @returns The rows.
 */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] } | null)?.rows ?? []) as T[];
}

/**
 * Opens the raw database for the scope. The reason string is greppable.
 * @param db The database.
 * @param scope The scope.
 * @returns The raw database. Every query joins the activity rows to `users.school_id`.
 */
export function scopedRawDb(db: DB, scope: ActivityScope): DB {
  const parsed = activityScopeSchema.parse(scope);
  return createTenantDB(db, { schoolId: parsed.schoolId }).unscoped(
    "primary-dashboards: user_activity, xp_logs, and lesson steps are REFERENTIAL; each query joins the student to users.school_id of the scope",
  );
}

/**
 * The window bounds as SQL values. `utcStart` and `utcEnd` fit the UTC `timestamp` columns;
 * `start` and `end` fit the `timestamptz` columns (for example `audit_events.created_at`).
 * @param window The window.
 * @returns The four SQL values.
 */
export function windowBoundsSql(window: DashboardWindow) {
  const start = window.start.toISOString();
  const end = window.end.toISOString();
  return {
    utcStart: sql`(${start}::timestamptz AT TIME ZONE 'UTC')`,
    utcEnd: sql`(${end}::timestamptz AT TIME ZONE 'UTC')`,
    start: sql`${start}::timestamptz`,
    end: sql`${end}::timestamptz`,
  };
}

/**
 * The students of a scope: columns `id`, `cefr_level`, `created_at`.
 * @param scope The scope.
 * @returns The SQL select.
 */
export function scopeStudentsSql(scope: ActivityScope): SQL {
  return sql`select u.id, u.cefr_level, u.created_at from users u where u.school_id = ${scope.schoolId}::uuid and u.role = 'STUDENT'`;
}

/**
 * The activity events of the students of a scope (FR-2 of the admin dashboard): a `user_activity`
 * row, an `xp_logs` row, or a lesson step with the status `done`. Columns: `sid`, `ts` (UTC).
 * @param scope The scope.
 * @returns The SQL select.
 */
export function activityEventsSql(scope: ActivityScope): SQL {
  const students = scopeStudentsSql(scope);
  return sql`
    select ua.user_id as sid, ua.created_at as ts from user_activity ua join (${students}) s on s.id = ua.user_id
    union all select x.user_id, x.created_at from xp_logs x join (${students}) s on s.id = x.user_id
    union all select l.student_id, l.done_at from primary_student_lesson_steps l join (${students}) s on s.id = l.student_id
      where l.status = 'done' and l.done_at is not null`;
}

/**
 * The events of a scope inside the window. Columns: `sid`, `ts`.
 * @param scope The scope.
 * @param window The window.
 * @returns The SQL select.
 */
export function windowEventsSql(scope: ActivityScope, window: DashboardWindow): SQL {
  const bounds = windowBoundsSql(window);
  return sql`select e.sid, e.ts from (${activityEventsSql(scope)}) e where e.ts >= ${bounds.utcStart} and e.ts < ${bounds.utcEnd}`;
}

/**
 * The students of a scope with at least one event in the window. Column: `sid`.
 * @param scope The scope.
 * @param window The window.
 * @returns The SQL select.
 */
export function activeStudentIdsSql(scope: ActivityScope, window: DashboardWindow): SQL {
  return sql`select distinct w.sid from (${windowEventsSql(scope, window)}) w`;
}

/**
 * The XP that each student of a scope earned in the window. Columns: `sid`, `xp`.
 * @param scope The scope.
 * @param window The window.
 * @returns The SQL select. Students with no XP in the window have no row.
 */
export function xpEarnedByStudentSql(scope: ActivityScope, window: DashboardWindow): SQL {
  const bounds = windowBoundsSql(window);
  return sql`
    select x.user_id as sid, sum(x.xp_earned) as xp from xp_logs x join (${scopeStudentsSql(scope)}) s on s.id = x.user_id
    where x.created_at >= ${bounds.utcStart} and x.created_at < ${bounds.utcEnd} group by x.user_id`;
}

/** Converts a driver value (number or numeric string) to a number; null gives 0. */
export const toInt = (value: unknown): number => Number(value ?? 0);

/**
 * Counts the active students of a scope in the window, and all students of the scope.
 * @param params.db The database.
 * @param params.scope The scope.
 * @param params.window The window.
 * @returns The active count, the total, and the whole percent (null when the scope has no students).
 */
export async function countActiveStudents(params: ActivityCountParams): Promise<ActiveStudentsCount> {
  const raw = scopedRawDb(params.db, params.scope);
  const rows = rowsOf<{ active: unknown; total: unknown }>(
    await raw.execute(sql`
      select (select count(*) from (${activeStudentIdsSql(params.scope, params.window)}) a)::int as active,
             (select count(*) from (${scopeStudentsSql(params.scope)}) t)::int as total`),
  );
  const active = toInt(rows[0]?.active);
  const total = toInt(rows[0]?.total);
  return { active, total, percent: total === 0 ? null : Math.round((100 * active) / total) };
}

/**
 * Counts the distinct active students of a scope on each Bangkok day of the window.
 * @param params.db The database.
 * @param params.scope The scope.
 * @param params.window The window.
 * @returns One value for each day of the window, first to last. A day with no events has 0.
 */
export async function countActiveStudentsByDay(params: ActivityCountParams): Promise<ActiveStudentsDay[]> {
  const raw = scopedRawDb(params.db, params.scope);
  const rows = rowsOf<{ day: string; active: unknown }>(
    await raw.execute(sql`
      select ${bangkokDay(sql`w.ts`)} as day, count(distinct w.sid)::int as active
      from (${windowEventsSql(params.scope, params.window)}) w group by 1`),
  );
  const byDay = new Map(rows.map((row) => [row.day, toInt(row.active)]));
  return params.window.dayKeys.map((day) => ({ day, activeStudents: byDay.get(day) ?? 0 }));
}

/**
 * Counts the activity events of the students of a scope in the window.
 * @param params.db The database.
 * @param params.scope The scope.
 * @param params.window The window.
 * @returns The number of events.
 */
export async function countActivityEvents(params: ActivityCountParams): Promise<number> {
  const raw = scopedRawDb(params.db, params.scope);
  const rows = rowsOf<{ n: unknown }>(
    await raw.execute(sql`select count(*)::int as n from (${windowEventsSql(params.scope, params.window)}) w`),
  );
  return toInt(rows[0]?.n);
}

/**
 * Counts the `ARTICLE_READ` rows that the students of a scope created in the window.
 * @param params.db The database.
 * @param params.scope The scope.
 * @param params.window The window.
 * @returns The number of articles opened.
 */
export async function countArticlesOpened(params: ActivityCountParams): Promise<number> {
  const raw = scopedRawDb(params.db, params.scope);
  const bounds = windowBoundsSql(params.window);
  const rows = rowsOf<{ n: unknown }>(
    await raw.execute(sql`
      select count(*)::int as n from user_activity ua join (${scopeStudentsSql(params.scope)}) s on s.id = ua.user_id
      where ua.activity_type = ${ARTICLE_READ} and ua.created_at >= ${bounds.utcStart} and ua.created_at < ${bounds.utcEnd}`),
  );
  return toInt(rows[0]?.n);
}

/**
 * Sums the XP that the students of a scope earned in the window (`xp_logs.xp_earned`).
 * @param params.db The database.
 * @param params.scope The scope.
 * @param params.window The window.
 * @returns The XP sum.
 */
export async function sumXpEarned(params: ActivityCountParams): Promise<number> {
  const raw = scopedRawDb(params.db, params.scope);
  const bounds = windowBoundsSql(params.window);
  const rows = rowsOf<{ n: unknown }>(
    await raw.execute(sql`
      select coalesce(sum(x.xp_earned), 0)::int as n from xp_logs x join (${scopeStudentsSql(params.scope)}) s on s.id = x.user_id
      where x.created_at >= ${bounds.utcStart} and x.created_at < ${bounds.utcEnd}`),
  );
  return toInt(rows[0]?.n);
}

/**
 * Counts the students of a scope who were created in the window.
 * @param params.db The database.
 * @param params.scope The scope.
 * @param params.window The window.
 * @returns The number of new students.
 */
export async function countNewStudents(params: ActivityCountParams): Promise<number> {
  const raw = scopedRawDb(params.db, params.scope);
  const bounds = windowBoundsSql(params.window);
  const rows = rowsOf<{ n: unknown }>(
    await raw.execute(sql`
      select count(*)::int as n from (${scopeStudentsSql(params.scope)}) s
      where s.created_at >= ${bounds.utcStart} and s.created_at < ${bounds.utcEnd}`),
  );
  return toInt(rows[0]?.n);
}

/**
 * Finds the last activity event of the students of a scope (all time).
 * @param params.db The database.
 * @param params.scope The scope.
 * @returns The instant of the last event, or null when there is none.
 */
export async function getLastActivityAt(params: Omit<ActivityCountParams, "window">): Promise<Date | null> {
  const raw = scopedRawDb(params.db, params.scope);
  const rows = rowsOf<{ last: string | null }>(
    await raw.execute(sql`
      select to_char(max(e.ts), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as last from (${activityEventsSql(params.scope)}) e`),
  );
  return rows[0]?.last ? new Date(rows[0].last) : null;
}
