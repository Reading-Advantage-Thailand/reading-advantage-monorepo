/**
 * Enhanced Assignment Metrics Controller
 * 
 * Provides assignment funnel analytics with predictive completion timelines,
 * RBAC enforcement, and drill-down capabilities for admins and teachers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExtendedNextRequest } from './auth-controller';
import {
  getAssignmentPrediction,
  getClassAssignmentMetrics,
  getSchoolAssignmentMetrics,
  getAtRiskStudents,
  getHistoricalCompletionTime,
  CompletionPrediction,
  ClassAssignmentMetrics,
  SchoolAssignmentMetrics,
  AtRiskStudent,
} from '@/server/services/metrics/assignment-prediction-service';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface AssignmentFunnelMetrics {
  assignmentId: string;
  title: string;
  dueDate?: string;
  assignedAt: string;
  
  // Funnel data
  totalStudents: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  
  // Percentages
  startedPct: number;
  completedPct: number;
  overduePct: number;
  
  // Timing
  medianCompletionHours: number | null;
  p80CompletionHours: number | null;
  eta80PctDays: number | null;
  
  // Risk assessment
  isAtRisk: boolean;
  riskFactors: string[];
  
  // Performance
  avgScore: number | null;
  
  // Context
  classVelocity: number;
  classEngagement: number;
  predictionConfidence: 'low' | 'medium' | 'high';
}

export interface AssignmentFunnelResponse {
  scope: 'assignment' | 'class' | 'school';
  timeframe: string;
  
  // Individual assignment data (when scope=assignment)
  assignment?: AssignmentFunnelMetrics;
  
  // Class-level data (when scope=class)
  classMetrics?: ClassAssignmentMetrics;
  
  // School-level data (when scope=school)
  schoolMetrics?: SchoolAssignmentMetrics;
  
  // Assignment list (for class/school scope)
  assignments?: AssignmentFunnelMetrics[];
  
  // Drill-down data
  atRiskStudents?: AtRiskStudent[];
  
  // Summary
  summary: {
    totalAssignments: number;
    overallCompletionRate: number;
    atRiskCount: number;
    avgCompletionTime: number | null;
  };
  
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check RBAC permissions for assignment metrics access
 */
