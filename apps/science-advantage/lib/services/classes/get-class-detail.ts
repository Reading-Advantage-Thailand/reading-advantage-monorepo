import { and, asc, count, eq } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessons,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';
import {
  assertCan,
  AuthError,
  type Tenant,
  type UserContext,
} from '@reading-advantage/auth';
import type { DB } from '@reading-advantage/db';

import type { StandardsAlignment } from '@/lib/enums';

type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  titleThai: string | null;
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

type GetClassDetailContext = {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { classId: string };
};

/**
 * Phase 1 (ST-2) secured contract:
 *   getClassDetailWithCurriculum({ db, user, tenant, input: { classId } })
 *
 * Routes all reads through the caller-provided TenantDB and enforces
 * `assertCan(user, 'class:read', tenant)` plus a resource-level schoolId
 * match. Returns `null` when the class does not exist in the caller's tenant.
 *
 * @kind read
 * @throws {AuthError} When the caller is not provided, lacks `class:read`,
 *   or the class's `schoolId` does not match the caller's `schoolId`.
 */
export async function getClassDetailWithCurriculum(
  ctx: GetClassDetailContext,
): Promise<ClassDetailWithCurriculum | null> {
  if (!ctx.user) {
    throw new AuthError('Authenticated user required', 'UNAUTHORIZED');
  }
  const { db, user, tenant, input } = ctx;
  assertCan(user, 'class:read', tenant);

  const [classRecord] = await db
    .select()
    .from(scienceClasses)
    .where(eq(scienceClasses.id, input.classId))
    .limit(1);

  if (!classRecord) {
    return null;
  }

  if (classRecord.schoolId !== user.schoolId) {
    throw new AuthError(
      `User ${user.id} cannot read class ${input.classId} from school ${classRecord.schoolId}`,
      'FORBIDDEN',
    );
  }

  const students = await db
    .select({ id: scienceClassStudents.studentId })
    .from(scienceClassStudents)
    .where(eq(scienceClassStudents.classId, input.classId));

  const [{ value: studentCount }] = await db
    .select({ value: count() })
    .from(scienceClassStudents)
    .where(eq(scienceClassStudents.classId, input.classId));

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
        eq(scienceCurriculumUnits.classId, input.classId),
        eq(scienceCurriculumUnits.framework, classRecord.standardsAlignment),
        eq(scienceCurriculumUnits.gradeLevel, classRecord.gradeLevel),
      ),
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
          titleThai: scienceLessons.titleThai,
          description: scienceLessons.description,
          order: scienceLessons.order,
          gradeLevel: scienceLessons.gradeLevel,
        })
        .from(scienceUnitLessons)
        .innerJoin(
          scienceLessons,
          eq(scienceLessons.id, scienceUnitLessons.lessonId),
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
    }),
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