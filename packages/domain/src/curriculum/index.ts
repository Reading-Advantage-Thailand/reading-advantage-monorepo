import { eq } from "drizzle-orm";
import { scienceLessons } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

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

/**
 * Creates a new science lesson.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Lesson creation fields (slug, title, gradeLevel, order, lessonType, description, structuredContent)
 * @returns The newly created science lesson
 */
export async function createScienceLesson({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: {
    slug: string;
    title: string;
    gradeLevel: number;
    order: number;
    lessonType: string;
    description?: string;
    structuredContent?: unknown;
  };
}) {
  assertCan(user, "curriculum:create", tenant);

  const [created] = await db
    .insert(scienceLessons)
    .values({
      slug: input.slug,
      title: input.title,
      gradeLevel: input.gradeLevel,
      order: input.order,
      lessonType: input.lessonType,
      description: input.description,
      structuredContent: input.structuredContent,
    })
    .returning();

  return created;
}
