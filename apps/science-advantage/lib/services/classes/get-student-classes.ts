import prisma from '@/lib/prisma';

export type StudentEnrolledClassSummary = {
  id: string;
  name: string;
  gradeLevel: number;
  teacherId: string;
  teacherName: string;
  enrolledAt: string;
};

/**
 * Fetch classes the given student is enrolled in.
 * Keeps selection narrow so API responses stay predictable and typed.
 */
export async function getStudentEnrolledClasses(
  studentId: string
): Promise<StudentEnrolledClassSummary[]> {
  const classes = await prisma.class.findMany({
    where: {
      students: {
        some: {
          id: studentId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      gradeLevel: true,
      teacherId: true,
      teacher: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return classes.map(cls => ({
    id: cls.id,
    name: cls.name,
    gradeLevel: cls.gradeLevel,
    teacherId: cls.teacherId,
    teacherName: cls.teacher?.name ?? 'Teacher',
    enrolledAt: cls.createdAt.toISOString(),
  }));
}
