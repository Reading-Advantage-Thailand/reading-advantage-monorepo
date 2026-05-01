/**
 * SRS Quick Actions Controller
 * 
 * Provides idempotent endpoints for executing SRS-related quick actions:
 * - Creating focused review sessions
 * - Sending practice reminders
 * - Reducing card loads for overloaded students
 * - Creating teacher alerts for at-risk students
 */

import { NextResponse } from 'next/server';
import { ExtendedNextRequest } from './auth-controller';
import {
  executeQuickAction,
  checkActionIdempotency,
  QuickActionRequest,
  QuickActionResponse,
} from '@/server/services/srs-quick-actions-service';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check RBAC permissions for quick actions
 */
async function checkQuickActionAccess(
  userId: string,
  userRole: Role,
  actionRequest: QuickActionRequest
): Promise<{ hasAccess: boolean; reason?: string }> {
  // System admins have full access
  if (userRole === Role.SYSTEM || userRole === Role.ADMIN) {
    return { hasAccess: true };
  }
  
  const { actionType, userId: targetUserId, classroomId, schoolId } = actionRequest;
  
  // Get user's associations
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      schoolId: true,
      role: true,
      teacherClassrooms: {
        select: { classroomId: true }
      },
      studentClassrooms: {
        select: { classroomId: true }
      }
    }
  });
  
  if (!user) {
    return { hasAccess: false, reason: 'User not found' };
  }
  
  // Students can only perform actions on themselves
  if (userRole === Role.STUDENT || userRole === Role.USER) {
    if (targetUserId && targetUserId !== userId) {
      return { hasAccess: false, reason: 'Students can only perform actions on their own data' };
    }
    
    if (classroomId || schoolId) {
      return { hasAccess: false, reason: 'Students cannot perform actions at class or school level' };
    }
    
    // Students can only do review sessions and reduce their own load
    if (!['review_session', 'reduce_load'].includes(actionType)) {
      return { hasAccess: false, reason: 'Action type not allowed for students' };
    }
    
    return { hasAccess: true };
  }
  
  // Teachers can access their school and classes
  if (userRole === Role.TEACHER) {
    const teacherClassroomIds = user.teacherClassrooms.map(tc => tc.classroomId);
    
    // If targeting specific student, verify they're in teacher's class
    if (targetUserId) {
      const studentInClass = await prisma.classroomStudent.findFirst({
        where: {
          studentId: targetUserId,
          classroomId: { in: teacherClassroomIds }
        }
      });
      
      if (!studentInClass) {
        return { hasAccess: false, reason: 'Student not in teacher\'s classes' };
      }
    }
    
    // If targeting specific classroom, verify teacher has access
    if (classroomId) {
      if (!teacherClassroomIds.includes(classroomId)) {
        return { hasAccess: false, reason: 'Classroom not accessible to teacher' };
      }
    }
    
    // School-level access only if teacher belongs to that school
    if (schoolId) {
      if (user.schoolId !== schoolId) {
        return { hasAccess: false, reason: 'School not accessible to teacher' };
      }
    }
    
    return { hasAccess: true };
  }
  
  return { hasAccess: false, reason: 'Invalid user role' };
}

/**
 * Validate quick action request
 */
function validateQuickActionRequest(body: any): QuickActionRequest {
  const { actionType, userId, classroomId, schoolId, parameters } = body;
  
  if (!actionType || typeof actionType !== 'string') {
    throw new Error('actionType is required and must be a string');
  }
  
  const validActionTypes = ['review_session', 'reduce_load', 'send_reminder', 'teacher_alert', 'break_session'];
  if (!validActionTypes.includes(actionType)) {
    throw new Error(`Invalid actionType. Must be one of: ${validActionTypes.join(', ')}`);
  }
  
  // Validate scope parameters
  const scopeParams = [userId, classroomId, schoolId].filter(Boolean);
  if (scopeParams.length === 0) {
    throw new Error('At least one of userId, classroomId, or schoolId must be provided');
  }
  
  // Validate parameters if provided
  if (parameters && typeof parameters !== 'object') {
    throw new Error('parameters must be an object');
  }
  
  return {
    actionType: actionType as 'review_session' | 'reduce_load' | 'send_reminder' | 'teacher_alert' | 'break_session',
    userId: userId || undefined,
    classroomId: classroomId || undefined,
    schoolId: schoolId || undefined,
    parameters: parameters || {},
  };
}

// ============================================================================
// Main Controller Functions
// ============================================================================

