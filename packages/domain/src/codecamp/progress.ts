import { eq, sql, desc } from "drizzle-orm";
import {
  codecampLessons, codecampUserProgress, codecampChatConversations,
} from "@reading-advantage/db/schema";
import { PORTFOLIO_PROJECTS } from "@reading-advantage/db/seed";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { getModulesWithProgress } from "./modules.js";

/**
 * Updates or inserts user progress while preserving completed status.
 */
export async function updateUserProgress({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { lessonId: string; status?: "not_started" | "in_progress" | "completed"; score?: number };
}) {
  assertCan(user, "codecamp:submit", tenant);
  const rawDb = "unscoped" in db ? (db as TenantDB).unscoped("codecamp tables have no schoolId") : db;

  const [lesson] = await rawDb.select().from(codecampLessons)
    .where(eq(codecampLessons.id, input.lessonId)).limit(1);
  if (!lesson) throw new Error("Lesson not found");

  const now = new Date();
  const nowIso = now.toISOString();

  const [result] = await rawDb.insert(codecampUserProgress)
    .values({
      userId: user.id, moduleId: lesson.moduleId, lessonId: input.lessonId,
      status: input.status ?? "not_started", score: input.score ?? 0,
      completedAt: input.status === "completed" ? now : null, updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [codecampUserProgress.userId, codecampUserProgress.lessonId],
      set: {
        status: input.status !== undefined
          ? sql`CASE WHEN ${codecampUserProgress.status} = 'completed' THEN ${codecampUserProgress.status} ELSE excluded.status END`
          : sql`${codecampUserProgress.status}`,
        score: input.score !== undefined ? input.score : sql`${codecampUserProgress.score}`,
        completedAt: input.status === "completed" ? sql`COALESCE(${codecampUserProgress.completedAt}, ${nowIso})` : sql`${codecampUserProgress.completedAt}`,
        updatedAt: now,
      },
    })
    .returning();

  return result;
}

const PORTFOLIO_BY_PHASE: Record<string, typeof PORTFOLIO_PROJECTS[number]> =
  Object.fromEntries(PORTFOLIO_PROJECTS.map((p) => [p.phase, p]));

const PHASE_METADATA: Record<string, { title: string; description: string; portfolioProject: string; portfolioProjectUrl: string }> = {
  A: { title: "Foundations", description: "Master the fundamentals of web development", portfolioProject: PORTFOLIO_BY_PHASE["A"]!.title, portfolioProjectUrl: PORTFOLIO_BY_PHASE["A"]!.repoUrl },
  B: { title: "Frameworks", description: "Build interactive applications with React and Next.js", portfolioProject: PORTFOLIO_BY_PHASE["B"]!.title, portfolioProjectUrl: PORTFOLIO_BY_PHASE["B"]!.repoUrl },
  C: { title: "Backend & Data", description: "Connect databases and build type-safe APIs", portfolioProject: PORTFOLIO_BY_PHASE["C"]!.title, portfolioProjectUrl: PORTFOLIO_BY_PHASE["C"]!.repoUrl },
  D: { title: "Production", description: "Ship production-ready applications to the cloud", portfolioProject: PORTFOLIO_BY_PHASE["D"]!.title, portfolioProjectUrl: PORTFOLIO_BY_PHASE["D"]!.repoUrl },
};

/**
 * Returns the user's dashboard with modules grouped by phase, overall stats, and recent conversations.
 */
export async function getUserDashboard({
  db, user, tenant,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);

  const modules = await getModulesWithProgress({ db, user, tenant });
  const totalLessons = modules.reduce((sum, m) => sum + m.lessonCount, 0);
  const completedLessons = modules.reduce((sum, m) => sum + m.completedLessons, 0);
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const phases: Record<string, { title: string; description: string; portfolioProject: string; portfolioProjectUrl: string; modules: typeof modules; completedLessons: number; totalLessons: number }> = {};

  for (const phase of ["A", "B", "C", "D"]) {
    const meta = PHASE_METADATA[phase]!;
    const phaseModules = modules.filter((m) => m.phase === phase);
    const phaseCompleted = phaseModules.reduce((sum, m) => sum + m.completedLessons, 0);
    const phaseTotal = phaseModules.reduce((sum, m) => sum + m.lessonCount, 0);
    phases[phase] = { ...meta, modules: phaseModules, completedLessons: phaseCompleted, totalLessons: phaseTotal };
  }

  const conversations = await db.select({ id: codecampChatConversations.id, title: codecampChatConversations.title, updatedAt: codecampChatConversations.updatedAt })
    .from(codecampChatConversations).where(eq(codecampChatConversations.userId, user.id))
    .orderBy(desc(codecampChatConversations.updatedAt)).limit(5);

  return { phases, totalLessons, completedLessons, overallProgress, recentConversations: conversations };
}
