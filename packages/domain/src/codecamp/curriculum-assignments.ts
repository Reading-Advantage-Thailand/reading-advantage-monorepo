import { codecampCurriculumAssignments, codecampModules } from "@reading-advantage/db/schema";
import { and, eq } from "drizzle-orm";
import type { TenantDB } from "../db-contract.js";

/** Current curriculum release assigned to newly enrolled Codecamp learners. */
export const CODECAMP_APK_CURRICULUM_VERSION = "codecamp.curriculum.v2-apk";

/**
 * Reports whether a learner is assigned the curriculum release containing Unit 20.
 * @param db Authenticated database boundary.
 * @param userId Learner account identity.
 * @returns Whether the explicit current-release assignment exists.
 */
export async function hasCodecampAPKCurriculum(db: TenantDB, userId: string): Promise<boolean> {
  const rawDb = db.unscoped("Codecamp curriculum assignments are learner-owned global rows");
  const [assignment] = await rawDb.select({ userId: codecampCurriculumAssignments.userId }).from(codecampCurriculumAssignments).where(and(eq(codecampCurriculumAssignments.userId, userId), eq(codecampCurriculumAssignments.curriculumVersion, CODECAMP_APK_CURRICULUM_VERSION))).limit(1);
  return assignment !== undefined;
}

/**
 * Fails closed when an unassigned legacy learner requests the APK module directly.
 * @param db Authenticated database boundary.
 * @param userId Learner account identity.
 * @param moduleId Requested module identity.
 * @returns Completion when the module is legacy-safe or explicitly assigned.
 * @throws When Unit 20 is requested without a current curriculum assignment.
 */
export async function assertCodecampModuleAssigned(db: TenantDB, userId: string, moduleId: string): Promise<void> {
  const rawDb = db.unscoped("Codecamp curriculum access resolves module release before learner assignment");
  const [module] = await rawDb.select({ slug: codecampModules.slug }).from(codecampModules).where(eq(codecampModules.id, moduleId)).limit(1);
  if (module?.slug === "apk-game-creation" && !await hasCodecampAPKCurriculum(db, userId)) throw new Error("Module not found");
}

/**
 * Filters Unit 20 from legacy cohorts while leaving the original sequence unchanged.
 * @param db Authenticated database boundary.
 * @param userId Learner account identity.
 * @param modules Published module response rows.
 * @returns Original modules plus Unit 20 only for explicitly assigned learners.
 */
export async function filterCodecampModulesForAssignment<T extends { slug: string }>(db: TenantDB, userId: string, modules: T[]): Promise<T[]> {
  if (await hasCodecampAPKCurriculum(db, userId)) return modules;
  return modules.filter(({ slug }) => slug !== "apk-game-creation");
}
