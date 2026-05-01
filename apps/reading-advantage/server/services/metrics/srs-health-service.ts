/**
 * SRS Health Metrics Service
 * 
 * Provides comprehensive spaced repetition system health analytics including:
 * - Student-level flashcard due/overdue counts
 * - Lapse tracking and stability measurements
 * - Overload detection and intervention recommendations
 * - Class and school-level aggregations with health indicators
 * - Quick-action suggestions for catching up on reviews
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface SRSHealthMetrics {
  userId: string;
  email: string;
  schoolId: string | null;
  cefrLevel: string;
  level: number;
  
  // Card counts by type
  vocabulary: {
    total: number;
    mastered: number;
    learning: number;
    new: number;
    dueForReview: number;
    overdue: number;
  };
  
  sentences: {
    total: number;
    mastered: number;
    learning: number;
    new: number;
    dueForReview: number;
    overdue: number;
  };
  
  // Combined totals
  totalCards: number;
  totalDueForReview: number;
  totalOverdue: number;
  
  // Performance metrics
  avgLapses: number;
  avgRepetitions: number;
  maxLapses: number;
  maxRepetitions: number;
  
  // Stability measurements
  avgVocabStability: number;
  avgSentenceStability: number;
  overallStability: number;
  overallMasteryPct: number;
  
  // Health flags
  isOverloaded: boolean;
  hasCriticalBacklog: boolean;
  hasHighLapseRate: boolean;
  isInactive: boolean;
  
  // Activity tracking
  daysSinceLastPractice: number;
  lastPracticeAt: Date | null;
  
  // Recommendations
  recommendedDailySessions: number;
  recommendedSessionMinutes: number;
  
  // Suggested actions
  suggestedActions: SuggestedAction[];
  
  lastUpdated: Date;
}

export interface ClassSRSHealthMetrics {
  classroomId: string;
  classroomName: string;
  grade: number | null;
  schoolId: string | null;
  
  // Student counts
  totalStudents: number;
  overloadedStudents: number;
  criticalBacklogStudents: number;
  inactiveStudents: number;
  activeSRSStudents: number;
  
  // Class averages
  avgCardsPerStudent: number;
  avgDuePerStudent: number;
  avgOverduePerStudent: number;
  classAvgMasteryPct: number;
  classAvgStability: number;
  
  // Class health indicators
  overloadRate: number;
  inactiveRate: number;
  classHealthStatus: 'at_risk' | 'low_engagement' | 'struggling' | 'excelling' | 'healthy';
  studentsNeedingIntervention: number;
  
  // Quick stats
  summary: {
    studentsAtRisk: number;
    totalReviewsNeeded: number;
    avgSessionsPerStudent: number;
  };
  
  lastUpdated: Date;
}

export interface SchoolSRSHealthMetrics {
  schoolId: string;
  schoolName: string;
  
  // Overall counts
  totalStudents: number;
  totalClasses: number;
  overloadedStudents: number;
  criticalBacklogStudents: number;
  inactiveStudents: number;
  
  // School-wide averages
  schoolAvgCardsPerStudent: number;
  schoolAvgDuePerStudent: number;
  schoolAvgMasteryPct: number;
  schoolAvgStability: number;
  
  // School health indicators
  schoolOverloadRate: number;
  schoolInactiveRate: number;
  atRiskClasses: number;
  lowEngagementClasses: number;
  strugglingClasses: number;
  
  schoolHealthStatus: 'critical' | 'disengaged' | 'underperforming' | 'high_performing' | 'stable';
  
  lastUpdated: Date;
}

export interface SuggestedAction {
  type: 'review_flashcards' | 'reduce_new_cards' | 'schedule_reminder' | 'teacher_intervention' | 'break_session';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedMinutes?: number;
  targetCount?: number;
}

export interface OverloadThresholds {
  maxDueCards: number;
  maxOverdueDays: number;
  maxLapseRate: number;
  inactiveDaysThreshold: number;
  criticalBacklogDays: number;
}

// Default thresholds for overload detection
export const DEFAULT_OVERLOAD_THRESHOLDS: OverloadThresholds = {
  maxDueCards: 50,
  maxOverdueDays: 3,
  maxLapseRate: 3,
  inactiveDaysThreshold: 7,
  criticalBacklogDays: 3,
};

// ============================================================================
// Core Health Functions
// ============================================================================

/**
 * Get comprehensive SRS health metrics for a student
 */
