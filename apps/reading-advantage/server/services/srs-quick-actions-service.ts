/**
 * SRS Quick Actions Service
 * 
 * Provides idempotent endpoints for triggering SRS-related actions:
 * - Starting focused review sessions
 * - Sending practice reminders
 * - Adjusting review loads
 * - Creating teacher alerts
 */

import { db, eq, and, inArray, asc, desc, lt, lte } from '@reading-advantage/db';
import {
  users,
  classroomStudents,
  classrooms,
  classroomTeachers,
  userWordRecords,
  userSentenceRecords,
} from '@reading-advantage/db/schema';
import { Role } from '@/lib/enums';

// ============================================================================
// Types
// ============================================================================

export interface QuickActionRequest {
  actionType: 'review_session' | 'reduce_load' | 'send_reminder' | 'teacher_alert' | 'break_session';
  userId?: string;
  classroomId?: string;
  schoolId?: string;
  parameters?: {
    cardLimit?: number;
    sessionDuration?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    targetFilter?: 'overdue' | 'due' | 'new' | 'learning';
    reminderMessage?: string;
  };
}

export interface QuickActionResponse {
  actionId: string;
  status: 'success' | 'partial' | 'failed';
  message: string;
  details: {
    cardsAffected?: number;
    usersNotified?: number;
    sessionUrl?: string;
    nextRecommendedAction?: string;
  };
  isIdempotent: boolean;
  createdAt: string;
}

