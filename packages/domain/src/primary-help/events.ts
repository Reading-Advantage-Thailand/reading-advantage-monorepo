import { assertCan, type Permission, type UserContext } from "@reading-advantage/auth";
import { primaryHelpEvents, schools, type DB } from "@reading-advantage/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { createTenantDB } from "../db-contract.js";
import {
  helpEventReportInput,
  helpEventReportOutput,
  recordHelpEventInput,
  recordHelpEventOutput,
  type HelpEventReport,
  type HelpEventReportInput,
  type RecordHelpEventInput,
  type RecordHelpEventOutput,
} from "./contracts.js";
import { HELP_EVENT_RECORD, HELP_REPORT_READ } from "./permissions.js";

const DAY_MS = 86_400_000;
/** The most pages that the report lists in each page table. */
export const HELP_REPORT_PAGE_LIMIT = 50;

/**
 * Records one help panel event for the user's school (track primary_in_app_help_20261023, FR-11).
 * The row keeps the role but no user id.
 * @param params.db The database.
 * @param params.user The signed-in user.
 * @param params.input The event.
 * @returns `recorded: false` when the user has no school, else `recorded: true`.
 * @throws AuthError FORBIDDEN for a role that has no help button; ZodError for a bad event.
 */
export async function recordHelpEvent(params: { db: DB; user: UserContext; input: RecordHelpEventInput }): Promise<RecordHelpEventOutput> {
  assertCan(params.user, HELP_EVENT_RECORD as Permission);
  const input = recordHelpEventInput.parse(params.input);
  const schoolId = params.user.schoolId;
  if (!schoolId) return recordHelpEventOutput.parse({ recorded: false });
  await createTenantDB(params.db, { schoolId })
    .insert(primaryHelpEvents)
    .values({
      schoolId,
      role: params.user.role as typeof primaryHelpEvents.$inferInsert.role,
      event: input.event,
      routePattern: input.routePattern,
      videoId: input.event === "play" ? input.videoId : null,
      source: input.event === "play" ? input.source : null,
      matched: input.event === "open" ? input.matched : null,
    });
  return recordHelpEventOutput.parse({ recorded: true });
}

/**
 * Builds the system help report for the last 7 and 30 days (FR-12): plays per video, role, and source,
 * opens per page, the pages where the panel opened with no video, and the schools with events.
 * @param params.db The database.
 * @param params.user The signed-in user (SYSTEM).
 * @param params.now The report time; defaults to now.
 * @param params.input An optional school filter.
 * @returns The three tables (largest 30-day count first) and the schools by name.
 * @throws AuthError FORBIDDEN for any role but SYSTEM.
 */
export async function helpEventReport(params: { db: DB; user: UserContext; now?: Date; input?: HelpEventReportInput }): Promise<HelpEventReport> {
  assertCan(params.user, HELP_REPORT_READ as Permission);
  const input = helpEventReportInput.parse(params.input ?? {});
  const now = (params.now ?? new Date()).getTime();
  const t = primaryHelpEvents;
  const db = createTenantDB(params.db, { schoolId: null }).unscoped(
    "help report: SYSTEM only (primary:help-report:read); reads all schools or the chosen school",
  );
  const since30 = gte(t.createdAt, new Date(now - 30 * DAY_MS));
  const inWindow = (event: "open" | "play") => and(eq(t.event, event), since30, input.schoolId ? eq(t.schoolId, input.schoolId) : undefined);
  const last7 = sql<number>`(count(*) filter (where ${gte(t.createdAt, new Date(now - 7 * DAY_MS))}))::int`;
  const last30 = sql<number>`count(*)::int`;
  const [plays, opens, unmatched, schoolRows] = await Promise.all([
    db
      .select({ videoId: t.videoId, role: t.role, source: t.source, last7, last30 })
      .from(t)
      .where(inWindow("play"))
      .groupBy(t.videoId, t.role, t.source)
      .orderBy(desc(last30)),
    db.select({ routePattern: t.routePattern, last7, last30 }).from(t).where(inWindow("open")).groupBy(t.routePattern).orderBy(desc(last30)).limit(HELP_REPORT_PAGE_LIMIT),
    db
      .select({ routePattern: t.routePattern, last7, last30 })
      .from(t)
      .where(and(inWindow("open"), eq(t.matched, 0)))
      .groupBy(t.routePattern)
      .orderBy(desc(last30))
      .limit(HELP_REPORT_PAGE_LIMIT),
    db
      .select({ id: schools.id, name: schools.name })
      .from(t)
      .innerJoin(schools, eq(schools.id, t.schoolId))
      .where(since30)
      .groupBy(schools.id, schools.name)
      .orderBy(schools.name),
  ]);
  return helpEventReportOutput.parse({ plays, opens, unmatched, schools: schoolRows });
}
