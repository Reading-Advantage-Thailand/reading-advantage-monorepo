import { eq, and, inArray, desc } from "drizzle-orm";
import {
  users, accounts, codecampModules, codecampLessons, codecampCurriculumAssignments,
  codecampUserProgress, codecampExerciseRepos, codecampPrReviews,
} from "@reading-advantage/db/schema";
import { hashPassword } from "@reading-advantage/auth";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { CODECAMP_APK_CURRICULUM_VERSION, isCodecampAPKCurriculumReleased } from "./curriculum-assignments.js";

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/**
 * Creates a new INTERN account with hashed password.
 */
export async function createInternAccount({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { username: string; name: string; password: string; githubUsername?: string | null };
}) {
  assertCan(user, "admin:dashboard", tenant);

  if (!PASSWORD_COMPLEXITY.test(input.password)) {
    throw new Error("Password must contain at least one uppercase letter, one lowercase letter, and one digit");
  }

  // INTERN accounts are global (schoolId=null) — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const lowerUsername = input.username.toLowerCase();
  const normalizedGithubUsername = (input.githubUsername || input.username).replace(/^@/, "").toLowerCase();

  const [existing] = await rawDb.select().from(users).where(eq(users.username, lowerUsername)).limit(1);
  if (existing) throw new Error("Username already exists");

  const [existingGithubUser] = await rawDb.select({ id: users.id }).from(users)
    .where(eq(users.githubUsername, normalizedGithubUsername)).limit(1);
  if (existingGithubUser) throw new Error("GitHub username already exists");

  const passwordHash = await hashPassword(input.password);
  const userId = crypto.randomUUID();

  const result = await rawDb.transaction(async (tx) => {
    const [created] = await tx.insert(users)
      .values({
        id: userId, username: lowerUsername, displayUsername: input.username, name: input.name,
        role: "INTERN", schoolId: null, xp: 0, level: 1, cefrLevel: "A1", githubUsername: normalizedGithubUsername,
      })
      .returning();

    await tx.insert(accounts).values({
      id: `${userId}_credential`, userId, providerId: "credential", password: passwordHash,
    });
    if (isCodecampAPKCurriculumReleased()) {
      await tx.insert(codecampCurriculumAssignments).values({ userId, curriculumVersion: CODECAMP_APK_CURRICULUM_VERSION });
    }

    return created;
  });

  return result;
}

/**
 * Updates the GitHub username for an intern account.
 */
export async function updateInternGithubUsername({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { userId: string; githubUsername: string | null };
}) {
  assertCan(user, "admin:dashboard", tenant);

  // INTERN accounts are global — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const [intern] = await rawDb.select({ id: users.id }).from(users)
    .where(and(eq(users.id, input.userId), eq(users.role, "INTERN"))).limit(1);
  if (!intern) throw new Error("Intern not found");

  const normalizedUsername = input.githubUsername ? input.githubUsername.replace(/^@/, "").toLowerCase() : null;
  const [result] = await rawDb.update(users).set({ githubUsername: normalizedUsername })
    .where(eq(users.id, input.userId)).returning();
  return result;
}

/**
 * Lists all intern accounts with progress summaries.
 */
