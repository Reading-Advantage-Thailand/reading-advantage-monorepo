/**
 * Velocity Service
 * 
 * Handles XP velocity calculations, ETAs, confidence bands, and forecasts.
 * Provides server-side helpers for velocity metrics that every dashboard can rely on.
 * 
 * @module server/services/metrics/velocity-service
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface VelocityMetrics {
  userId: string;
  email: string;
  displayName: string | null;
  schoolId: string | null;
  currentXp: number;
  currentLevel: number;
  cefrLevel: string;
  
  // 7-day metrics
  xpLast7d: number;
  activeDays7d: number;
  xpPerActiveDay7d: number;
  xpPerCalendarDay7d: number;
  
  // 30-day metrics
  xpLast30d: number;
  activeDays30d: number;
  xpPerActiveDay30d: number;
  xpPerCalendarDay30d: number;
  
  // EMA and velocity
  emaVelocity: number;
  stdDev: number;
  
  // Level progression
  xpToNextLevel: number;
  nextLevelXp: number;
  
  // ETA
  etaDays: number | null;
  etaDate: string | null;
  etaConfidenceLow: number | null;
  etaConfidenceHigh: number | null;
  
  // Metadata
  lastActivityAt: Date | null;
  isLowSignal: boolean;
  confidenceBand: 'high' | 'medium' | 'low' | 'none';
}

export interface ClassVelocityMetrics {
  classroomId: string;
  schoolId: string | null;
  classroomName: string | null;
  grade: number | null;
  totalStudents: number;
  
  totalXp7d: number;
  activeStudents7d: number;
  avgXpPerStudent7d: number;
  xpPerDay7d: number;
  
  totalXp30d: number;
  activeStudents30d: number;
  avgXpPerStudent30d: number;
  xpPerDay30d: number;
  
  engagementRate30d: number;
  lastActivityAt: Date | null;
  isLowSignal: boolean;
}

export interface SchoolVelocityMetrics {
  schoolId: string;
  schoolName: string;
  totalStudents: number;
  
  totalXp7d: number;
  activeStudents7d: number;
  avgXpPerStudent7d: number;
  xpPerDay7d: number;
  
  totalXp30d: number;
  activeStudents30d: number;
  avgXpPerStudent30d: number;
  xpPerDay30d: number;
  
  engagementRate30d: number;
  lastActivityAt: Date | null;
  isLowSignal: boolean;
}

export interface SystemVelocityMetrics {
  totalStudents: number;
  totalSchools: number;
  totalClasses: number;
  
  totalXp7d: number;
  activeStudents7d: number;
  avgXpPerStudent7d: number;
  xpPerDay7d: number;
  
  totalXp30d: number;
  activeStudents30d: number;
  avgXpPerStudent30d: number;
  xpPerDay30d: number;
  
  avgEngagementRate30d: number;
  lastActivityAt: Date | null;
}

interface DailyXpLog {
  date: Date;
  xpEarned: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum XP per day to avoid null ETA */
const MIN_VELOCITY_THRESHOLD = 0.5;

/** Minimum active days required for reliable ETA */
const MIN_ACTIVE_DAYS = 3;

/** EMA smoothing factor (0.2 = 20% weight to new data) */
const EMA_ALPHA = 0.2;

/** Standard deviation multiplier for confidence bands */
const CONFIDENCE_MULTIPLIER = 1.96; // 95% confidence interval

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate Exponential Moving Average velocity
 * Uses daily XP logs to compute EMA with alpha smoothing
 */