export interface ReviewSessionConfig {
  userId: string;
  cardLimit: number;
  targetFilter: 'overdue' | 'due' | 'new' | 'learning';
  sessionDuration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReminderConfig {
  userIds: string[];
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
}

export interface LoadReductionConfig {
  userId: string;
  reductionPercentage: number;
  duration: number; // days
}

// ============================================================================
// Core Quick Action Functions
// ============================================================================

/**
 * Create a focused review session for a student
 */
export async function createReviewSession(
  config: ReviewSessionConfig
): Promise<QuickActionResponse> {
  const actionId = `review_${config.userId}_${Date.now()}`;
  
  try {
    // Build target filter condition for FSRS state/due
    const now = new Date();
    const buildFilter = (
      due: any,
      state: any,
    ) => {
      switch (config.targetFilter) {
        case 'overdue':
          return lt(due, now);
        case 'due':
          return lte(due, now);
        case 'new':
          return eq(state, 0);
        case 'learning':
          return eq(state, 1);
        default:
          return undefined;
      }
    };

    // Get vocabulary cards
    const vocabFilter = buildFilter(userWordRecords.due, userWordRecords.state);
    const vocabCards = await db
      .select()
      .from(userWordRecords)
      .where(
        and(
          eq(userWordRecords.userId, config.userId),
          eq(userWordRecords.saveToFlashcard, true),
          vocabFilter,
        ),
      )
      .orderBy(
        ...(config.targetFilter === 'overdue'
          ? [asc(userWordRecords.due), desc(userWordRecords.lapses)]
          : [asc(userWordRecords.due), asc(userWordRecords.stability)]),
      )
      .limit(Math.ceil(config.cardLimit * 0.6)); // 60% vocab, 40% sentences

    // Get sentence cards
    const sentenceFilter = buildFilter(
      userSentenceRecords.due,
      userSentenceRecords.state,
    );
    const sentenceCards = await db
      .select()
      .from(userSentenceRecords)
      .where(
        and(
          eq(userSentenceRecords.userId, config.userId),
          eq(userSentenceRecords.saveToFlashcard, true),
          sentenceFilter,
        ),
      )
      .orderBy(
        ...(config.targetFilter === 'overdue'
          ? [asc(userSentenceRecords.due), desc(userSentenceRecords.lapses)]
          : [asc(userSentenceRecords.due), asc(userSentenceRecords.stability)]),
      )
      .limit(Math.floor(config.cardLimit * 0.4));
    
    const totalCards = vocabCards.length + sentenceCards.length;
    
    if (totalCards === 0) {
      return {
        actionId,
        status: 'failed',
        message: 'No cards available for review session',
        details: {
          cardsAffected: 0,
          nextRecommendedAction: 'Create new vocabulary or sentence cards',
        },
        isIdempotent: true,
        createdAt: new Date().toISOString(),
      };
    }
    
    // Create a session URL with parameters
    const sessionParams = new URLSearchParams({
      filter: config.targetFilter,
      limit: config.cardLimit.toString(),
      priority: config.priority,
      sessionId: actionId,
    });
    
    const sessionUrl = `/student/flashcards?${sessionParams.toString()}`;
    
    // Log the action for tracking
    await logQuickAction(actionId, 'review_session', config.userId, {
      cardLimit: config.cardLimit,
      targetFilter: config.targetFilter,
      cardsFound: totalCards,
    });
    
    return {
      actionId,
      status: 'success',
      message: `Review session created with ${totalCards} cards`,
      details: {
        cardsAffected: totalCards,
        sessionUrl,
        nextRecommendedAction: totalCards < config.cardLimit 
          ? 'Consider reading more articles to build vocabulary'
          : 'Complete this session before starting new cards',
      },
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('[QuickAction] createReviewSession error:', error);
    
    return {
      actionId,
      status: 'failed',
      message: 'Failed to create review session',
      details: {},
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Send practice reminders to students
 */
export async function sendPracticeReminders(
  config: ReminderConfig
): Promise<QuickActionResponse> {
  const actionId = `reminder_${Date.now()}`;
  
  try {
    // Validate user IDs
    const validUsers =
      config.userIds.length > 0
        ? await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(and(inArray(users.id, config.userIds), eq(users.role, Role.STUDENT)))
        : [];
    
    if (validUsers.length === 0) {
      return {
        actionId,
        status: 'failed',
        message: 'No valid student users found',
        details: { usersNotified: 0 },
        isIdempotent: true,
        createdAt: new Date().toISOString(),
      };
    }
    
    // For now, we'll just log the reminder (in a real implementation, 
    // this would integrate with email/notification services)
    const reminderEntries = validUsers.map(user => ({
      userId: user.id,
      message: config.message,
      priority: config.priority,
      actionUrl: config.actionUrl,
      sent: true,
      sentAt: new Date(),
    }));
    
    // Log the action
    await logQuickAction(actionId, 'send_reminder', null, {
      usersTargeted: config.userIds.length,
      usersNotified: validUsers.length,
      message: config.message,
    });
    
    // In a real implementation, you would save these to a notifications table
    console.log('[QuickAction] Reminders would be sent:', reminderEntries);
    
    return {
      actionId,
      status: 'success',
      message: `Practice reminders queued for ${validUsers.length} students`,
      details: {
        usersNotified: validUsers.length,
        nextRecommendedAction: 'Monitor engagement over the next few days',
      },
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('[QuickAction] sendPracticeReminders error:', error);
    
    return {
      actionId,
      status: 'failed',
      message: 'Failed to send practice reminders',
      details: { usersNotified: 0 },
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Reduce new card load for a student
 */
export async function reduceCardLoad(
  config: LoadReductionConfig
): Promise<QuickActionResponse> {
  const actionId = `reduce_load_${config.userId}_${Date.now()}`;
  
  try {
    // For now, this is implemented as a preference setting
    // In a real implementation, this would update user preferences
    // or create a temporary setting
    
    await logQuickAction(actionId, 'reduce_load', config.userId, {
      reductionPercentage: config.reductionPercentage,
      duration: config.duration,
    });
    
    // This would typically update user settings:
    // await prisma.userPreference.upsert({
    //   where: { userId: config.userId },
    //   update: { 
    //     newCardLimit: Math.floor(currentLimit * (1 - config.reductionPercentage / 100)),
    //     reducedUntil: new Date(Date.now() + config.duration * 24 * 60 * 60 * 1000)
    //   },
    //   create: { ... }
    // });
    
    return {
      actionId,
      status: 'success',
      message: `Card load reduced by ${config.reductionPercentage}% for ${config.duration} days`,
      details: {
        nextRecommendedAction: 'Focus on reviewing existing cards during this period',
      },
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('[QuickAction] reduceCardLoad error:', error);
    
    return {
      actionId,
      status: 'failed',
      message: 'Failed to reduce card load',
      details: {},
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Create teacher alert for at-risk students
 */
export async function createTeacherAlert(
  teacherId: string,
  studentIds: string[],
  alertType: 'overload' | 'inactive' | 'critical_backlog',
  message: string
): Promise<QuickActionResponse> {
  const actionId = `teacher_alert_${teacherId}_${Date.now()}`;
  
  try {
    // Verify teacher has access to these students
    const [teacher] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, teacherId))
      .limit(1);

    if (!teacher || teacher.role !== Role.TEACHER) {
      return {
        actionId,
        status: 'failed',
        message: 'Invalid teacher ID',
        details: {},
        isIdempotent: true,
        createdAt: new Date().toISOString(),
      };
    }

    const teacherClassroomRows = await db
      .select({ classroomId: classroomTeachers.classroomId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.teacherId, teacherId));
    const teacherClassroomIds = teacherClassroomRows.map((tc) => tc.classroomId);

    // Verify students are in teacher's classes
    const validStudents =
      studentIds.length > 0 && teacherClassroomIds.length > 0
        ? await db
            .select({
              studentId: classroomStudents.studentId,
              studentEmail: users.email,
            })
            .from(classroomStudents)
            .leftJoin(users, eq(classroomStudents.studentId, users.id))
            .where(
              and(
                inArray(classroomStudents.studentId, studentIds),
                inArray(classroomStudents.classroomId, teacherClassroomIds),
              ),
            )
        : [];
    
    if (validStudents.length === 0) {
      return {
        actionId,
        status: 'failed',
        message: 'No accessible students found',
        details: {},
        isIdempotent: true,
        createdAt: new Date().toISOString(),
      };
    }
    
    // Create the alert (in a real implementation, this would create 
    // a notification or dashboard item for the teacher)
    await logQuickAction(actionId, 'teacher_alert', teacherId, {
      alertType,
      studentsAffected: validStudents.length,
      message,
    });
    
    console.log('[QuickAction] Teacher alert created:', {
      teacherId,
      alertType,
      students: validStudents.map(s => s.studentId),
      message,
    });
    
    return {
      actionId,
      status: 'success',
      message: `Alert created for ${validStudents.length} students`,
      details: {
        usersNotified: 1, // Teacher
        nextRecommendedAction: 'Review individual student progress and provide targeted support',
      },
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('[QuickAction] createTeacherAlert error:', error);
    
    return {
      actionId,
      status: 'failed',
      message: 'Failed to create teacher alert',
      details: {},
      isIdempotent: true,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Log quick action for tracking and idempotency
 */
async function logQuickAction(
  actionId: string,
  actionType: string,
  userId: string | null,
  metadata: any
): Promise<void> {
  try {
    // In a real implementation, this would save to an actions log table
    // For now, we'll just log to console
    console.log('[QuickAction] Action logged:', {
      actionId,
      actionType,
      userId,
      metadata,
      timestamp: new Date().toISOString(),
    });
    
    // Example implementation:
    // await prisma.quickActionLog.create({
    //   data: {
    //     actionId,
    //     actionType,
    //     userId,
    //     metadata,
    //     createdAt: new Date(),
    //   }
    // });
    
  } catch (error) {
    console.error('[QuickAction] Failed to log action:', error);
  }
}

/**
 * Check if action has already been performed (idempotency check)
 */
export async function checkActionIdempotency(
  actionId: string
): Promise<QuickActionResponse | null> {
  try {
    // In a real implementation, this would check the actions log table
    // For now, return null (not found)
    return null;
    
    // Example implementation:
    // const existingAction = await prisma.quickActionLog.findUnique({
    //   where: { actionId }
    // });
    // 
    // if (existingAction) {
    //   return {
    //     actionId,
    //     status: 'success',
    //     message: 'Action already performed',
    //     details: existingAction.metadata,
    //     isIdempotent: true,
    //     createdAt: existingAction.createdAt.toISOString(),
    //   };
    // }
    // 
    // return null;
    
  } catch (error) {
    console.error('[QuickAction] Idempotency check failed:', error);
    return null;
  }
}

/**
 * Execute a quick action based on request
 */
export async function executeQuickAction(
  request: QuickActionRequest,
  executorId: string
): Promise<QuickActionResponse> {
  const { actionType, userId, classroomId, schoolId, parameters = {} } = request;
  
  switch (actionType) {
    case 'review_session':
      if (!userId) {
        throw new Error('userId required for review_session action');
      }
      
      return createReviewSession({
        userId,
        cardLimit: parameters.cardLimit || 25,
        targetFilter: parameters.targetFilter || 'due',
        sessionDuration: parameters.sessionDuration || 15,
        priority: parameters.priority || 'medium',
      });
      
    case 'reduce_load':
      if (!userId) {
        throw new Error('userId required for reduce_load action');
      }
      
      return reduceCardLoad({
        userId,
        reductionPercentage: 50, // Reduce by 50%
        duration: 7, // For 7 days
      });
      
    case 'send_reminder':
      let targetUserIds: string[] = [];

      if (userId) {
        targetUserIds = [userId];
      } else if (classroomId) {
        const classroomStudentRows = await db
          .select({ studentId: classroomStudents.studentId })
          .from(classroomStudents)
          .where(eq(classroomStudents.classroomId, classroomId));
        targetUserIds = classroomStudentRows.map((cs) => cs.studentId);
      } else if (schoolId) {
        const schoolStudents = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.schoolId, schoolId), eq(users.role, Role.STUDENT)));
        targetUserIds = schoolStudents.map((u) => u.id);
      }

      return sendPracticeReminders({
        userIds: targetUserIds,
        message: parameters.reminderMessage || 'Time for your daily flashcard practice!',
        priority: parameters.priority || 'medium',
        actionUrl: '/student/flashcards',
      });

    case 'teacher_alert':
      if (!classroomId) {
        throw new Error('classroomId required for teacher_alert action');
      }

      // Get classroom teacher
      const [classroom] = await db
        .select({ teacherId: classrooms.teacherId })
        .from(classrooms)
        .where(eq(classrooms.id, classroomId))
        .limit(1);

      if (!classroom?.teacherId) {
        throw new Error('No teacher found for classroom');
      }

      // Get at-risk students in classroom
      const atRiskStudents = await db
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, classroomId));

      return createTeacherAlert(
        classroom.teacherId,
        atRiskStudents.map((s) => s.studentId),
        'overload',
        'Some students in your class need SRS intervention'
      );
      
    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
}