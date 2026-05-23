import { and, asc, count, db, eq } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessons,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';

import type { StandardsAlignment } from '@/lib/enums';

type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  gradeLevel: number;
};

type CurriculumUnitSummary = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonSummary[];
};

export type ClassDetailWithCurriculum = {
  id: string;
  name: string;
  gradeLevel: number;
  standardsAlignment: StandardsAlignment;
  joinCode: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
  students: Array<{ id: string }>;
  studentCount: number;
  curriculumUnits: CurriculumUnitSummary[];
};

/**
 * @kind read
 * Fetches a science class with its enrolled students and ordered curriculum
 * (units filtered to the class's framework + grade level; lessons ordered
 * within each unit).
 */
export async function getClassDetailWithCurriculum(
  classId: string
): Promise<ClassDetailWithCurriculum | null> {
  const [classRecord] = await db
    .select()
    .from(scienceClasses)
    .where(eq(scienceClasses.id, classId))
    .limit(1);

  if (!classRecord) {
    return null;
  }

  const students = await db
    .select({ id: scienceClassStudents.studentId })
    .from(scienceClassStudents)
    .where(eq(scienceClassStudents.classId, classId));

  const [{ value: studentCount }] = await db
    .select({ value: count() })
    .from(scienceClassStudents)
    .where(eq(scienceClassStudents.classId, classId));

  const units = await db
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

  // For each unit, fetch its lessons (via the explicit unit_lessons junction)
  const curriculumUnits: CurriculumUnitSummary[] = await Promise.all(
    units.map(async (unit) => {
      const lessons = await db
        .select({
          id: scienceLessons.id,
          slug: scienceLessons.slug,
          title: scienceLessons.title,
          description: scienceLessons.description,
          order: scienceLessons.order,
          gradeLevel: scienceLessons.gradeLevel,
        })
        .from(scienceUnitLessons)
        .innerJoin(
          scienceLessons,
          eq(scienceLessons.id, scienceUnitLessons.lessonId)
        )
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
    standardsAlignment: classRecord.standardsAlignment as StandardsAlignment,
    joinCode: classRecord.joinCode,
    teacherId: classRecord.teacherId,
    createdAt: classRecord.createdAt,
    updatedAt: classRecord.updatedAt,
    students,
    studentCount,
    curriculumUnits,
  };
}