/**
 * Execute a quick action
 * POST /api/v1/metrics/srs/actions
 */
export async function executeQuickActionController(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    let actionRequest: QuickActionRequest;
    try {
      actionRequest = validateQuickActionRequest(body);
    } catch (error) {
      return NextResponse.json(
        { 
          code: 'BAD_REQUEST', 
          message: 'Invalid action request',
          details: { error: error instanceof Error ? error.message : 'Unknown validation error' }
        },
        { status: 400 }
      );
    }

    // Check RBAC permissions
    const accessCheck = await checkQuickActionAccess(
      session.user.id,
      session.user.role as Role,
      actionRequest
    );
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { 
          code: 'FORBIDDEN', 
          message: 'Insufficient permissions',
          details: { reason: accessCheck.reason }
        },
        { status: 403 }
      );
    }

    // Check for idempotency if actionId provided
    const { actionId } = body;
    if (actionId) {
      const existingAction = await checkActionIdempotency(actionId);
      if (existingAction) {
        const duration = Date.now() - startTime;
        return NextResponse.json(existingAction, {
          headers: {
            'X-Response-Time': `${duration}ms`,
            'X-Idempotent': 'true',
          },
        });
      }
    }

    // Execute the action
    const result = await executeQuickAction(actionRequest, session.user.id);

    const duration = Date.now() - startTime;

    console.log(`[QuickAction] ${actionRequest.actionType} - ${duration}ms - ${result.status}`);

    return NextResponse.json(result, {
      status: result.status === 'success' ? 200 : result.status === 'partial' ? 206 : 400,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${duration}ms`,
      },
    });
    
  } catch (error) {
    console.error('[QuickAction] Error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to execute quick action',
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

/**
 * Get available quick actions for a user/scope
 * GET /api/v1/metrics/srs/actions
 */
export async function getAvailableQuickActions(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const classroomId = searchParams.get('classroomId');
    const schoolId = searchParams.get('schoolId');

    // Determine available actions based on user role and scope
    const userRole = session.user.role as Role;
    const availableActions: Array<{
      actionType: string;
      name: string;
      description: string;
      parameters: any;
      supportedScopes: string[];
    }> = [];

    // Review session - available to all users for themselves
    availableActions.push({
      actionType: 'review_session',
      name: 'Start Review Session',
      description: 'Create a focused flashcard review session',
      parameters: {
        cardLimit: { type: 'number', default: 25, min: 5, max: 50 },
        targetFilter: { 
          type: 'enum', 
          values: ['overdue', 'due', 'new', 'learning'], 
          default: 'due' 
        },
        sessionDuration: { type: 'number', default: 15, min: 5, max: 45 },
        priority: { 
          type: 'enum', 
          values: ['low', 'medium', 'high', 'critical'], 
          default: 'medium' 
        },
      },
      supportedScopes: ['student'],
    });

    // Load reduction - available to all users for themselves
    availableActions.push({
      actionType: 'reduce_load',
      name: 'Reduce Card Load',
      description: 'Temporarily reduce new card introduction rate',
      parameters: {},
      supportedScopes: ['student'],
    });

    // Reminders - available to teachers and admins
    if (userRole === Role.TEACHER || userRole === Role.ADMIN || userRole === Role.SYSTEM) {
      availableActions.push({
        actionType: 'send_reminder',
        name: 'Send Practice Reminder',
        description: 'Send practice reminders to students',
        parameters: {
          reminderMessage: { 
            type: 'string', 
            default: 'Time for your daily flashcard practice!' 
          },
          priority: { 
            type: 'enum', 
            values: ['low', 'medium', 'high'], 
            default: 'medium' 
          },
        },
        supportedScopes: ['student', 'class', 'school'],
      });
    }

    // Teacher alerts - available to teachers and admins
    if (userRole === Role.TEACHER || userRole === Role.ADMIN || userRole === Role.SYSTEM) {
      availableActions.push({
        actionType: 'teacher_alert',
        name: 'Create Teacher Alert',
        description: 'Alert teachers about at-risk students',
        parameters: {},
        supportedScopes: ['class'],
      });
    }

    const response = {
      availableActions,
      userRole,
      supportedScopes: studentId ? ['student'] : classroomId ? ['class'] : schoolId ? ['school'] : ['student', 'class', 'school'],
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-Response-Time': `${duration}ms`,
      },
    });
    
  } catch (error) {
    console.error('[QuickAction] getAvailableActions error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get available actions',
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}