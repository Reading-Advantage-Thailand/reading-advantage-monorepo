import { and, asc, count, eq } from "drizzle-orm";
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessons,
  scienceUnitLessons,
} from "@reading-advantage/db/schema";
import { db } from "@reading-advantage/db";
import type { TenantDB } from "../db-contract.js";

/**
 * Fetches a science class with its enrolled students and ordered curriculum.
 * This is a pure data-fetching helper used by getClassDetail.
 * @param classId - The class ID to fetch
 * @param tenantDb - Optional TenantDB instance for tenant-scoped queries
 * @returns Class detail with curriculum units and students, or null if not found
 */
export async function getClassDetailWithCurriculum(classId: string, tenantDb?: TenantDB) {
  const scopedDb = tenantDb ?? db;
  const [classRecord] = await scopedDb
    .select()
    .from(scienceClasses)
    .where(eq(scienceClasses.id, classId))
    .limit(1);

  if (!classRecord) return null;

  const students = await scopedDb
    .select({ id: scienceClassStudents.studentId })
    .from(scienceClassStudents)
    .where(eq(scienceClassStudents.classId, classId));

  const [{ value: studentCount }] = await scopedDb
    .select({ value: count() })
    .from(scienceClassStudents)
    .where(eq(scienceClassStudents.classId, classId));

  const units = await scopedDb
    .select({
      id: scienceCurriculumUnits.id,
      title: scienceCurriculumUnits.title,
      description: scienceCurriculumUnits.description,
      order: scienceCurriculumUnits.order,
    })
    .from(scienceCurriculumUnits)
    .where(
      and(
        eq(scienceCurriculumUnits.classId, classId),
        eq(scienceCurriculumUnits.framework, classRecord.standardsAlignment),
        eq(scienceCurriculumUnits.gradeLevel, classRecord.gradeLevel)
      )
    )
    .orderBy(asc(scienceCurriculumUnits.order));

  const curriculumUnits = await Promise.all(
    units.map(async (unit) => {
      const lessons = await scopedDb
        .select({
          id: scienceLessons.id,
          slug: scienceLessons.slug,
          title: scienceLessons.title,
          description: scienceLessons.description,
          order: scienceLessons.order,
          gradeLevel: scienceLessons.gradeLevel,
        })
        .from(scienceUnitLessons)
        .innerJoin(scienceLessons, eq(scienceLessons.id, scienceUnitLessons.lessonId))
        .where(eq(scienceUnitLessons.unitId, unit.id))
        .orderBy(asc(scienceLessons.order));

      return {
        id: unit.id,
        title: unit.title,
        description: unit.description,
        order: unit.order,
        lessons,
      };
    })
  );

  return {
    id: classRecord.id,
    name: classRecord.name,
    gradeLevel: classRecord.gradeLevel,
    standardsAlignment: classRecord.standardsAlignment,
    joinCode: classRecord.joinCode,
    teacherId: classRecord.teacherId,
    createdAt: classRecord.createdAt,
    updatedAt: classRecord.updatedAt,
    students,
    studentCount,
    curriculumUnits,
  };
}
