import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { scienceClasses, scienceClassStudents } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Lists classes for the authenticated teacher/admin with student counts and pagination.
 * Returns only classes owned by the authenticated user.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Pagination parameters
 * @returns Paginated list of classes with student counts
 */
export async function listClassesWithCounts({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { page: number; limit: number };
}) {
  assertCan(user, "class:list", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const skip = (input.page - 1) * input.limit;

  const [classes, [{ value: total }]] = await Promise.all([
    tenantDb
      .select()
      .from(scienceClasses)
      .where(eq(scienceClasses.teacherId, user.id))
      .orderBy(desc(scienceClasses.createdAt))
      .offset(skip)
      .limit(input.limit),
    tenantDb
      .select({ value: count() })
      .from(scienceClasses)
      .where(eq(scienceClasses.teacherId, user.id)),
  ]);

  const classIds = classes.map((c) => c.id);
  const studentCounts = classIds.length
    ? await tenantDb
        .select({ classId: scienceClassStudents.classId, value: count() })
        .from(scienceClassStudents)
        .where(inArray(scienceClassStudents.classId, classIds))
        .groupBy(scienceClassStudents.classId)
    : [];
  const countByClass = new Map(studentCounts.map((row) => [row.classId, Number(row.value)]));

  return {
    success: true,
    data: classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      gradeLevel: cls.gradeLevel,
      standardsAlignment: cls.standardsAlignment,
      joinCode: cls.joinCode,
      studentCount: countByClass.get(cls.id) ?? 0,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    })),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}
