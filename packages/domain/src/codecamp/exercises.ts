import { eq, and } from "drizzle-orm";
import { codecampExercises, codecampExerciseRepos, codecampModules } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { updateUserProgress } from "./progress.js";
import { hasCodecampAPKCurriculum } from "./curriculum-assignments.js";

/**
 * Persists an exercise code submission as a progress record marked in_progress.
 *
 * `codecamp_exercises` is REFERENTIAL; the lookup is scoped by `exerciseId`.
 */
export async function submitExerciseAttempt({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { exerciseId: string; code: string };
}) {
  assertCan(user, "codecamp:submit", tenant);

  const rawDb = db.unscoped("codecamp exercises scoped by exerciseId");

  const [exercise] = await rawDb.select().from(codecampExercises)
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
 *
 * `codecamp_exercise_repos` is REFERENTIAL; the listing is scoped
 * manually by `moduleId` when provided.
 */
export async function getExerciseRepos({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId?: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const rawDb = db.unscoped("codecamp exercise_repos scoped by moduleId");

  const conditions = [];
  if (input.moduleId) conditions.push(eq(codecampExerciseRepos.moduleId, input.moduleId));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const repos = await rawDb.select().from(codecampExerciseRepos).where(whereClause).orderBy(codecampExerciseRepos.order);
  if (input.moduleId || await hasCodecampAPKCurriculum(db, user.id)) return repos;
  const [apkModule] = await rawDb.select({ id: codecampModules.id }).from(codecampModules).where(eq(codecampModules.slug, "apk-game-creation")).limit(1);
  return apkModule ? repos.filter(({ moduleId }) => moduleId !== apkModule.id) : repos;
}

/**
 * Looks up a single exercise repo by its URL.
 *
 * `codecamp_exercise_repos` is REFERENTIAL; the lookup is scoped by `repoUrl`.
 */
export async function getExerciseRepoByUrl({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { repoUrl: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const rawDb = db.unscoped("codecamp exercise_repos scoped by repoUrl");

  const normalizedUrl = input.repoUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const [repo] = await rawDb.select().from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.repoUrl, normalizedUrl)).limit(1);
  return repo ?? null;
}

/**
 * Links a new exercise repository to a codecamp module.
 *
 * `codecamp_modules` and `codecamp_exercise_repos` are REFERENTIAL; the
 * moduleId FK and the repoUrl uniqueness check both run on the raw DB.
 */
export async function linkExerciseRepo({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { moduleId: string; repoUrl: string; description: string; order: number };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const rawDb = db.unscoped("codecamp modules/exercise_repos scoped by moduleId and repoUrl");

  const [module] = await rawDb.select({ id: codecampModules.id }).from(codecampModules)
    .where(eq(codecampModules.id, input.moduleId)).limit(1);
  if (!module) throw new Error(`Module not found: ${input.moduleId}`);

  const [existing] = await rawDb.select({ id: codecampExerciseRepos.id }).from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.repoUrl, input.repoUrl)).limit(1);
  if (existing) throw new Error("A repo with this URL already exists");

  const [result] = await rawDb.insert(codecampExerciseRepos)
    .values({ moduleId: input.moduleId, repoUrl: input.repoUrl, description: input.description, order: input.order })
    .returning();
  return result;
}
