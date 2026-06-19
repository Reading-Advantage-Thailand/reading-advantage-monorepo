import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { listAssignments, createAssignment, deleteAssignment } from '@reading-advantage/domain/classes';
import { parseBody, ValidationError } from '@/lib/validations/api-helpers';
import { createAssignmentSchema, deleteAssignmentSchema } from '@/lib/validations/assignments';
import { runWithRequestContext } from '@/lib/observability/context';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/classes/{classId}/assignments
 * Returns all assignments for a class with lesson details.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: _request.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { classId } = await context.params;
    const result = await listAssignments({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId } });
    if ('error' in result) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    logger.error('assignments.fetch.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
  });
}

/**
 * POST /api/classes/{classId}/assignments
 * Create a new assignment for a class.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { classId } = await context.params;
    const body = await parseBody(request, createAssignmentSchema);
    const result = await createAssignment({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId, lessonId: body.lessonId, dueAt: body.dueAt } });
    if ('error' in result) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ success: false, ...error.toJSON() }, { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    logger.error('assignments.create.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
  });
}

/**
 * DELETE /api/classes/{classId}/assignments
 * Remove an assignment. Body: { assignmentId: string }
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'DELETE',
    startedAt: Date.now(),
  }, async () => {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { classId } = await context.params;
    const body = await parseBody(request, deleteAssignmentSchema);
    const result = await deleteAssignment({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId, assignmentId: body.assignmentId } });
    if ('error' in result) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ success: false, ...error.toJSON() }, { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    logger.error('assignments.delete.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
  });
}
