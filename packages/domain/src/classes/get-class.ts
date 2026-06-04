import { eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { scienceClasses } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { getClassDetailWithCurriculum } from "./get-class-detail-with-curriculum.js";

/**
 * Gets full class detail including curriculum units and enrolled students.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the classId
 * @returns Class detail with curriculum, or null if not found
 */
export async function getClassDetail({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string };
}) {
  assertCan(user, "class:read", tenant);

  const tenantDb = createTenantDB(db, tenant);
  const classDetail = await getClassDetailWithCurriculum(input.classId, tenantDb);
  if (!classDetail) return null;

  const isTeacherOwner = classDetail.teacherId === user.id;
  const isAdmin = user.role === "ADMIN" || user.role === "SYSTEM";
  const isEnrolledStudent = classDetail.students.some((s) => s.id === user.id);

  if (!isTeacherOwner && !isAdmin && !isEnrolledStudent) return null;

  return {
    success: true,
    data: {
      id: classDetail.id,
      name: classDetail.name,
      gradeLevel: classDetail.gradeLevel,
      standardsAlignment: classDetail.standardsAlignment,
      joinCode: classDetail.joinCode,
      studentCount: classDetail.studentCount,
      curriculumUnits: classDetail.curriculumUnits,
      createdAt: classDetail.createdAt.toISOString(),
      updatedAt: classDetail.updatedAt.toISOString(),
    },
  };
}
