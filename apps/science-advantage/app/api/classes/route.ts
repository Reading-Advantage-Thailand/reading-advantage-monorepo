import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { createClassSchema } from '@/lib/validations/class';
import { AuthError } from '@reading-advantage/auth';
import { createScienceClass, listClassesWithCounts } from '@reading-advantage/domain/classes';

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

    const body = await request.json();
    const validatedData = createClassSchema.parse(body);

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listClassesWithCounts({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      input: { page, limit },
    });

    return NextResponse.json(result);
  } catch (error) {
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
