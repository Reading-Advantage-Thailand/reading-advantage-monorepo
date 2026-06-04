import { and, asc, desc, eq, gt, inArray, like, or } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { scienceMasteryRuns, scienceStandardMastery, scienceStandards, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

const MASTERY_THRESHOLDS = { CRITICAL: 0.6, CAUTION: 0.8 } as const;
function getMasteryLabel(l: number) { return l < MASTERY_THRESHOLDS.CRITICAL ? "Needs Support" : l < MASTERY_THRESHOLDS.CAUTION ? "Developing" : "Proficient"; }
function getMasteryColorToken(l: number) { return l < MASTERY_THRESHOLDS.CRITICAL ? "critical" : l < MASTERY_THRESHOLDS.CAUTION ? "caution" : "strong"; }
function extractStrandCode(c: string) { const m = c.match(/^([A-Za-z]+\d+)/); return m ? m[1] : "Unknown"; }
function getStrandTitle(s: string) { return ({ Sc1: "Living Things", Sc2: "Life and Environment", Sc3: "Substances and Their Properties", Sc4: "Forces and Motion", Sc5: "Energy", Sc6: "Process of Change", Sc7: "Astronomy and Space", Sc8: "Nature of Science and Technology" } as Record<string, string>)[s] || s; }

/**
 * Gets a student's mastery profile with strand-level aggregation.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Query parameters (studentId, strand, limit, cursor, includeRecommendations)
 * @returns Mastery profile with strands and pagination
 */
export async function getStudentMasteryProfile({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { studentId: string; strand?: string; limit?: number; cursor?: string; includeRecommendations?: boolean } }) {
  if (input.studentId !== user.id) assertCan(user, "progress:read:all", tenant);
  const tenantDb = createTenantDB(db, tenant);
  const limit = input.limit ?? 100;

  const [student] = await tenantDb.select({ id: users.id, name: users.name, gradeLevel: users.gradeLevel }).from(users).where(eq(users.id, input.studentId)).limit(1);
  if (!student) throw new Error("Student not found");

  const [pendingRun] = await tenantDb.select({ attemptId: scienceMasteryRuns.attemptId }).from(scienceMasteryRuns).where(and(eq(scienceMasteryRuns.studentId, input.studentId), or(eq(scienceMasteryRuns.status, "PENDING"), eq(scienceMasteryRuns.status, "PROCESSING")))).orderBy(desc(scienceMasteryRuns.createdAt)).limit(1);
  const status = pendingRun ? "CALCULATING" : "READY";
  const retryAfterSeconds = pendingRun ? 10 : undefined;

  let strandStandardIds: string[] | null = null;
  if (input.strand) {
    const standardsInStrand = await tenantDb.select({ id: scienceStandards.id }).from(scienceStandards).where(like(scienceStandards.code, `${input.strand}%`));
    if (standardsInStrand.length === 0) return { status, generatedAt: new Date().toISOString(), ...(retryAfterSeconds && { retryAfterSeconds }), student: { id: student.id, name: student.name, grade: student.gradeLevel }, strands: [], nextCursor: null };
    strandStandardIds = standardsInStrand.map((s) => s.id);
  }

  const filters = [eq(scienceStandardMastery.studentId, input.studentId)];
  if (strandStandardIds) filters.push(inArray(scienceStandardMastery.standardId, strandStandardIds));
  if (input.cursor) filters.push(gt(scienceStandardMastery.id, input.cursor));

  const masteryRows = await tenantDb
    .select({ id: scienceStandardMastery.id, standardId: scienceStandardMastery.standardId, masteryLevel: scienceStandardMastery.masteryLevel, evidenceCount: scienceStandardMastery.evidenceCount, lastAssessedAt: scienceStandardMastery.lastAssessedAt, standardCode: scienceStandards.code, standardDescription: scienceStandards.description })
    .from(scienceStandardMastery).innerJoin(scienceStandards, eq(scienceStandards.id, scienceStandardMastery.standardId))
    .where(and(...filters)).orderBy(asc(scienceStandardMastery.id)).limit(limit + 1);

  const hasNextPage = masteryRows.length > limit;
  const records = hasNextPage ? masteryRows.slice(0, limit) : masteryRows;
  const nextCursor = hasNextPage ? records[records.length - 1]?.id ?? null : null;

  const strandMap = new Map<string, { code: string; title: string; standards: Array<{ standardId: string; code: string; titleEn: string; titleTh: string; masteryLevel: number; masteryLabel: string; masteryColorToken: string; evidenceCount: number; lastAssessedAt: string; aiAnnotation?: { recommended: boolean; traceId: string } }> }>();
  for (const record of records) {
    const strandCode = extractStrandCode(record.standardCode);
    const masteryLevel = Number(record.masteryLevel);
    if (!strandMap.has(strandCode)) strandMap.set(strandCode, { code: strandCode, title: getStrandTitle(strandCode), standards: [] });
    strandMap.get(strandCode)!.standards.push({
      standardId: record.standardId, code: record.standardCode, titleEn: record.standardDescription, titleTh: record.standardDescription,
      masteryLevel, masteryLabel: getMasteryLabel(masteryLevel), masteryColorToken: getMasteryColorToken(masteryLevel),
      evidenceCount: record.evidenceCount, lastAssessedAt: record.lastAssessedAt.toISOString(),
      ...(input.includeRecommendations && { aiAnnotation: { recommended: false, traceId: "" } }),
    });
  }

  const strands = Array.from(strandMap.values()).map((s) => ({ ...s, masteryAverage: Math.round((s.standards.reduce((sum, std) => sum + std.masteryLevel, 0) / (s.standards.length || 1)) * 100) / 100 })).sort((a, b) => a.masteryAverage - b.masteryAverage);

  return { status, generatedAt: new Date().toISOString(), ...(retryAfterSeconds && { retryAfterSeconds }), student: { id: student.id, name: student.name, grade: student.gradeLevel }, strands, nextCursor };
}