export async function getStudentSRSHealth(
  userId: string,
  thresholds: OverloadThresholds = DEFAULT_OVERLOAD_THRESHOLDS
): Promise<SRSHealthMetrics | null> {
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_srs_health WHERE user_id = $1`,
    userId
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const data = result[0];
  
  // Generate suggested actions based on health flags
  const suggestedActions = generateSuggestedActions(data, thresholds);
  
  return {
    userId: data.user_id,
    email: data.email,
    schoolId: data.school_id,
    cefrLevel: data.cefr_level,
    level: Number(data.level),
    
    vocabulary: {
      total: Number(data.total_vocabulary) || 0,
      mastered: Number(data.vocab_mastered_count) || 0,
      learning: Number(data.vocab_learning_count) || 0,
      new: Number(data.vocab_new_count) || 0,
      dueForReview: Number(data.vocab_due_for_review) || 0,
      overdue: Number(data.vocab_overdue_count) || 0,
    },
    
    sentences: {
      total: Number(data.total_sentences) || 0,
      mastered: Number(data.sentence_mastered_count) || 0,
      learning: Number(data.sentence_learning_count) || 0,
      new: Number(data.sentence_new_count) || 0,
      dueForReview: Number(data.sentence_due_for_review) || 0,
      overdue: Number(data.sentence_overdue_count) || 0,
    },
    
    totalCards: Number(data.total_cards) || 0,
    totalDueForReview: Number(data.total_due_for_review) || 0,
    totalOverdue: Number(data.total_overdue_count) || 0,
    
    avgLapses: Number(data.avg_lapses) || 0,
    avgRepetitions: Number(data.avg_repetitions) || 0,
    maxLapses: Number(data.max_lapses) || 0,
    maxRepetitions: Number(data.max_repetitions) || 0,
    
    avgVocabStability: Number(data.avg_vocab_stability) || 0,
    avgSentenceStability: Number(data.avg_sentence_stability) || 0,
    overallStability: Number(data.overall_stability) || 0,
    overallMasteryPct: Number(data.overall_mastery_pct) || 0,
    
    isOverloaded: Boolean(data.is_overloaded),
    hasCriticalBacklog: Boolean(data.has_critical_backlog),
    hasHighLapseRate: Boolean(data.has_high_lapse_rate),
    isInactive: Boolean(data.is_inactive),
    
    daysSinceLastPractice: Number(data.days_since_last_practice) || 0,
    lastPracticeAt: data.last_practice_at ? new Date(data.last_practice_at) : null,
    
    recommendedDailySessions: Number(data.recommended_daily_sessions) || 1,
    recommendedSessionMinutes: Number(data.recommended_session_minutes) || 15,
    
    suggestedActions,
    
    lastUpdated: new Date(data.last_updated),
  };
}

/**
 * Get class-level SRS health metrics
 */
export async function getClassSRSHealth(
  classroomId: string
): Promise<ClassSRSHealthMetrics | null> {
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_srs_health_class WHERE classroom_id = $1`,
    classroomId
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const data = result[0];
  
  return {
    classroomId: data.classroom_id,
    classroomName: data.classroom_name,
    grade: data.grade ? Number(data.grade) : null,
    schoolId: data.school_id,
    
    totalStudents: Number(data.total_students) || 0,
    overloadedStudents: Number(data.overloaded_students) || 0,
    criticalBacklogStudents: Number(data.critical_backlog_students) || 0,
    inactiveStudents: Number(data.inactive_students) || 0,
    activeSRSStudents: Number(data.active_srs_students) || 0,
    
    avgCardsPerStudent: Number(data.avg_cards_per_student) || 0,
    avgDuePerStudent: Number(data.avg_due_per_student) || 0,
    avgOverduePerStudent: Number(data.avg_overdue_per_student) || 0,
    classAvgMasteryPct: Number(data.class_avg_mastery_pct) || 0,
    classAvgStability: Number(data.class_avg_stability) || 0,
    
    overloadRate: Number(data.overload_rate) || 0,
    inactiveRate: Number(data.inactive_rate) || 0,
    classHealthStatus: data.class_health_status,
    studentsNeedingIntervention: Number(data.students_needing_intervention) || 0,
    
    summary: {
      studentsAtRisk: Number(data.overloaded_students) + Number(data.critical_backlog_students),
      totalReviewsNeeded: Math.round(Number(data.avg_due_per_student) * Number(data.total_students)),
      avgSessionsPerStudent: Math.round((Number(data.avg_due_per_student) || 0) / 20), // Assuming 20 cards per session
    },
    
    lastUpdated: new Date(data.last_updated),
  };
}

