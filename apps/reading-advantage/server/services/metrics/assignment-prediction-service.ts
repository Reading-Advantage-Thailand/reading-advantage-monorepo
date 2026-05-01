/**
 * Assignment Completion Prediction Service
 * 
 * Provides predictive analytics for assignment completion based on:
 * - Historical completion times
 * - Class velocity metrics
 * - Student engagement patterns
 * - Assignment complexity factors
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface CompletionPrediction {
  assignmentId: string;
  classroomId: string;
  schoolId: string;
  
  // Funnel metrics
  totalStudents: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  overdueCount: number;
  
  // Timing predictions
  medianCompletionHours: number | null;
  p80CompletionHours: number | null;
  eta80PctDays: number | null;
  
  // Risk assessment
  isAtRisk: boolean;
  riskFactors: string[];
  
  // Class context
  classVelocity: number;
  classEngagement: number;
  isLowSignal: boolean;
  
  // Confidence metrics
  predictionConfidence: 'low' | 'medium' | 'high';
  basedOnSamples: number;
}

export interface ClassAssignmentMetrics {
  classroomId: string;
  schoolId: string;
  classroomName: string;
  grade: number | null;
  
  totalAssignments: number;
  highCompletionAssignments: number;
  atRiskAssignments: number;
  staleAssignments: number;
  
  overallCompletionRate: number;
  avgMedianCompletionHours: number | null;
  avgEtaDays: number | null;
  classAvgScore: number | null;
  
  classVelocity: number;
  classEngagement: number;
  isLowSignal: boolean;
}

export interface SchoolAssignmentMetrics {
  schoolId: string;
  totalClasses: number;
  totalAssignments: number;
  
  schoolCompletionRate: number;
  schoolAvgCompletionHours: number | null;
  schoolP80EtaDays: number | null;
  
  atRiskAssignments: number;
  staleAssignments: number;
  classesWithAtRiskAssignments: number;
}

export interface AtRiskStudent {
  studentId: string;
  displayName: string;
  assignmentId: string;
  assignmentTitle: string;
  status: string;
  daysSinceAssigned: number;
  daysOverdue: number | null;
  riskScore: number;
}

// ============================================================================
// Core Prediction Functions
// ============================================================================

/**
 * Get assignment completion prediction using enhanced matview data
 */
export async function getAssignmentPrediction(
  assignmentId: string
): Promise<CompletionPrediction | null> {
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_assignment_funnel WHERE assignment_id = $1`,
    assignmentId
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const data = result[0];
  
  // Calculate risk factors
  const riskFactors: string[] = [];
  
  if (data.assignment_age_days > 14 && data.completed_pct < 50) {
    riskFactors.push('assignment_aging');
  }
  
  if (data.due_date && new Date(data.due_date) < new Date() && data.completed_pct < 80) {
    riskFactors.push('past_due_date');
  }
  
  if (data.class_engagement < 50) {
    riskFactors.push('low_class_engagement');
  }
  
  if (data.overdue_count > (data.total_students * 0.3)) {
    riskFactors.push('high_overdue_rate');
  }
  
  // Determine prediction confidence
  let predictionConfidence: 'low' | 'medium' | 'high' = 'low';
  let basedOnSamples = data.completed_count || 0;
  
  if (data.class_low_signal || basedOnSamples < 3) {
    predictionConfidence = 'low';
  } else if (basedOnSamples >= 10 && !data.class_low_signal) {
    predictionConfidence = 'high';
  } else {
    predictionConfidence = 'medium';
  }
  
  return {
    assignmentId: data.assignment_id,
    classroomId: data.classroom_id,
    schoolId: data.school_id,
    
    totalStudents: Number(data.total_students) || 0,
    completedCount: Number(data.completed_count) || 0,
    inProgressCount: Number(data.in_progress_count) || 0,
    notStartedCount: Number(data.not_started_count) || 0,
    overdueCount: Number(data.overdue_count) || 0,
    
    medianCompletionHours: data.median_completion_hours ? Number(data.median_completion_hours) : null,
    p80CompletionHours: data.p80_completion_hours ? Number(data.p80_completion_hours) : null,
    eta80PctDays: data.eta_80pct_days ? Number(data.eta_80pct_days) : null,
    
    isAtRisk: Boolean(data.is_at_risk),
    riskFactors,
    
    classVelocity: Number(data.class_velocity) || 0,
    classEngagement: Number(data.class_engagement) || 0,
    isLowSignal: Boolean(data.class_low_signal),
    
    predictionConfidence,
    basedOnSamples,
  };
}

/**
 * Get class-level assignment funnel metrics
 */
export async function getClassAssignmentMetrics(
  classroomId: string
): Promise<ClassAssignmentMetrics | null> {
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_class_assignment_funnel WHERE classroom_id = $1`,
    classroomId
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const data = result[0];
  
  return {
    classroomId: data.classroom_id,
    schoolId: data.school_id,
    classroomName: data.classroom_name,
    grade: data.grade ? Number(data.grade) : null,
    
    totalAssignments: Number(data.total_assignments) || 0,
    highCompletionAssignments: Number(data.high_completion_assignments) || 0,
    atRiskAssignments: Number(data.at_risk_assignments) || 0,
    staleAssignments: Number(data.stale_assignments) || 0,
    
    overallCompletionRate: Number(data.overall_completion_rate) || 0,
    avgMedianCompletionHours: data.avg_median_completion_hours ? Number(data.avg_median_completion_hours) : null,
    avgEtaDays: data.avg_eta_days ? Number(data.avg_eta_days) : null,
    classAvgScore: data.class_avg_score ? Number(data.class_avg_score) : null,
    
    classVelocity: Number(data.class_velocity) || 0,
    classEngagement: Number(data.class_engagement) || 0,
    isLowSignal: Boolean(data.class_low_signal),
  };
}

