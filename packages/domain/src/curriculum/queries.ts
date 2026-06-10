import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { scienceLessons } from "@reading-advantage/db/schema";

export { getLessonBySlug } from "./get-lesson-by-slug.js";

/**
 * Gets a single science lesson by ID.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the lessonId
 * @returns The science lesson if found, throws Error if not found
 */
export async function getScienceLesson({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { lessonId: string };
}) {
  assertCan(user, "curriculum:read", tenant);

  const [lesson] = await db
    .select()
    .from(scienceLessons)
    .where(eq(scienceLessons.id, input.lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  return lesson;
}

/**
 * Lists science lessons, optionally filtered by grade level.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing optional gradeLevel filter
 * @returns Array of science lessons
 */
export async function listScienceLessons({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { gradeLevel?: number };
}) {
  assertCan(user, "curriculum:read", tenant);

  const query = db.select().from(scienceLessons);

  if (input.gradeLevel !== undefined) {
    return query.where(eq(scienceLessons.gradeLevel, input.gradeLevel));
  }

  return query;
}
