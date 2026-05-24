/**
 * API Route: /api/classes
 * Handles class creation and listing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  count,
  db,
  desc,
  eq,
  exists,
  inArray,
} from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonStandards,
  scienceLessons,
  scienceStandards,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';
import { ZodError } from 'zod';

import { getCurrentSession } from '@/lib/auth/session';
import { createClassSchema } from '@/lib/validations/class';
import { generateUniqueJoinCode } from '@/lib/utils/generateJoinCode';

/**
 * POST /api/classes
 * Create a new class with auto-generated join code and curriculum units
 *
 * Required role: TEACHER or ADMIN
 * Body: { name, gradeLevel, standardsAlignment }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication and authorization
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only teachers and admins can create classes' },
        { status: 403 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validatedData = createClassSchema.parse(body);

    // 3. Create class with curriculum units in a transaction
    const result = await db.transaction(async (tx) => {
      // Generate unique join code (uses the tx so the SELECT sees this txn's view)
      const joinCode = await generateUniqueJoinCode(tx);

      // Create the class
      const [newClass] = await tx
        .insert(scienceClasses)
        .values({
          name: validatedData.name,
          gradeLevel: validatedData.gradeLevel,
          standardsAlignment: validatedData.standardsAlignment,
          joinCode,
          teacherId: session.user.id,
        })
        .returning();

      // Find curriculum template lessons for this grade and alignment.
      // Prisma: lessons where standards.some(framework = X). Drizzle: SELECT lessons
      // EXISTS (SELECT 1 FROM lesson_standards JOIN standards ON ... WHERE
      // lessons.id = lesson_standards.lesson_id AND standards.framework = X).
      const templateLessons = await tx
        .select({ id: scienceLessons.id })
        .from(scienceLessons)
        .where(
          and(
            eq(scienceLessons.gradeLevel, validatedData.gradeLevel),
            exists(
              tx
                .select({ one: scienceLessonStandards.lessonId })
                .from(scienceLessonStandards)
                .innerJoin(
                  scienceStandards,
                  eq(scienceStandards.id, scienceLessonStandards.standardId)
                )
                .where(
                  and(
                    eq(scienceLessonStandards.lessonId, scienceLessons.id),
                    eq(scienceStandards.framework, validatedData.standardsAlignment)
                  )
                )
            )
          )
        )
        .orderBy(scienceLessons.order);

      // Group lessons into units (for now, create one unit with all lessons)
      // In the future, this could be more sophisticated based on lesson metadata
      if (templateLessons.length > 0) {
        const [unit] = await tx
          .insert(scienceCurriculumUnits)
          .values({
            slug: `unit-1-intro-science-${newClass.id.slice(-8)}`,
            title: `Unit 1: Introduction to Science & Living Things`,
            description:
              'Explore what science is and learn about living things and their characteristics.',
            framework: validatedData.standardsAlignment,
            gradeLevel: validatedData.gradeLevel,
            order: 1,
            classId: newClass.id,
          })
          .returning();

        await tx.insert(scienceUnitLessons).values(
          templateLessons.map((lesson) => ({
            unitId: unit.id,
            lessonId: lesson.id,
          }))
        );
      }

      // No students just-created; studentCount is 0 in the same vein as the prior
      // Prisma `_count.students` after creation.
      return {
        ...newClass,
        studentCount: 0,
      };
    });

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          gradeLevel: result.gradeLevel,
          standardsAlignment: result.standardsAlignment,
          joinCode: result.joinCode,
          studentCount: result.studentCount,
          createdAt: result.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create class error:', error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle join code collision (should be rare)
    if (error instanceof Error && error.message.includes('join code')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate unique join code. Please try again.',
        },
        { status: 409 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the class' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/classes
 * List all classes for the authenticated teacher
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication and authorization
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only teachers and admins can list classes' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // 3. Fetch classes with pagination + total
    const teacherId = session.user.id;
    const [classes, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(scienceClasses)
        .where(eq(scienceClasses.teacherId, teacherId))
        .orderBy(desc(scienceClasses.createdAt))
        .offset(skip)
        .limit(limit),
      db
        .select({ value: count() })
        .from(scienceClasses)
        .where(eq(scienceClasses.teacherId, teacherId)),
    ]);

    // 4. Per-class student count via a single grouped query.
    const classIds = classes.map((c) => c.id);
    const studentCounts = classIds.length
      ? await db
          .select({
            classId: scienceClassStudents.classId,
            value: count(),
          })
          .from(scienceClassStudents)
          .where(inArray(scienceClassStudents.classId, classIds))
          .groupBy(scienceClassStudents.classId)
      : [];
    const countByClass = new Map(
      studentCounts.map((row) => [row.classId, Number(row.value)])
    );

    // 5. Format response
    const classesWithCount = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      gradeLevel: cls.gradeLevel,
      standardsAlignment: cls.standardsAlignment,
      joinCode: cls.joinCode,
      studentCount: countByClass.get(cls.id) ?? 0,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: classesWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List classes error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching classes' },
      { status: 500 }
    );
  }
}
