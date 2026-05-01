/**
 * API Route: /api/classes
 * Handles class creation and listing
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth/session';
import { createClassSchema } from '@/lib/validations/class';
import { generateUniqueJoinCode } from '@/lib/utils/generateJoinCode';
import { ZodError } from 'zod';

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
    const result = await prisma.$transaction(async (tx) => {
      // Generate unique join code
      const joinCode = await generateUniqueJoinCode(tx);

      // Create the class
      const newClass = await tx.class.create({
        data: {
          name: validatedData.name,
          gradeLevel: validatedData.gradeLevel,
          standardsAlignment: validatedData.standardsAlignment,
          joinCode,
          teacherId: session.user.id,
        },
        include: {
          _count: {
            select: { students: true },
          },
        },
      });

      // Find curriculum template lessons for this grade and alignment
      const templateLessons = await tx.lesson.findMany({
        where: {
          gradeLevel: validatedData.gradeLevel,
          standards: {
            some: {
              framework: validatedData.standardsAlignment,
            },
          },
        },
        include: {
          standards: true,
        },
        orderBy: { order: 'asc' },
      });

      // Group lessons into units (for now, create one unit with all lessons)
      // In the future, this could be more sophisticated based on lesson metadata
      if (templateLessons.length > 0) {
        await tx.curriculumUnit.create({
          data: {
            slug: `unit-1-intro-science-${newClass.id.slice(-8)}`,
            title: `Unit 1: Introduction to Science & Living Things`,
            description: 'Explore what science is and learn about living things and their characteristics.',
            framework: validatedData.standardsAlignment,
            gradeLevel: validatedData.gradeLevel,
            order: 1,
            classId: newClass.id,
            lessons: {
              connect: templateLessons.map(lesson => ({ id: lesson.id })),
            },
          },
        });
      }

      return {
        ...newClass,
        studentCount: newClass._count.students,
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

    // 3. Fetch classes with pagination
    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where: { teacherId: session.user.id },
        include: {
          _count: {
            select: { students: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.class.count({
        where: { teacherId: session.user.id },
      }),
    ]);

    // 4. Format response
    const classesWithCount = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      gradeLevel: cls.gradeLevel,
      standardsAlignment: cls.standardsAlignment,
      joinCode: cls.joinCode,
      studentCount: cls._count.students,
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
