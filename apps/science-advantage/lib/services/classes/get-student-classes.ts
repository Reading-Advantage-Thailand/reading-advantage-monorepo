import { desc, eq } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  users,
} from '@reading-advantage/db/schema';
import {
  assertCan,
  AuthError,
  type Tenant,
  type UserContext,
} from '@reading-advantage/auth';
import type { DB } from '@reading-advantage/db';

export type StudentEnrolledClassSummary = {
  id: string;
  name: string;
  gradeLevel: number;
  teacherId: string;
  teacherName: string;
  enrolledAt: string;
};

type GetStudentEnrolledClassesContext = {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { studentId: string };
};

/**
 * Phase 1 (ST-2) secured contract:
 *   getStudentEnrolledClasses({ db, user, tenant, input: { studentId } })
 *
 * Routes reads through the caller-provided TenantDB and enforces
 * `assertCan(user, 'student:read:own' | 'student:read', tenant)` plus a
 * resource-level schoolId match: a user may only query enrollments for
 * students in their own school.
 *
 * @kind read
 * @throws {AuthError} When the caller is not provided, lacks the
 *   `student:read:own` permission (students) or `student:read` permission
 *   (teachers/admins), or the student belongs to a different school.
 */
export async function getStudentEnrolledClasses(
  ctx: GetStudentEnrolledClassesContext,
): Promise<StudentEnrolledClassSummary[]> {
  if (!ctx.user) {
    throw new AuthError('Authenticated user required', 'UNAUTHORIZED');
  }
  const { db, user, tenant, input } = ctx;

  // Students may only query their own enrollments; teachers/admins/systems
  // may query any student in their tenant.
  if (user.role === 'STUDENT') {
    assertCan(user, 'student:read:own', tenant);
    if (input.studentId !== user.id) {
      throw new AuthError(
        'Students may only query their own enrolled classes',
        'FORBIDDEN',
      );
    }
  } else {
    assertCan(user, 'student:read', tenant);
  }

  // Resource-level check: the requested student must belong to the caller's
  // tenant. Without it a schoolA teacher could enumerate schoolB rosters
  // through the tenant-scoped join.
  const [targetStudent] = await db
    .select({ schoolId: users.schoolId })
    .from(users)
    .where(eq(users.id, input.studentId))
    .limit(1);

  if (targetStudent && targetStudent.schoolId !== user.schoolId) {
    throw new AuthError(
      `User ${user.id} cannot read enrollments for student ${input.studentId} from school ${targetStudent.schoolId}`,
      'FORBIDDEN',
    );
  }

  const rows = await db
    .select({
      id: scienceClasses.id,
      name: scienceClasses.name,
      gradeLevel: scienceClasses.gradeLevel,
      teacherId: scienceClasses.teacherId,
      teacherName: users.name,
      createdAt: scienceClasses.createdAt,
    })
    .from(scienceClassStudents)
    .innerJoin(
      scienceClasses,
      eq(scienceClasses.id, scienceClassStudents.classId),
    )
    .leftJoin(users, eq(users.id, scienceClasses.teacherId))
    .where(eq(scienceClassStudents.studentId, input.studentId))
    .orderBy(desc(scienceClasses.createdAt));

  return rows.map((cls) => ({
    id: cls.id,
    name: cls.name,
    gradeLevel: cls.gradeLevel,
    teacherId: cls.teacherId,
    teacherName: cls.teacherName ?? 'Teacher',
    enrolledAt: cls.createdAt.toISOString(),
  }));
}