/**
 * Get school-level assignment funnel metrics
 */
export async function getSchoolAssignmentMetrics(
  schoolId: string
): Promise<SchoolAssignmentMetrics | null> {
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_school_assignment_funnel WHERE school_id = $1`,
    schoolId
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const data = result[0];
  
  return {
    schoolId: data.school_id,
    totalClasses: Number(data.total_classes) || 0,
    totalAssignments: Number(data.total_assignments) || 0,
    
    schoolCompletionRate: Number(data.school_completion_rate) || 0,
    schoolAvgCompletionHours: data.school_avg_completion_hours ? Number(data.school_avg_completion_hours) : null,
    schoolP80EtaDays: data.school_p80_eta_days ? Number(data.school_p80_eta_days) : null,
    
    atRiskAssignments: Number(data.at_risk_assignments) || 0,
    staleAssignments: Number(data.stale_assignments) || 0,
    classesWithAtRiskAssignments: Number(data.classes_with_at_risk_assignments) || 0,
  };
}

/**
 * Get at-risk students for drill-down analysis
 */
export async function getAtRiskStudents(
  classroomId?: string,
  schoolId?: string,
  assignmentId?: string,
  limit: number = 20
): Promise<AtRiskStudent[]> {
  let whereClause = '';
  const params: any[] = [];
  let paramIndex = 1;
  
  const conditions: string[] = [];
  
  if (assignmentId) {
    conditions.push(`a.id = $${paramIndex}`);
    params.push(assignmentId);
    paramIndex++;
  }
  
  if (classroomId) {
    conditions.push(`a.classroom_id = $${paramIndex}`);
    params.push(classroomId);
    paramIndex++;
  } else if (schoolId) {
    conditions.push(`c.school_id = $${paramIndex}`);
    params.push(schoolId);
    paramIndex++;
  }
  
  // Add risk conditions
  conditions.push(`(
    (a.due_date IS NOT NULL AND a.due_date < NOW() AND sa.status != 'COMPLETED') OR
    (EXTRACT(EPOCH FROM (NOW() - a."createdAt")) / (24 * 3600) > 7 AND sa.status = 'NOT_STARTED') OR
    (EXTRACT(EPOCH FROM (NOW() - sa.started_at)) / (24 * 3600) > 3 AND sa.status = 'IN_PROGRESS')
  )`);
  
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }
  
  params.push(limit);
  
  const query = `
    SELECT 
      sa.student_id,
      u.name AS display_name,
      a.id AS assignment_id,
      a.title AS assignment_title,
      sa.status,
      EXTRACT(EPOCH FROM (NOW() - a."createdAt")) / (24 * 3600) AS days_since_assigned,
      CASE 
        WHEN a.due_date IS NOT NULL AND a.due_date < NOW() 
        THEN EXTRACT(EPOCH FROM (NOW() - a.due_date)) / (24 * 3600)
        ELSE NULL 
      END AS days_overdue,
      -- Risk score calculation
      CASE 
        WHEN a.due_date IS NOT NULL AND a.due_date < NOW() AND sa.status != 'COMPLETED' THEN 10
        ELSE 0
      END +
      CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - a."createdAt")) / (24 * 3600) > 14 THEN 8
        WHEN EXTRACT(EPOCH FROM (NOW() - a."createdAt")) / (24 * 3600) > 7 THEN 5
        ELSE 0
      END +
      CASE 
        WHEN sa.status = 'NOT_STARTED' THEN 6
        WHEN sa.status = 'IN_PROGRESS' AND sa.started_at IS NOT NULL 
         AND EXTRACT(EPOCH FROM (NOW() - sa.started_at)) / (24 * 3600) > 3 THEN 4
        ELSE 0
      END AS risk_score
    FROM assignments a
    JOIN classrooms c ON a.classroom_id = c.id
    JOIN student_assignments sa ON a.id = sa.assignment_id
    JOIN users u ON sa.student_id = u.id
    ${whereClause}
    ORDER BY risk_score DESC, days_since_assigned DESC
    LIMIT $${paramIndex}
  `;
  
  const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  
  return result.map(row => ({
    studentId: row.student_id,
    displayName: row.display_name || 'Unknown Student',
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title || 'Untitled Assignment',
    status: row.status,
    daysSinceAssigned: Math.round(Number(row.days_since_assigned) || 0),
    daysOverdue: row.days_overdue ? Math.round(Number(row.days_overdue)) : null,
    riskScore: Number(row.risk_score) || 0,
  }));
}

/**
 * Bulk refresh assignment predictions
 */
export async function refreshAssignmentFunnelMetrics(): Promise<void> {
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_assignment_funnel');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_assignment_funnel');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_school_assignment_funnel');
}

/**
 * Calculate historical completion time for an article type (for new assignments)
 */
export async function getHistoricalCompletionTime(
  articleId?: string,
  cefrLevel?: string,
  raLevel?: number
): Promise<{
  medianHours: number | null;
  p80Hours: number | null;
  sampleSize: number;
}> {
  let whereClause = '';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (articleId) {
    whereClause = 'WHERE a.article_id = $1';
    params.push(articleId);
    paramIndex++;
  } else if (cefrLevel || raLevel) {
    const conditions: string[] = [];
    
    if (cefrLevel) {
      conditions.push(`art.cefr_level = $${paramIndex}`);
      params.push(cefrLevel);
      paramIndex++;
    }
    
    if (raLevel) {
      conditions.push(`art.ra_level = $${paramIndex}`);
      params.push(raLevel);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
  }
  
  const query = `
    SELECT 
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (sa.completed_at - sa.started_at)) / 3600
      ) AS median_hours,
      PERCENTILE_CONT(0.8) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (sa.completed_at - sa.started_at)) / 3600
      ) AS p80_hours,
      COUNT(*) AS sample_size
    FROM assignments a
    JOIN classrooms c ON a.classroom_id = c.id
    JOIN student_assignments sa ON a.id = sa.assignment_id
    JOIN article art ON a.article_id = art.id
    ${whereClause}
    AND sa.status = 'COMPLETED'
    AND sa.started_at IS NOT NULL
    AND sa.completed_at IS NOT NULL
    AND EXTRACT(EPOCH FROM (sa.completed_at - sa.started_at)) / 3600 BETWEEN 0.1 AND 48
  `;
  
  const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  
  if (!result || result.length === 0) {
    return { medianHours: null, p80Hours: null, sampleSize: 0 };
  }
  
  const data = result[0];
  
  return {
    medianHours: data.median_hours ? Number(data.median_hours) : null,
    p80Hours: data.p80_hours ? Number(data.p80_hours) : null,
    sampleSize: Number(data.sample_size) || 0,
  };
}