async function calculateEMA(userId: string, days: number = 30): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const dailyLogs = await prisma.$queryRaw<DailyXpLog[]>`
    SELECT 
      DATE("createdAt") as date,
      SUM(xp_earned) as "xpEarned"
    FROM "XPLogs"
    WHERE user_id = ${userId}
      AND "createdAt" >= ${startDate}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;
  
  if (dailyLogs.length === 0) return 0;
  
  let ema = Number(dailyLogs[0].xpEarned);
  
  for (let i = 1; i < dailyLogs.length; i++) {
    const xp = Number(dailyLogs[i].xpEarned);
    ema = EMA_ALPHA * xp + (1 - EMA_ALPHA) * ema;
  }
  
  return Math.round(ema * 100) / 100;
}

/**
 * Calculate standard deviation of daily XP
 */
async function calculateStdDev(userId: string, days: number = 30): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const dailyLogs = await prisma.$queryRaw<DailyXpLog[]>`
    SELECT 
      DATE("createdAt") as date,
      SUM(xp_earned) as "xpEarned"
    FROM "XPLogs"
    WHERE user_id = ${userId}
      AND "createdAt" >= ${startDate}
    GROUP BY DATE("createdAt")
  `;
  
  if (dailyLogs.length < 2) return 0;
  
  const values = dailyLogs.map(log => Number(log.xpEarned));
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

/**
 * Calculate ETA with confidence bands
 * Returns null for low-signal cases
 */
function calculateETA(
  xpToNextLevel: number,
  velocity: number,
  stdDev: number,
  activeDays: number
): {
  etaDays: number | null;
  etaDate: string | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  confidenceBand: 'high' | 'medium' | 'low' | 'none';
} {
  // Handle low-signal cases
  if (activeDays < MIN_ACTIVE_DAYS || velocity < MIN_VELOCITY_THRESHOLD || xpToNextLevel <= 0) {
    return {
      etaDays: null,
      etaDate: null,
      confidenceLow: null,
      confidenceHigh: null,
      confidenceBand: 'none',
    };
  }
  
  const etaDays = Math.ceil(xpToNextLevel / velocity);
  
  // Calculate confidence interval
  const velocityLow = Math.max(0.1, velocity - CONFIDENCE_MULTIPLIER * stdDev);
  const velocityHigh = velocity + CONFIDENCE_MULTIPLIER * stdDev;
  
  const confidenceHigh = Math.ceil(xpToNextLevel / velocityLow);
  const confidenceLow = Math.ceil(xpToNextLevel / velocityHigh);
  
  // Calculate ETA date
  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + etaDays);
  
  // Determine confidence band based on coefficient of variation
  const coefficientOfVariation = velocity > 0 ? stdDev / velocity : Infinity;
  let confidenceBand: 'high' | 'medium' | 'low' | 'none';
  
  if (coefficientOfVariation < 0.3) {
    confidenceBand = 'high';
  } else if (coefficientOfVariation < 0.6) {
    confidenceBand = 'medium';
  } else if (coefficientOfVariation < 1.0) {
    confidenceBand = 'low';
  } else {
    confidenceBand = 'none';
  }
  
  return {
    etaDays,
    etaDate: etaDate.toISOString(),
    confidenceLow,
    confidenceHigh,
    confidenceBand,
  };
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get enhanced velocity metrics for a student
 */
export async function getStudentVelocity(
  userId: string,
  includeConfidence: boolean = true
): Promise<VelocityMetrics | null> {
  const matviewData = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_student_velocity WHERE user_id = $1`,
    userId
  );
  
  if (!matviewData || matviewData.length === 0) {
    return null;
  }
  
  const data = matviewData[0];
  
  // Calculate EMA and standard deviation if confidence is needed
  let emaVelocity = Number(data.xp_per_calendar_day_30d) || 0;
  let stdDev = 0;
  
  if (includeConfidence) {
    [emaVelocity, stdDev] = await Promise.all([
      calculateEMA(userId, 30),
      calculateStdDev(userId, 30),
    ]);
  }
  
  // Calculate ETA
  const eta = calculateETA(
    Number(data.xp_to_next_level) || 0,
    emaVelocity,
    stdDev,
    Number(data.active_days_30d) || 0
  );
  
  return {
    userId: data.user_id,
    email: data.email,
    displayName: data.display_name,
    schoolId: data.school_id,
    currentXp: Number(data.current_xp) || 0,
    currentLevel: Number(data.current_level) || 0,
    cefrLevel: data.cefr_level,
    
    xpLast7d: Number(data.xp_last_7d) || 0,
    activeDays7d: Number(data.active_days_7d) || 0,
    xpPerActiveDay7d: Number(data.xp_per_active_day_7d) || 0,
    xpPerCalendarDay7d: Number(data.xp_per_calendar_day_7d) || 0,
    
    xpLast30d: Number(data.xp_last_30d) || 0,
    activeDays30d: Number(data.active_days_30d) || 0,
    xpPerActiveDay30d: Number(data.xp_per_active_day_30d) || 0,
    xpPerCalendarDay30d: Number(data.xp_per_calendar_day_30d) || 0,
    
    emaVelocity,
    stdDev,
    
    xpToNextLevel: Number(data.xp_to_next_level) || 0,
    nextLevelXp: Number(data.next_level_xp) || 0,
    
    etaDays: eta.etaDays,
    etaDate: eta.etaDate,
    etaConfidenceLow: eta.confidenceLow,
    etaConfidenceHigh: eta.confidenceHigh,
    
    lastActivityAt: data.last_activity_at,
    isLowSignal: Boolean(data.is_low_signal),
    confidenceBand: eta.confidenceBand,
  };
}

