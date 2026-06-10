import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { scienceLessons } from "@reading-advantage/db/schema";

/**
 * Creates a new science lesson.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Lesson creation fields
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
      schoolId: tenant.schoolId!,
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
