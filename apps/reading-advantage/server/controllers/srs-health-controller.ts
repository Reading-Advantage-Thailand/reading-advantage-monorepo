/**
 * SRS Health Metrics Controller
 * 
 * Provides comprehensive SRS health analytics with RBAC enforcement:
 * - Student-level flashcard health metrics
 * - Class-level aggregations for teachers
 * - School-level rollups for administrators
 * - Overload detection and intervention recommendations
 * - Quick-action suggestions for catching up on reviews
 */

import { NextResponse } from 'next/server';
import { ExtendedNextRequest } from './auth-controller';
import {
  getStudentSRSHealth,
  getClassSRSHealth,
  getSchoolSRSHealth,
  getAtRiskStudents,
  refreshSRSHealthMetrics,
  getSchoolOverloadThresholds,
  SRSHealthMetrics,
  ClassSRSHealthMetrics,
  SchoolSRSHealthMetrics,
  SuggestedAction,
  OverloadThresholds,
} from '@/server/services/metrics/srs-health-service';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface SRSHealthResponse {
  scope: 'student' | 'class' | 'school';
  timeframe: string;
  
  // Student-level data (when scope=student)
  student?: SRSHealthMetrics;
  
  // Class-level data (when scope=class)
  class?: ClassSRSHealthMetrics;
  
  // School-level data (when scope=school)
  school?: SchoolSRSHealthMetrics;
  
  // Risk analysis
  atRiskStudents?: Array<{
    userId: string;
    email: string;
    totalOverdue: number;
    daysSinceLastPractice: number;
    riskScore: number;
    primaryConcern: string;
  }>;
  
  // Quick-action suggestions
  quickActions?: QuickActionSuggestion[];
  
  // Summary statistics
  summary: {
    totalStudents: number;
    studentsAtRisk: number;
    totalReviewsNeeded: number;
    overallHealthStatus: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
    primaryRecommendation: string;
  };
  
  // Metadata
  overloadThresholds: OverloadThresholds;
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

export interface QuickActionSuggestion {
  id: string;
  type: 'review_session' | 'reduce_load' | 'teacher_alert' | 'batch_reminder';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
  targetUsers?: string[];
  actionUrl?: string;
  isIdempotent: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check RBAC permissions for SRS metrics access
 */
async function checkSRSAccess(
  userId: string,
  userRole: Role,
  studentId?: string,
  classroomId?: string,
  schoolId?: string
): Promise<{ hasAccess: boolean; scopedSchoolId?: string; scopedClassroomId?: string; scopedStudentId?: string }> {
  // System admins have full access
  if (userRole === Role.SYSTEM || userRole === Role.ADMIN) {
    return { hasAccess: true };
  }
  
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
    return { hasAccess: false };
  }
  
  // Students can only access their own data
  if (userRole === Role.STUDENT || userRole === Role.USER) {
    if (studentId && studentId !== userId) {
      return { hasAccess: false };
    }
    
    return { 
      hasAccess: true, 
      scopedStudentId: userId,
      scopedSchoolId: user.schoolId || undefined 
    };
  }
  
  // Teachers can access their school and classes
  if (userRole === Role.TEACHER) {
    const teacherClassroomIds = user.teacherClassrooms.map(tc => tc.classroomId);
    
    // If specific student requested, verify they're in teacher's class
    if (studentId) {
      const studentInClass = await prisma.classroomStudent.findFirst({
        where: {
          studentId,
          classroomId: { in: teacherClassroomIds }
        }
      });
      
      if (!studentInClass) {
        return { hasAccess: false };
      }
      
      return { 
        hasAccess: true, 
        scopedStudentId: studentId,
        scopedSchoolId: user.schoolId || undefined 
      };
    }
    
    // If specific classroom requested, verify teacher has access
    if (classroomId) {
      if (!teacherClassroomIds.includes(classroomId)) {
        return { hasAccess: false };
      }
      
      return { 
        hasAccess: true, 
        scopedClassroomId: classroomId,
        scopedSchoolId: user.schoolId || undefined 
      };
    }
    
    // School-level access only if teacher belongs to that school
    if (schoolId) {
      if (user.schoolId !== schoolId) {
        return { hasAccess: false };
      }
      
      return { 
        hasAccess: true, 
        scopedSchoolId: schoolId 
      };
    }
    
    // Default to teacher's school
    return { 
      hasAccess: true, 
      scopedSchoolId: user.schoolId || undefined 
    };
  }
  
  return { hasAccess: false };
}

/**
 * Generate quick-action suggestions based on health data
 */
function generateQuickActions(
  scope: 'student' | 'class' | 'school',
  healthData: any,
  atRiskStudents: any[]
): QuickActionSuggestion[] {
  const actions: QuickActionSuggestion[] = [];
  
  if (scope === 'student' && healthData.student) {
    const student = healthData.student;
    
    if (student.hasCriticalBacklog) {
      actions.push({
        id: `review-critical-${student.userId}`,
        type: 'review_session',
        title: 'Start Emergency Review Session',
        description: `Clear ${student.totalOverdue} overdue cards immediately`,
        priority: 'critical',
        estimatedImpact: 'Prevents further backlog accumulation',
        actionUrl: `/student/flashcards?filter=overdue&limit=25`,
        isIdempotent: true,
      });
    } else if (student.isOverloaded) {
      actions.push({
        id: `review-session-${student.userId}`,
        type: 'review_session',
        title: 'Start Review Session',
        description: `Review ${Math.min(student.totalDueForReview, 25)} cards`,
        priority: 'high',
        estimatedImpact: 'Reduces review backlog',
        actionUrl: `/student/flashcards?filter=due&limit=25`,
        isIdempotent: true,
      });
      
      actions.push({
        id: `reduce-load-${student.userId}`,
        type: 'reduce_load',
        title: 'Pause New Cards',
        description: 'Focus on existing cards until caught up',
        priority: 'medium',
        estimatedImpact: 'Prevents overload from worsening',
        isIdempotent: true,
      });
    }
  }
  
  if (scope === 'class' && healthData.class) {
    const classData = healthData.class;
    
    if (classData.studentsNeedingIntervention > 0) {
      actions.push({
        id: `teacher-alert-${classData.classroomId}`,
        type: 'teacher_alert',
        title: 'Review At-Risk Students',
        description: `${classData.studentsNeedingIntervention} students need intervention`,
        priority: 'high',
        estimatedImpact: 'Identifies students needing support',
        targetUsers: atRiskStudents.map(s => s.userId),
        isIdempotent: false,
      });
    }
    
    if (classData.inactiveRate > 30) {
      actions.push({
        id: `batch-reminder-${classData.classroomId}`,
        type: 'batch_reminder',
        title: 'Send Practice Reminders',
        description: `${classData.inactiveStudents} inactive students`,
        priority: 'medium',
        estimatedImpact: 'Encourages regular practice',
        isIdempotent: true,
      });
    }
  }
  
  if (scope === 'school' && healthData.school) {
    const schoolData = healthData.school;
    
    if (schoolData.atRiskClasses > 0) {
      actions.push({
        id: `admin-alert-${schoolData.schoolId}`,
        type: 'teacher_alert',
        title: 'Review At-Risk Classes',
        description: `${schoolData.atRiskClasses} classes need administrative attention`,
        priority: 'high',
        estimatedImpact: 'Identifies classes needing support',
        isIdempotent: false,
      });
    }
    
    if (schoolData.schoolInactiveRate > 40) {
      actions.push({
        id: `school-engagement-${schoolData.schoolId}`,
        type: 'batch_reminder',
        title: 'School-wide Engagement Initiative',
        description: 'High inactive rate suggests need for engagement campaign',
        priority: 'medium',
        estimatedImpact: 'Improves overall engagement',
        isIdempotent: true,
      });
    }
  }
  
  return actions;
}

/**
 * Calculate overall health status
 */
function calculateOverallHealthStatus(
  scope: 'student' | 'class' | 'school',
  healthData: any
): 'critical' | 'poor' | 'fair' | 'good' | 'excellent' {
  if (scope === 'student' && healthData.student) {
    const s = healthData.student;
    if (s.hasCriticalBacklog) return 'critical';
    if (s.isOverloaded || s.hasHighLapseRate) return 'poor';
    if (s.isInactive || s.overallMasteryPct < 30) return 'fair';
    if (s.overallMasteryPct > 80 && s.totalOverdue === 0) return 'excellent';
    return 'good';
  }
  
  if (scope === 'class' && healthData.class) {
    const c = healthData.class;
    if (c.classHealthStatus === 'at_risk') return 'critical';
    if (c.classHealthStatus === 'struggling') return 'poor';
    if (c.classHealthStatus === 'low_engagement') return 'fair';
    if (c.classHealthStatus === 'excelling') return 'excellent';
    return 'good';
  }
  
  if (scope === 'school' && healthData.school) {
    const s = healthData.school;
    if (s.schoolHealthStatus === 'critical') return 'critical';
    if (s.schoolHealthStatus === 'underperforming' || s.schoolHealthStatus === 'disengaged') return 'poor';
    if (s.schoolOverloadRate > 30 || s.schoolInactiveRate > 50) return 'fair';
    if (s.schoolHealthStatus === 'high_performing') return 'excellent';
    return 'good';
  }
  
  return 'fair';
}

/**
 * Generate primary recommendation
 */
function generatePrimaryRecommendation(
  scope: 'student' | 'class' | 'school',
  healthData: any,
  overallStatus: string
): string {
  if (overallStatus === 'critical') {
    return scope === 'student' 
      ? 'Immediate action required: Clear overdue cards before they accumulate further'
      : 'Urgent intervention needed: Multiple students require immediate support';
  }
  
  if (overallStatus === 'poor') {
    return scope === 'student'
      ? 'Focus on daily review sessions to catch up on backlog'
      : 'Implement targeted support for struggling students';
  }
  
  if (overallStatus === 'fair') {
    return scope === 'student'
      ? 'Maintain regular practice schedule to improve consistency'
      : 'Monitor progress and provide encouragement to inactive students';
  }
  
  if (overallStatus === 'excellent') {
    return scope === 'student'
      ? 'Excellent progress! Consider introducing new challenging material'
      : 'Outstanding performance! Share successful strategies with other classes';
  }
  
  return 'Continue current practice patterns while monitoring for potential issues';
}

// ============================================================================
// Main Controller Function
// ============================================================================

/**
 * SRS Health Metrics API
 * 
 * Supports multiple scopes with RBAC enforcement:
 * - Individual student health analysis
 * - Class-level health aggregations for teachers
 * - School-level health rollups for administrators
 * - At-risk student identification with intervention suggestions
 */
export async function getSRSHealthMetrics(req: ExtendedNextRequest) {
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
    
    // Query parameters
    const studentId = searchParams.get('studentId');
    const classroomId = searchParams.get('classroomId');
    const schoolId = searchParams.get('schoolId');
    const timeframe = searchParams.get('timeframe') || '30d';
    const includeAtRisk = searchParams.get('includeAtRisk') === 'true';
    const includeQuickActions = searchParams.get('includeQuickActions') !== 'false'; // Default true
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    
    // Determine scope
    let scope: 'student' | 'class' | 'school' = 'school';
    if (studentId) scope = 'student';
    else if (classroomId) scope = 'class';
    else if (schoolId) scope = 'school';

    // Check RBAC permissions
    const accessCheck = await checkSRSAccess(
      session.user.id,
      session.user.role as Role,
      studentId || undefined,
      classroomId || undefined,
      schoolId || undefined
    );
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Use scoped IDs from access check
    const effectiveStudentId = accessCheck.scopedStudentId || studentId;
    const effectiveClassroomId = accessCheck.scopedClassroomId || classroomId;
    const effectiveSchoolId = accessCheck.scopedSchoolId || schoolId;

    let response: SRSHealthResponse;
    let healthData: any = {};

    // Handle different scopes
    if (scope === 'student' && effectiveStudentId) {
      // Individual student analysis
      const studentHealth = await getStudentSRSHealth(effectiveStudentId);
      if (!studentHealth) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Student not found or no SRS data' },
          { status: 404 }
        );
      }
      
      healthData.student = studentHealth;
      
      const overallStatus = calculateOverallHealthStatus('student', healthData);
      const quickActions = includeQuickActions ? generateQuickActions('student', healthData, []) : [];
      
      response = {
        scope: 'student',
        timeframe,
        student: studentHealth,
        quickActions,
        summary: {
          totalStudents: 1,
          studentsAtRisk: (studentHealth.isOverloaded || studentHealth.hasCriticalBacklog || studentHealth.isInactive) ? 1 : 0,
          totalReviewsNeeded: studentHealth.totalDueForReview,
          overallHealthStatus: overallStatus,
          primaryRecommendation: generatePrimaryRecommendation('student', healthData, overallStatus),
        },
        overloadThresholds: await getSchoolOverloadThresholds(effectiveSchoolId || ''),
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        }
      };
      
    } else if (scope === 'class' && effectiveClassroomId) {
      // Class-level metrics
      const classHealth = await getClassSRSHealth(effectiveClassroomId);
      if (!classHealth) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Class not found or no SRS data' },
          { status: 404 }
        );
      }
      
      healthData.class = classHealth;
      
      // Get at-risk students if requested
      let atRiskStudents: any[] = [];
      if (includeAtRisk) {
        atRiskStudents = await getAtRiskStudents(effectiveClassroomId, undefined, limit);
      }
      
      const overallStatus = calculateOverallHealthStatus('class', healthData);
      const quickActions = includeQuickActions ? generateQuickActions('class', healthData, atRiskStudents) : [];
      
      response = {
        scope: 'class',
        timeframe,
        class: classHealth,
        atRiskStudents: includeAtRisk ? atRiskStudents : undefined,
        quickActions,
        summary: {
          totalStudents: classHealth.totalStudents,
          studentsAtRisk: classHealth.studentsNeedingIntervention,
          totalReviewsNeeded: classHealth.summary.totalReviewsNeeded,
          overallHealthStatus: overallStatus,
          primaryRecommendation: generatePrimaryRecommendation('class', healthData, overallStatus),
        },
        overloadThresholds: await getSchoolOverloadThresholds(effectiveSchoolId || ''),
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        }
      };
      
    } else if (scope === 'school' && effectiveSchoolId) {
      // School-level metrics
      const schoolHealth = await getSchoolSRSHealth(effectiveSchoolId);
      if (!schoolHealth) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'School not found or no SRS data' },
          { status: 404 }
        );
      }
      
      healthData.school = schoolHealth;
      
      // Get at-risk students if requested (school-wide)
      let atRiskStudents: any[] = [];
      if (includeAtRisk) {
        atRiskStudents = await getAtRiskStudents(undefined, effectiveSchoolId, limit);
      }
      
      const overallStatus = calculateOverallHealthStatus('school', healthData);
      const quickActions = includeQuickActions ? generateQuickActions('school', healthData, atRiskStudents) : [];
      
      response = {
        scope: 'school',
        timeframe,
        school: schoolHealth,
        atRiskStudents: includeAtRisk ? atRiskStudents : undefined,
        quickActions,
        summary: {
          totalStudents: schoolHealth.totalStudents,
          studentsAtRisk: schoolHealth.overloadedStudents + schoolHealth.criticalBacklogStudents,
          totalReviewsNeeded: Math.round(schoolHealth.schoolAvgDuePerStudent * schoolHealth.totalStudents),
          overallHealthStatus: overallStatus,
          primaryRecommendation: generatePrimaryRecommendation('school', healthData, overallStatus),
        },
        overloadThresholds: await getSchoolOverloadThresholds(effectiveSchoolId),
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        }
      };
      
    } else {
      return NextResponse.json(
        { code: 'BAD_REQUEST', message: 'Invalid scope or missing required parameters' },
        { status: 400 }
      );
    }

    const duration = Date.now() - startTime;

    console.log(`[SRSHealth] ${scope} metrics - ${duration}ms`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
        'X-Response-Time': `${duration}ms`,
      },
    });
    
  } catch (error) {
    console.error('[SRSHealth] Error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch SRS health metrics',
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
 * Refresh SRS health materialized views (admin only)
 */
export async function refreshSRSHealthViews(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session?.user?.id) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Only admins can refresh views
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.SYSTEM) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      );
    }

    await refreshSRSHealthMetrics();

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        message: 'SRS health metrics refreshed successfully',
        duration: `${duration}ms`,
      },
      {
        headers: {
          'X-Response-Time': `${duration}ms`,
        },
      }
    );
    
  } catch (error) {
    console.error('[SRSHealth] Refresh error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh SRS health metrics',
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