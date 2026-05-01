import { NextRequest, NextResponse } from 'next/server';
import { executeQuickActionController, getAvailableQuickActions } from '@/server/controllers/srs-quick-actions-controller';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/v1/metrics/srs/actions
 * 
 * Execute SRS Quick Actions
 * 
 * Request Body:
 * {
 *   actionType: 'review_session' | 'reduce_load' | 'send_reminder' | 'teacher_alert' | 'break_session',
 *   userId?: string,
 *   classroomId?: string,
 *   schoolId?: string,
 *   actionId?: string, // For idempotency
 *   parameters?: {
 *     cardLimit?: number,
 *     targetFilter?: 'overdue' | 'due' | 'new' | 'learning',
 *     sessionDuration?: number,
 *     priority?: 'low' | 'medium' | 'high' | 'critical',
 *     reminderMessage?: string
 *   }
 * }
 * 
 * RBAC:
 * - Students: Can only perform review_session and reduce_load on themselves
 * - Teachers: Can perform all actions on their students/classes
 * - Admins: Can perform all actions on any scope
 * 
 * Idempotency:
 * - Include actionId in request body for idempotent operations
 * - Same actionId will return the same result without re-executing
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  // Add session to request
  (req as any).session = session;
  return executeQuickActionController(req);
}

/**
 * GET /api/v1/metrics/srs/actions
 * 
 * Get Available Quick Actions
 * 
 * Query Parameters:
 * - studentId?: string - Check actions available for specific student
 * - classroomId?: string - Check actions available for class
 * - schoolId?: string - Check actions available for school
 * 
 * Returns list of available actions based on user role and scope
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized - Please login to access this resource" },
      { status: 401 }
    );
  }
  
  // Add session to request
  (req as any).session = session;
  return getAvailableQuickActions(req);
}