async function checkAssignmentAccess(
  userId: string,
  userRole: Role,
  assignmentId?: string,
  classroomId?: string,
  schoolId?: string
): Promise<{ hasAccess: boolean; scopedSchoolId?: string; scopedClassroomId?: string }> {
  // System admins have full access
  if (userRole === Role.SYSTEM || userRole === Role.ADMIN) {
    return { hasAccess: true };
  }
  
  // Get user's school association
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      schoolId: true,
      teacherClassrooms: {
        select: { classroomId: true }
      }
    }
  });
  
  if (!user) {
    return { hasAccess: false };
  }
  
  // Teachers can only access their own school and classes
  if (userRole === Role.TEACHER) {
    const teacherClassroomIds = user.teacherClassrooms.map(tc => tc.classroomId);
    
    // If specific assignment requested, verify it belongs to teacher's class
    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { classroomId: true, classroom: { select: { schoolId: true } } }
      });
      
      if (!assignment || !teacherClassroomIds.includes(assignment.classroomId)) {
        return { hasAccess: false };
      }
      
      return { 
        hasAccess: true, 
        scopedSchoolId: assignment.classroom.schoolId || undefined,
        scopedClassroomId: assignment.classroomId 
      };
    }
    
    // If specific classroom requested, verify teacher has access
    if (classroomId) {
      if (!teacherClassroomIds.includes(classroomId)) {
        return { hasAccess: false };
      }
      
      return { 
        hasAccess: true, 
        scopedSchoolId: user.schoolId || undefined,
        scopedClassroomId: classroomId 
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
 * Convert prediction data to API format
 */
function formatAssignmentMetrics(
  prediction: CompletionPrediction,
  assignmentTitle: string,
  dueDate?: Date,
  assignedAt?: Date,
  avgScore?: number
): AssignmentFunnelMetrics {
  return {
    assignmentId: prediction.assignmentId,
    title: assignmentTitle,
    dueDate: dueDate?.toISOString(),
    assignedAt: assignedAt?.toISOString() || new Date().toISOString(),
    
    totalStudents: prediction.totalStudents,
    notStarted: prediction.notStartedCount,
    inProgress: prediction.inProgressCount,
    completed: prediction.completedCount,
    overdue: prediction.overdueCount,
    
    startedPct: prediction.totalStudents > 0 
      ? Math.round(((prediction.inProgressCount + prediction.completedCount) / prediction.totalStudents) * 100 * 10) / 10 
      : 0,
    completedPct: prediction.totalStudents > 0 
      ? Math.round((prediction.completedCount / prediction.totalStudents) * 100 * 10) / 10 
      : 0,
    overduePct: prediction.totalStudents > 0 
      ? Math.round((prediction.overdueCount / prediction.totalStudents) * 100 * 10) / 10 
      : 0,
    
    medianCompletionHours: prediction.medianCompletionHours,
    p80CompletionHours: prediction.p80CompletionHours,
    eta80PctDays: prediction.eta80PctDays,
    
    isAtRisk: prediction.isAtRisk,
    riskFactors: prediction.riskFactors,
    
    avgScore: avgScore || null,
    
    classVelocity: prediction.classVelocity,
    classEngagement: prediction.classEngagement,
    predictionConfidence: prediction.predictionConfidence,
  };
}

// ============================================================================
// Main Controller Function
// ============================================================================

/**
 * Enhanced Assignment Metrics API
 * 
 * Supports multiple scopes and drill-down capabilities:
 * - Individual assignment analysis
 * - Class-level funnel metrics
 * - School-level rollup metrics
 * - At-risk student identification
 */
export async function getEnhancedAssignmentMetrics(req: ExtendedNextRequest) {
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
    const assignmentId = searchParams.get('assignmentId');
    const classroomId = searchParams.get('classroomId'); 
    const schoolId = searchParams.get('schoolId');
    const timeframe = searchParams.get('timeframe') || '30d';
    const includeAtRisk = searchParams.get('includeAtRisk') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    
    // Determine scope
    let scope: 'assignment' | 'class' | 'school' = 'school';
    if (assignmentId) scope = 'assignment';
    else if (classroomId) scope = 'class';
    else if (schoolId) scope = 'school';

    // Check RBAC permissions
    const accessCheck = await checkAssignmentAccess(
      session.user.id, 
      session.user.role as Role,
      assignmentId || undefined,
      classroomId || undefined, 
      schoolId || undefined
    );
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Use scoped IDs from access check if available
    const effectiveSchoolId = accessCheck.scopedSchoolId || schoolId;
    const effectiveClassroomId = accessCheck.scopedClassroomId || classroomId;

    let response: AssignmentFunnelResponse;

    // Handle different scopes
    if (scope === 'assignment' && assignmentId) {
      // Single assignment analysis
      const prediction = await getAssignmentPrediction(assignmentId);
      if (!prediction) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Assignment not found' },
          { status: 404 }
        );
      }
      
      // Get assignment details
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { 
          title: true, 
          dueDate: true, 
          createdAt: true,
          studentAssignments: {
            where: { score: { not: null } },
            select: { score: true }
          }
        }
      });
      
      const avgScore = assignment?.studentAssignments.length 
        ? assignment.studentAssignments.reduce((sum, sa) => sum + (sa.score || 0), 0) / assignment.studentAssignments.length
        : null;
      
      const assignmentMetrics = formatAssignmentMetrics(
        prediction,
        assignment?.title || 'Untitled Assignment',
        assignment?.dueDate || undefined,
        assignment?.createdAt,
        avgScore || undefined
      );
      
      // Get at-risk students if requested
      let atRiskStudents: AtRiskStudent[] = [];
      if (includeAtRisk) {
        atRiskStudents = await getAtRiskStudents(undefined, undefined, assignmentId, limit);
      }
      
      response = {
        scope: 'assignment',
        timeframe,
        assignment: assignmentMetrics,
        atRiskStudents: includeAtRisk ? atRiskStudents : undefined,
        summary: {
          totalAssignments: 1,
          overallCompletionRate: assignmentMetrics.completedPct,
          atRiskCount: assignmentMetrics.isAtRisk ? 1 : 0,
          avgCompletionTime: assignmentMetrics.medianCompletionHours,
        },
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        }
      };
      
    } else if (scope === 'class' && effectiveClassroomId) {
      // Class-level metrics
      const classMetrics = await getClassAssignmentMetrics(effectiveClassroomId);
      if (!classMetrics) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'Class not found or no assignments' },
          { status: 404 }
        );
      }
      
      // Get assignment list for this class
      const assignments = await getClassAssignmentList(effectiveClassroomId, timeframe, limit);
      
      // Get at-risk students if requested
      let atRiskStudents: AtRiskStudent[] = [];
      if (includeAtRisk) {
        atRiskStudents = await getAtRiskStudents(effectiveClassroomId, undefined, undefined, limit);
      }
      
      response = {
        scope: 'class',
        timeframe,
        classMetrics,
        assignments,
        atRiskStudents: includeAtRisk ? atRiskStudents : undefined,
        summary: {
          totalAssignments: classMetrics.totalAssignments,
          overallCompletionRate: classMetrics.overallCompletionRate,
          atRiskCount: classMetrics.atRiskAssignments,
          avgCompletionTime: classMetrics.avgMedianCompletionHours,
        },
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        }
      };
      
    } else if (scope === 'school' && effectiveSchoolId) {
      // School-level metrics
      const schoolMetrics = await getSchoolAssignmentMetrics(effectiveSchoolId);
      if (!schoolMetrics) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: 'School not found or no assignments' },
          { status: 404 }
        );
      }
      
      // Get assignment list for this school
      const assignments = await getSchoolAssignmentList(effectiveSchoolId, timeframe, limit);
      
      // Get at-risk students if requested (school-wide)
      let atRiskStudents: AtRiskStudent[] = [];
      if (includeAtRisk) {
        atRiskStudents = await getAtRiskStudents(undefined, effectiveSchoolId, undefined, limit);
      }
      
      response = {
        scope: 'school',
        timeframe,
        schoolMetrics,
        assignments,
        atRiskStudents: includeAtRisk ? atRiskStudents : undefined,
        summary: {
          totalAssignments: schoolMetrics.totalAssignments,
          overallCompletionRate: schoolMetrics.schoolCompletionRate,
          atRiskCount: schoolMetrics.atRiskAssignments,
          avgCompletionTime: schoolMetrics.schoolAvgCompletionHours,
        },
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

    console.log(`[AssignmentFunnel] ${scope} metrics - ${duration}ms`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=240',
        'X-Response-Time': `${duration}ms`,
      },
    });
    
  } catch (error) {
    console.error('[AssignmentFunnel] Error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch assignment funnel metrics',
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

// ============================================================================
// Helper Query Functions
// ============================================================================

/**
 * Get assignment list for a class with funnel metrics
 */
async function getClassAssignmentList(
  classroomId: string, 
  timeframe: string, 
  limit: number
): Promise<AssignmentFunnelMetrics[]> {
  const daysAgo = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  const assignments = await prisma.assignment.findMany({
    where: {
      classroomId,
      createdAt: { gte: startDate }
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      createdAt: true,
      studentAssignments: {
        select: { score: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  const metrics: AssignmentFunnelMetrics[] = [];
  
  for (const assignment of assignments) {
    const prediction = await getAssignmentPrediction(assignment.id);
    if (prediction) {
      const avgScore = assignment.studentAssignments.length 
        ? assignment.studentAssignments.reduce((sum, sa) => sum + (sa.score || 0), 0) / assignment.studentAssignments.length
        : null;
        
      metrics.push(formatAssignmentMetrics(
        prediction,
        assignment.title || 'Untitled Assignment',
        assignment.dueDate || undefined,
        assignment.createdAt,
        avgScore || undefined
      ));
    }
  }
  
  return metrics;
}

/**
 * Get assignment list for a school with funnel metrics
 */
async function getSchoolAssignmentList(
  schoolId: string, 
  timeframe: string, 
  limit: number
): Promise<AssignmentFunnelMetrics[]> {
  const daysAgo = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  const assignments = await prisma.assignment.findMany({
    where: {
      classroom: { schoolId },
      createdAt: { gte: startDate }
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      createdAt: true,
      studentAssignments: {
        select: { score: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  const metrics: AssignmentFunnelMetrics[] = [];
  
  for (const assignment of assignments) {
    const prediction = await getAssignmentPrediction(assignment.id);
    if (prediction) {
      const avgScore = assignment.studentAssignments.length 
        ? assignment.studentAssignments.reduce((sum, sa) => sum + (sa.score || 0), 0) / assignment.studentAssignments.length
        : null;
        
      metrics.push(formatAssignmentMetrics(
        prediction,
        assignment.title || 'Untitled Assignment',
        assignment.dueDate || undefined,
        assignment.createdAt,
        avgScore || undefined
      ));
    }
  }
  
  return metrics;
}