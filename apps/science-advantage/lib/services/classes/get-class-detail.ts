import type { StandardsAlignment } from '@prisma/client';

import prisma from '@/lib/prisma';

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

export async function getClassDetailWithCurriculum(
  classId: string
): Promise<ClassDetailWithCurriculum | null> {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        select: { id: true },
      },
      _count: {
        select: { students: true },
      },
    },
  });

  if (!classRecord) {
    return null;
  }

  const curriculumUnits = await prisma.curriculumUnit.findMany({
    where: {
      classId,
      framework: classRecord.standardsAlignment,
      gradeLevel: classRecord.gradeLevel,
    },
    include: {
      lessons: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          order: true,
          gradeLevel: true,
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  const { _count, students, ...rest } = classRecord;

  return {
    ...rest,
    students,
    studentCount: _count.students,
    curriculumUnits: curriculumUnits.map(unit => ({
      id: unit.id,
      title: unit.title,
      description: unit.description,
      order: unit.order,
      lessons: unit.lessons.map(lesson => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        gradeLevel: lesson.gradeLevel,
      })),
    })),
  };
}
