import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { createClassSchema, type CreateClassInput } from '@/lib/validations/class';
import { AuthError } from '@reading-advantage/auth';
import { createScienceClass, listClassesWithCounts } from '@reading-advantage/domain/classes';
import { parseBody, parseQuery, ValidationError } from '@/lib/validations/api-helpers';
import { z } from 'zod';

const listClassesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * POST /api/classes
 * Create a new class with auto-generated join code and curriculum units.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const validatedData: CreateClassInput = await parseBody(request, createClassSchema);

    const result = await createScienceClass({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      input: validatedData,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, ...error.toJSON() },
        { status: 400 }
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({ field: err.path.join('.'), message: err.message })),
        },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('join code')) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique join code. Please try again.' },
        { status: 409 }
      );
    }
    console.error('Create class error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating the class' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/classes
 * List all classes for the authenticated teacher.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { page, limit } = parseQuery(request, listClassesQuerySchema);

    const result = await listClassesWithCounts({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      input: { page, limit },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, ...error.toJSON() }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    console.error('List classes error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching classes' },
      { status: 500 }
    );
  }
}
