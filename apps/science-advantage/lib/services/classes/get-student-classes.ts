import { db, desc, eq } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  users,
} from '@reading-advantage/db/schema';

export type StudentEnrolledClassSummary = {
  id: string;
  name: string;
  gradeLevel: number;
  teacherId: string;
  teacherName: string;
  enrolledAt: string;
};

/**
 * @kind read
 * Fetch classes the given student is enrolled in.
 * Keeps selection narrow so API responses stay predictable and typed.
 */
export async function getStudentEnrolledClasses(
  studentId: string
): Promise<StudentEnrolledClassSummary[]> {
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
      eq(scienceClasses.id, scienceClassStudents.classId)
    )
    .leftJoin(users, eq(users.id, scienceClasses.teacherId))
    .where(eq(scienceClassStudents.studentId, studentId))
    .orderBy(desc(scienceClasses.createdAt));

  return rows.map(cls => ({
    id: cls.id,
    name: cls.name,
    gradeLevel: cls.gradeLevel,
    teacherId: cls.teacherId,
    teacherName: cls.teacherName ?? 'Teacher',
    enrolledAt: cls.createdAt.toISOString(),
  }));
}
