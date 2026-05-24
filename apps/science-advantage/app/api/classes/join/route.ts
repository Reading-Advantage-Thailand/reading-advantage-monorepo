import { NextRequest, NextResponse } from 'next/server';
import { and, db, eq } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import { joinClassSchema } from '@/lib/validations/class';

/**
 * POST /api/classes/join
 * Allows a student to join a class by providing a join code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only students can join classes' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid join code format' },
        { status: 400 }
      );
    }

    const parseResult = joinClassSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid join code format' },
        { status: 400 }
      );
    }

    const { joinCode } = parseResult.data;
    const studentId = session.user.id;

    // Lookup class + teacher name in a single round-trip via LEFT JOIN.
    const [classRow] = await db
      .select({
        id: scienceClasses.id,
        name: scienceClasses.name,
        gradeLevel: scienceClasses.gradeLevel,
        teacherName: users.name,
      })
      .from(scienceClasses)
      .leftJoin(users, eq(users.id, scienceClasses.teacherId))
      .where(eq(scienceClasses.joinCode, joinCode))
      .limit(1);

    if (!classRow) {
      return NextResponse.json(
        { success: false, error: 'Join code not found' },
        { status: 404 }
      );
    }

    // Atomically check enrollment + insert. If a concurrent request races
    // ahead the unique PK (classId, studentId) on `science_class_students`
    // raises a 23505 (postgres-js error code; cause is the raw PgError); we
    // surface it as 409 to match the prior Prisma semantics.
    try {
      await db.transaction(async (tx) => {
        const existing = await tx
          .select({ classId: scienceClassStudents.classId })
          .from(scienceClassStudents)
          .where(
            and(
              eq(scienceClassStudents.classId, classRow.id),
              eq(scienceClassStudents.studentId, studentId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new AlreadyEnrolledError();
        }

        await tx
          .insert(scienceClassStudents)
          .values({ classId: classRow.id, studentId });
      });
    } catch (error) {
      if (error instanceof AlreadyEnrolledError) {
        return NextResponse.json(
          { success: false, error: 'Already enrolled in this class' },
          { status: 409 }
        );
      }
      // Race: the row was inserted by another request between our SELECT and
      // INSERT. Translate the unique-violation into the same 409.
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          { success: false, error: 'Already enrolled in this class' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        classEnrollment: {
          id: `${classRow.id}:${studentId}`,
          classId: classRow.id,
          className: classRow.name,
          gradeLevel: classRow.gradeLevel,
          teacherName: classRow.teacherName ?? 'Teacher',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Join class error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while joining the class',
      },
      { status: 500 }
    );
  }
}

class AlreadyEnrolledError extends Error {
  constructor() {
    super('ALREADY_ENROLLED');
    this.name = 'AlreadyEnrolledError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  // postgres-js surfaces SQLSTATE on `code` of the cause (the raw PgError).
  const candidates: unknown[] = [error];
  if (error && typeof error === 'object' && 'cause' in error) {
    candidates.push((error as { cause: unknown }).cause);
  }
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === 'object' &&
      'code' in candidate &&
      (candidate as { code: unknown }).code === '23505'
    ) {
      return true;
    }
  }
  return false;
}