/**
 * Get velocity metrics for a class
 */
export async function getClassVelocity(classroomId: string): Promise<ClassVelocityMetrics | null> {
  const matviewData = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_class_velocity WHERE classroom_id = $1`,
    classroomId
  );
  
  if (!matviewData || matviewData.length === 0) {
    return null;
  }
  
  const data = matviewData[0];
  
  return {
    classroomId: data.classroom_id,
    schoolId: data.school_id,
    classroomName: data.classroom_name,
    grade: Number(data.grade) || null,
    totalStudents: Number(data.total_students) || 0,
    
    totalXp7d: Number(data.total_xp_7d) || 0,
    activeStudents7d: Number(data.active_students_7d) || 0,
    avgXpPerStudent7d: Number(data.avg_xp_per_student_7d) || 0,
    xpPerDay7d: Number(data.xp_per_day_7d) || 0,
    
    totalXp30d: Number(data.total_xp_30d) || 0,
    activeStudents30d: Number(data.active_students_30d) || 0,
    avgXpPerStudent30d: Number(data.avg_xp_per_student_30d) || 0,
    xpPerDay30d: Number(data.xp_per_day_30d) || 0,
    
    engagementRate30d: Number(data.engagement_rate_30d) || 0,
    lastActivityAt: data.last_activity_at,
    isLowSignal: Boolean(data.is_low_signal),
  };
}

/**
 * Get velocity metrics for a school
 */
export async function getSchoolVelocity(schoolId: string): Promise<SchoolVelocityMetrics | null> {
  const matviewData = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_school_velocity WHERE school_id = $1`,
    schoolId
  );
  
  if (!matviewData || matviewData.length === 0) {
    return null;
  }
  
  const data = matviewData[0];
  
  return {
    schoolId: data.school_id,
    schoolName: data.school_name,
    totalStudents: Number(data.total_students) || 0,
    
    totalXp7d: Number(data.total_xp_7d) || 0,
    activeStudents7d: Number(data.active_students_7d) || 0,
    avgXpPerStudent7d: Number(data.avg_xp_per_student_7d) || 0,
    xpPerDay7d: Number(data.xp_per_day_7d) || 0,
    
    totalXp30d: Number(data.total_xp_30d) || 0,
    activeStudents30d: Number(data.active_students_30d) || 0,
    avgXpPerStudent30d: Number(data.avg_xp_per_student_30d) || 0,
    xpPerDay30d: Number(data.xp_per_day_30d) || 0,
    
    engagementRate30d: Number(data.engagement_rate_30d) || 0,
    lastActivityAt: data.last_activity_at,
    isLowSignal: Boolean(data.is_low_signal),
  };
}

/**
 * Get velocity metrics for multiple students
 */
