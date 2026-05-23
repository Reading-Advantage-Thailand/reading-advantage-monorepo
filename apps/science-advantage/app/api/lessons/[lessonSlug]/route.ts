import { NextRequest, NextResponse } from 'next/server';
import { and, db, eq, inArray } from '@reading-advantage/db';
import {
  scienceLessons,
  scienceStandards,
  scienceLessonStandards,
  scienceUnitLessons,
  scienceCurriculumUnits,
  scienceClasses,
  scienceClassStudents,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import { isValidLessonContent } from '@/lib/schemas/lesson-content.schema';

type LessonRouteContext = {
  params: Promise<{
    lessonSlug: string;
  }>;
};

/**
 * GET /api/lessons/{lessonSlug}
 * Returns lesson content with the standards it satisfies.
 *
 * Authentication: Required (must be teacher of, admin of, or enrolled in a class that uses the lesson)
 */
export async function GET(_request: NextRequest, context: LessonRouteContext) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { lessonSlug } = await context.params;

    const [lesson] = await db
      .select()
      .from(scienceLessons)
      .where(eq(scienceLessons.id, lessonSlug))
      .limit(1);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Standards attached to the lesson
    const standards = await db
      .select({
        id: scienceStandards.id,
        code: scienceStandards.code,
        description: scienceStandards.description,
        framework: scienceStandards.framework,
        gradeLevel: scienceStandards.gradeLevel,
      })
      .from(scienceLessonStandards)
      .innerJoin(
        scienceStandards,
        eq(scienceStandards.id, scienceLessonStandards.standardId)
      )
      .where(eq(scienceLessonStandards.lessonId, lesson.id));

    // Resolve all classes that contain this lesson (via unit → class)
    const classRows = await db
      .select({
        classId: scienceClasses.id,
        teacherId: scienceClasses.teacherId,
      })
      .from(scienceUnitLessons)
      .innerJoin(
        scienceCurriculumUnits,
        eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)
      )
      .innerJoin(
        scienceClasses,
        eq(scienceClasses.id, scienceCurriculumUnits.classId)
      )
      .where(eq(scienceUnitLessons.lessonId, lesson.id));

    const isAdmin = userRole === 'ADMIN' || userRole === 'SYSTEM';
    let hasAccess = isAdmin;

    if (!hasAccess && classRows.length > 0) {
      if (classRows.some((c) => c.teacherId === userId)) {
        hasAccess = true;
      } else {
        const classIds = classRows.map((c) => c.classId);
        const myEnrollments = await db
          .select({ classId: scienceClassStudents.classId })
          .from(scienceClassStudents)
          .where(
            and(
              eq(scienceClassStudents.studentId, userId),
              inArray(scienceClassStudents.classId, classIds)
            )
          )
          .limit(1);
        hasAccess = myEnrollments.length > 0;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Not enrolled in a class with this lesson' },
        { status: 403 }
      );
    }

    // Validate structured content if present
    const hasStructuredContent =
      lesson.structuredContent && isValidLessonContent(lesson.structuredContent);

    const responsePayload = {
      lesson: {
        id: lesson.id,
        slug: lesson.id, // TODO: Replace with dedicated slug when available
        title: lesson.title,
        titleThai: lesson.titleThai ?? lesson.title,
        content: lesson.content ?? '',
        contentThai: lesson.content ?? '',
        objectives: lesson.description ? [lesson.description] : [],
        objectivesThai: lesson.descriptionThai
          ? [lesson.descriptionThai]
          : lesson.description
            ? [lesson.description]
            : [],
        structuredContent: hasStructuredContent ? lesson.structuredContent : undefined,
        contentType: hasStructuredContent ? 'structured' : 'legacy',
        contentVersion: hasStructuredContent ? 1 : undefined,
      },
      standards: standards.map((standard) => ({
        id: standard.id,
        code: standard.code,
        description: standard.description,
        descriptionThai: standard.description, // TODO: Provide Thai translation when available
        framework: standard.framework,
        gradeLevel: standard.gradeLevel,
      })),
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch lesson:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the lesson' },
      { status: 500 }
    );
  }
}