export async function listInterns({
  db, user, tenant,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
}) {
  assertCan(user, "admin:dashboard", tenant);

  // INTERN accounts are global — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const interns = await rawDb.select().from(users).where(eq(users.role, "INTERN")).orderBy(users.createdAt);

  const modules = await rawDb.select().from(codecampModules).where(eq(codecampModules.status, "published")).orderBy(codecampModules.order);
  const moduleIds = modules.map((m) => m.id);
  const internIds = interns.map((i) => i.id);

  const allProgress = moduleIds.length > 0 && internIds.length > 0
    ? await rawDb.select().from(codecampUserProgress)
        .where(and(inArray(codecampUserProgress.moduleId, moduleIds), inArray(codecampUserProgress.userId, internIds)))
    : [];

  const allLessons = moduleIds.length > 0
    ? await rawDb.select().from(codecampLessons).where(inArray(codecampLessons.moduleId, moduleIds))
    : [];

  const allRepos = moduleIds.length > 0
    ? await rawDb.select().from(codecampExerciseRepos).where(inArray(codecampExerciseRepos.moduleId, moduleIds))
    : [];

  const allReviews = internIds.length > 0
    ? await rawDb.select().from(codecampPrReviews).where(inArray(codecampPrReviews.userId, internIds))
    : [];

  return interns.map((intern) => {
    const internProgress = allProgress.filter((p) => p.userId === intern.id);
    const completedModules = new Set(internProgress.filter((p) => p.status === "completed").map((p) => p.moduleId)).size;
    const quizScores = internProgress.filter((p) => { const l = allLessons.find((l) => l.id === p.lessonId); return p.score > 0 && l?.type === "quiz"; }).map((p) => p.score);
    const quizAverage = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

    const internReviews = allReviews.filter((r) => r.userId === intern.id);
    const pending = internReviews.filter((r) => r.reviewStatus === "pending").length;
    const approved = internReviews.filter((r) => r.reviewStatus === "approved").length;
    const latestPrReview = [...internReviews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

    const lastActive = internProgress.length > 0
      ? [...internProgress].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0].updatedAt
      : null;

    const totalLessons = allLessons.length;
    const completedLessons = internProgress.filter((p) => p.status === "completed").length;
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const currentModule = modules.find((mod) => {
      const moduleLessons = allLessons.filter((lesson) => lesson.moduleId === mod.id);
      if (moduleLessons.length === 0) return false;
      const completedForModule = internProgress.filter((p) => p.moduleId === mod.id && p.status === "completed").length;
      return completedForModule < moduleLessons.length;
    }) ?? null;
    const currentModuleHasReview = currentModule ? allRepos.some((repo) => repo.moduleId === currentModule.id) : false;
    const reviewExpectation = latestPrReview ? "review_received" as const : currentModuleHasReview ? "awaiting_pr" as const : "not_expected_yet" as const;

    return {
      userId: intern.id, name: intern.name, username: intern.username,
      overallProgress, completedModules, totalModules: modules.length, quizAverage,
      prReviewsPending: pending, prReviewsApproved: approved, reviewExpectation,
      latestPrReview: latestPrReview ? { prUrl: latestPrReview.prUrl, reviewStatus: latestPrReview.reviewStatus, llmReviewSummary: latestPrReview.llmReviewSummary, createdAt: latestPrReview.createdAt } : null,
      lastActiveAt: lastActive,
    };
  });
}

/**
 * Returns detailed progress for a single intern.
 */
export async function getInternProgress({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { userId: string };
}) {
  assertCan(user, "admin:dashboard", tenant);

  // INTERN accounts are global — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const [intern] = await rawDb.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!intern || intern.role !== "INTERN") throw new Error("Intern not found");

  const modules = await rawDb.select().from(codecampModules).where(eq(codecampModules.status, "published")).orderBy(codecampModules.order);
  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length > 0 ? await rawDb.select().from(codecampLessons).where(inArray(codecampLessons.moduleId, moduleIds)) : [];
  const progress = await rawDb.select().from(codecampUserProgress).where(eq(codecampUserProgress.userId, input.userId));
  const exerciseRepos = moduleIds.length > 0 ? await rawDb.select().from(codecampExerciseRepos).where(inArray(codecampExerciseRepos.moduleId, moduleIds)) : [];
  const reviews = await rawDb.select().from(codecampPrReviews).where(eq(codecampPrReviews.userId, input.userId)).orderBy(desc(codecampPrReviews.createdAt));

  const moduleBreakdown = modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;
    const avgScore = modProgress.length > 0 ? Math.round(modProgress.reduce((s, p) => s + p.score, 0) / modProgress.length) : 0;
    const moduleRepos = exerciseRepos.filter((repo) => repo.moduleId === mod.id);
    const moduleRepoIds = new Set(moduleRepos.map((repo) => repo.id));
    const latestModuleReview = reviews.filter((review) => moduleRepoIds.has(review.exerciseRepoId)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

    return {
      moduleId: mod.id, title: mod.title, completed, totalLessons: modLessons.length, avgScore,
      reviewExpected: moduleRepos.length > 0, reviewReceived: latestModuleReview !== null,
      latestPrUrl: latestModuleReview?.prUrl ?? null, latestPrReviewStatus: latestModuleReview?.reviewStatus ?? null,
    };
  });

  return {
    userId: intern.id, name: intern.name, username: intern.username, githubUsername: intern.githubUsername ?? null,
    moduleBreakdown,
    quizScores: progress.filter((p) => { const l = lessons.find((l) => l.id === p.lessonId); return p.score > 0 && l?.type === "quiz"; })
      .map((p) => ({ lessonId: p.lessonId, lessonTitle: lessons.find((l) => l.id === p.lessonId)?.title ?? "Lesson", score: p.score })),
    prReviews: reviews,
  };
}