export async function getBulkStudentVelocity(
  userIds: string[],
  includeConfidence: boolean = false
): Promise<VelocityMetrics[]> {
  if (userIds.length === 0) return [];
  
  const matviewData = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM mv_student_velocity WHERE user_id = ANY($1)`,
    userIds
  );
  
  if (!matviewData || matviewData.length === 0) {
    return [];
  }
  
  // For bulk operations without confidence, skip EMA/stdDev calculations
  if (!includeConfidence) {
    return matviewData.map(data => ({
      userId: data.user_id,
      email: data.email,
      displayName: data.display_name,
      schoolId: data.school_id,
      currentXp: Number(data.current_xp) || 0,
      currentLevel: Number(data.current_level) || 0,
      cefrLevel: data.cefr_level,
      
      xpLast7d: Number(data.xp_last_7d) || 0,
      activeDays7d: Number(data.active_days_7d) || 0,
      xpPerActiveDay7d: Number(data.xp_per_active_day_7d) || 0,
      xpPerCalendarDay7d: Number(data.xp_per_calendar_day_7d) || 0,
      
      xpLast30d: Number(data.xp_last_30d) || 0,
      activeDays30d: Number(data.active_days_30d) || 0,
      xpPerActiveDay30d: Number(data.xp_per_active_day30d) || 0,
      xpPerCalendarDay30d: Number(data.xp_per_calendar_day_30d) || 0,
      
      emaVelocity: Number(data.xp_per_calendar_day_30d) || 0,
      stdDev: 0,
      
      xpToNextLevel: Number(data.xp_to_next_level) || 0,
      nextLevelXp: Number(data.next_level_xp) || 0,
      
      etaDays: null,
      etaDate: null,
      etaConfidenceLow: null,
      etaConfidenceHigh: null,
      
      lastActivityAt: data.last_activity_at,
      isLowSignal: Boolean(data.is_low_signal),
      confidenceBand: 'none' as const,
    }));
  }
  
  // For confidence calculations, process each student
  return Promise.all(
    matviewData.map(data => getStudentVelocity(data.user_id, true))
  ).then(results => results.filter((r): r is VelocityMetrics => r !== null));
}

/**
 * Get system-wide velocity metrics (aggregated across all schools)
 */
export async function getSystemVelocity(): Promise<SystemVelocityMetrics | null> {
  // Get aggregated data from school-level view
  const systemData = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      COUNT(DISTINCT s.school_id) as total_schools,
      SUM(s.total_students) as total_students,
      
      SUM(s.total_xp_7d) as total_xp_7d,
      SUM(s.active_students_7d) as active_students_7d,
      CASE 
        WHEN SUM(s.total_students) > 0 
        THEN ROUND(SUM(s.total_xp_7d)::numeric / SUM(s.total_students), 2)
        ELSE 0 
      END as avg_xp_per_student_7d,
      ROUND(SUM(s.total_xp_7d)::numeric / 7, 2) as xp_per_day_7d,
      
      SUM(s.total_xp_30d) as total_xp_30d,
      SUM(s.active_students_30d) as active_students_30d,
      CASE 
        WHEN SUM(s.total_students) > 0 
        THEN ROUND(SUM(s.total_xp_30d)::numeric / SUM(s.total_students), 2)
        ELSE 0 
      END as avg_xp_per_student_30d,
      ROUND(SUM(s.total_xp_30d)::numeric / 30, 2) as xp_per_day_30d,
      
      AVG(s.engagement_rate_30d) as avg_engagement_rate_30d,
      MAX(s.last_activity_at) as last_activity_at
    FROM mv_school_velocity s
  `);
  
  // Get total classes from class velocity view
  const classData = await prisma.$queryRawUnsafe<any[]>(`
    SELECT COUNT(DISTINCT classroom_id) as total_classes
    FROM mv_class_velocity
  `);
  
  if (!systemData || systemData.length === 0) {
    return null;
  }
  
  const data = systemData[0];
  const totalClasses = classData?.[0]?.total_classes || 0;
  
  return {
    totalSchools: Number(data.total_schools) || 0,
    totalClasses: Number(totalClasses) || 0,
    totalStudents: Number(data.total_students) || 0,
    
    totalXp7d: Number(data.total_xp_7d) || 0,
    activeStudents7d: Number(data.active_students_7d) || 0,
    avgXpPerStudent7d: Number(data.avg_xp_per_student_7d) || 0,
    xpPerDay7d: Number(data.xp_per_day_7d) || 0,
    
    totalXp30d: Number(data.total_xp_30d) || 0,
    activeStudents30d: Number(data.active_students_30d) || 0,
    avgXpPerStudent30d: Number(data.avg_xp_per_student_30d) || 0,
    xpPerDay30d: Number(data.xp_per_day_30d) || 0,
    
    avgEngagementRate30d: Number(data.avg_engagement_rate_30d) || 0,
    lastActivityAt: data.last_activity_at,
  };
}

/**
 * Refresh materialized views
 */
export async function refreshVelocityMatviews(): Promise<void> {
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_velocity');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_velocity');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_school_velocity');
}