/**
 * Get school-level SRS health metrics
 */
export async function getSchoolSRSHealth(
  schoolId: string
): Promise<SchoolSRSHealthMetrics | null> {
  const result = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_srs_health_school WHERE school_id = $1`,
    schoolId
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const data = result[0];
  
  return {
    schoolId: data.school_id,
    schoolName: data.school_name,
    
    totalStudents: Number(data.total_students) || 0,
    totalClasses: Number(data.total_classes) || 0,
    overloadedStudents: Number(data.overloaded_students) || 0,
    criticalBacklogStudents: Number(data.critical_backlog_students) || 0,
    inactiveStudents: Number(data.inactive_students) || 0,
    
    schoolAvgCardsPerStudent: Number(data.school_avg_cards_per_student) || 0,
    schoolAvgDuePerStudent: Number(data.school_avg_due_per_student) || 0,
    schoolAvgMasteryPct: Number(data.school_avg_mastery_pct) || 0,
    schoolAvgStability: Number(data.school_avg_stability) || 0,
    
    schoolOverloadRate: Number(data.school_overload_rate) || 0,
    schoolInactiveRate: Number(data.school_inactive_rate) || 0,
    atRiskClasses: Number(data.at_risk_classes) || 0,
    lowEngagementClasses: Number(data.low_engagement_classes) || 0,
    strugglingClasses: Number(data.struggling_classes) || 0,
    
    schoolHealthStatus: data.school_health_status,
    
    lastUpdated: new Date(data.last_updated),
  };
}

/**
 * Get at-risk students for teacher intervention
 */
export async function getAtRiskStudents(
  classroomId?: string,
  schoolId?: string,
  limit: number = 20
): Promise<Array<{
  userId: string;
  email: string;
  totalOverdue: number;
  daysSinceLastPractice: number;
  riskScore: number;
  primaryConcern: string;
}>> {
  let whereClause = '';
  const params: any[] = [];
  let paramIndex = 1;
  
  const conditions: string[] = [];
  
  if (classroomId) {
    // Get students in specific classroom
    conditions.push(`h.user_id IN (
      SELECT cs.student_id 
      FROM classroom_students cs 
      WHERE cs.classroom_id = $${paramIndex}
    )`);
    params.push(classroomId);
    paramIndex++;
  } else if (schoolId) {
    conditions.push(`h.school_id = $${paramIndex}`);
    params.push(schoolId);
    paramIndex++;
  }
  
  // Add risk conditions
  conditions.push(`(h.is_overloaded = true OR h.has_critical_backlog = true OR h.is_inactive = true)`);
  
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }
  
  params.push(limit);
  
  const query = `
    SELECT 
      h.user_id,
      h.email,
      h.total_overdue_count,
      h.days_since_last_practice,
      -- Risk score calculation
      CASE 
        WHEN h.has_critical_backlog THEN 10
        ELSE 0
      END +
      CASE 
        WHEN h.is_overloaded THEN 8
        ELSE 0
      END +
      CASE 
        WHEN h.is_inactive THEN 6
        ELSE 0
      END +
      CASE 
        WHEN h.has_high_lapse_rate THEN 4
        ELSE 0
      END AS risk_score,
      -- Primary concern
      CASE 
        WHEN h.has_critical_backlog THEN 'Critical backlog'
        WHEN h.is_overloaded THEN 'Overloaded'
        WHEN h.is_inactive THEN 'Inactive'
        WHEN h.has_high_lapse_rate THEN 'High lapse rate'
        ELSE 'Multiple concerns'
      END AS primary_concern
    FROM mv_srs_health h
    ${whereClause}
    ORDER BY risk_score DESC, total_overdue_count DESC
    LIMIT $${paramIndex}
  `;
  
  const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  
  return result.map(row => ({
    userId: row.user_id,
    email: row.email,
    totalOverdue: Number(row.total_overdue_count) || 0,
    daysSinceLastPractice: Number(row.days_since_last_practice) || 0,
    riskScore: Number(row.risk_score) || 0,
    primaryConcern: row.primary_concern,
  }));
}

/**
 * Generate suggested actions based on health metrics
 */
function generateSuggestedActions(
  healthData: any,
  thresholds: OverloadThresholds
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  
  // Critical backlog - highest priority
  if (healthData.has_critical_backlog) {
    const overdueCount = Number(healthData.total_overdue_count);
    actions.push({
      type: 'review_flashcards',
      priority: 'critical',
      title: 'Clear Critical Backlog',
      description: `You have ${overdueCount} overdue cards. Focus on reviewing these first.`,
      estimatedMinutes: Math.min(overdueCount * 0.5, 30),
      targetCount: overdueCount,
    });
  }
  
  // Overloaded with due cards
  if (healthData.is_overloaded && !healthData.has_critical_backlog) {
    const dueCount = Number(healthData.total_due_for_review);
    actions.push({
      type: 'review_flashcards',
      priority: 'high',
      title: 'Catch Up on Reviews',
      description: `You have ${dueCount} cards due for review. Consider multiple short sessions.`,
      estimatedMinutes: 25,
      targetCount: Math.min(dueCount, 25),
    });
    
    actions.push({
      type: 'reduce_new_cards',
      priority: 'medium',
      title: 'Reduce New Cards',
      description: 'Focus on reviewing existing cards before adding new ones.',
    });
  }
  
  // High lapse rate
  if (healthData.has_high_lapse_rate) {
    actions.push({
      type: 'break_session',
      priority: 'medium',
      title: 'Break Cards Into Smaller Sessions',
      description: 'High lapse rate suggests sessions may be too long. Try shorter, more frequent sessions.',
      estimatedMinutes: 10,
    });
  }
  
  // Inactive student
  if (healthData.is_inactive) {
    const daysSincePractice = Number(healthData.days_since_last_practice);
    if (daysSincePractice > 14) {
      actions.push({
        type: 'teacher_intervention',
        priority: 'high',
        title: 'Teacher Check-in Recommended',
        description: `Student inactive for ${Math.round(daysSincePractice)} days. Personal encouragement may help.`,
      });
    } else {
      actions.push({
        type: 'schedule_reminder',
        priority: 'medium',
        title: 'Set Practice Reminder',
        description: 'Regular practice reminders can help maintain momentum.',
      });
    }
  }
  
  // Regular maintenance for healthy students
  if (!healthData.is_overloaded && !healthData.has_critical_backlog && !healthData.is_inactive) {
    if (Number(healthData.total_due_for_review) > 0) {
      actions.push({
        type: 'review_flashcards',
        priority: 'low',
        title: 'Regular Review Session',
        description: `${healthData.total_due_for_review} cards ready for review. Keep up the great work!`,
        estimatedMinutes: healthData.recommended_session_minutes,
        targetCount: Number(healthData.total_due_for_review),
      });
    }
  }
  
  return actions;
}

/**
 * Refresh all SRS health materialized views
 */
export async function refreshSRSHealthMetrics(): Promise<void> {
  await prisma.$executeRawUnsafe('SELECT refresh_srs_health_views()');
}

/**
 * Get customizable overload thresholds for a school
 */
export async function getSchoolOverloadThresholds(
  schoolId: string
): Promise<OverloadThresholds> {
  // For now, return defaults. Later this could be configurable per school
  return DEFAULT_OVERLOAD_THRESHOLDS;
}