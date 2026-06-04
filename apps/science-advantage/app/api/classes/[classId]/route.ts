import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getClassDetail, updateClass, archiveClass } from '@reading-advantage/domain/classes';

/**
 * GET /api/classes/{classId}
 * Returns class detail with curriculum and students.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { classId } = await context.params;
    const result = await getClassDetail({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId } });

    if (!result) return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    console.error('Error fetching class detail:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/classes/{classId}
 * Updates a class name.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { classId } = await context.params;
    const body = await request.json();

    const result = await updateClass({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      input: { classId, name: (body as { name?: string }).name },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error) {
      if (error.message === 'Class not found') return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
      if (error.message === 'Forbidden') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      if (error.message.includes('Name must be')) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      if (error.message === 'No valid fields to update') return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error updating class:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/classes/{classId}
 * Archives (deletes) a class.
 */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { classId } = await context.params;
    const result = await archiveClass({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId } });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error) {
      if (error.message === 'Class not found') return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
      if (error.message === 'Forbidden') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error deleting class:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
