import { eq, and } from "drizzle-orm";
import { codecampExercises, codecampExerciseRepos, codecampModules } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { updateUserProgress } from "./progress.js";

/**
 * Persists an exercise code submission as a progress record marked in_progress.
 */
export async function submitExerciseAttempt({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { exerciseId: string; code: string };
}) {
  assertCan(user, "codecamp:submit", tenant);

  const [exercise] = await db.select().from(codecampExercises)
    .where(eq(codecampExercises.id, input.exerciseId)).limit(1);
  if (!exercise) throw new Error("Exercise not found");

  await updateUserProgress({ db, user, tenant, input: { lessonId: exercise.lessonId, status: "in_progress" } });

  return {
    exerciseId: input.exerciseId,
    passed: false,
    feedback: "Submitted for review.",
    hints: Array.isArray(exercise.hintsJson) ? (exercise.hintsJson as string[]) : [],
  };
}

/**
 * Lists exercise repositories, optionally filtered by moduleId.
 */
export async function getExerciseRepos({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId?: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const conditions = [];
  if (input.moduleId) conditions.push(eq(codecampExerciseRepos.moduleId, input.moduleId));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select().from(codecampExerciseRepos).where(whereClause).orderBy(codecampExerciseRepos.order);
}

/**
 * Looks up a single exercise repo by its URL.
 */
export async function getExerciseRepoByUrl({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { repoUrl: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const normalizedUrl = input.repoUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const [repo] = await db.select().from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.repoUrl, normalizedUrl)).limit(1);
  return repo ?? null;
}

/**
 * Links a new exercise repository to a codecamp module.
 */
export async function linkExerciseRepo({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId: string; repoUrl: string; description: string; order: number };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const [module] = await db.select({ id: codecampModules.id }).from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId)).limit(1);
  if (!module) throw new Error(`Module not found: ${input.moduleId}`);

  const [existing] = await db.select({ id: codecampExerciseRepos.id }).from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.repoUrl, input.repoUrl)).limit(1);
  if (existing) throw new Error("A repo with this URL already exists");

  const [result] = await db.insert(codecampExerciseRepos)
    .values({ moduleId: input.moduleId, repoUrl: input.repoUrl, description: input.description, order: input.order })
    .returning();
  return result;
}
