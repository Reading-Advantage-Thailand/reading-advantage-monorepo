/**
 * Shared Dashboard API Response Types
 * Used by both server and client for type-safe dashboard data
 */

// ============================================================================
// Common Types
// ============================================================================

export interface TimeRange {
  start: Date | string;
  end: Date | string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CacheMetadata {
  cached: boolean;
  generatedAt: string;
  expiresAt?: string;
}

// ============================================================================
// Admin Dashboard Types
// ============================================================================

export interface AdminOverviewResponse {
  summary: {
    totalSchools: number;
    totalStudents: number;
    totalTeachers: number;
    activeTeachers: number;
    activeUsers30d: number;
    activeClassrooms: number;
    totalReadingSessions: number;
    averageReadingLevel: number;
  };
  recentActivity: {
    newUsersToday: number;
    activeUsersToday: number;
    readingSessionsToday: number;
  };
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    lastChecked: string;
  };
  cache: CacheMetadata;
}

export interface SchoolSegment {
  schoolId: string;
  schoolName: string;
  studentCount: number;
  teacherCount: number;
  activeRate: number; // percentage
  averageLevel: number;
  totalXp: number;
  licensesUsed: number;
  licensesTotal: number;
}

export interface AdminSegmentsResponse {
  segments: SchoolSegment[];
  summary: {
    totalSchools: number;
    averageActiveRate: number;
    totalLicensesUsed: number;
  };
  cache: CacheMetadata;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  schoolId?: string;
  schoolName?: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface AdminAlertsResponse {
  alerts: Alert[];
  summary: {
    total: number;
    critical: number;
    unacknowledged: number;
  };
  cache: CacheMetadata;
}

// ============================================================================
// Teacher Effectiveness Types
// ============================================================================

export interface TeacherMetric {
  teacherId: string;
  teacherName: string;
  email: string;
  studentCount: number;
  activeStudents: number;
  engagementRate: number;
  classroomCount: number;
  classrooms: {
    id: string;
    name: string;
    studentCount: number;
    activeCount: number;
  }[];
}

export interface TeacherEffectivenessResponse {
  teachers: TeacherMetric[];
  summary: {
    totalTeachers: number;
    averageEngagement: number;
    totalStudents: number;
    totalActiveStudents: number;
  };
  cache: CacheMetadata;
}

// ============================================================================
// AI Summary Types
// ============================================================================

export interface TeacherOverviewResponse {
  teacher: {
    id: string;
    name: string;
    email: string;
    schoolId?: string;
    schoolName?: string;
  };
  summary: {
    totalClasses: number;
    totalStudents: number;
    activeStudents30d: number;
    averageClassLevel: number;
    pendingAssignments: number;
  };
  recentActivity: {
    studentsActiveToday: number;
    assignmentsCompletedToday: number;
  };
  cache: CacheMetadata;
}

export interface TeacherClass {
  id: string;
  name: string;
  classCode: string;
  studentCount: number;
  activeStudents7d: number;
  averageLevel: number;
  totalXp: number;
  createdAt: string;
  archived: boolean;
}

export interface TeacherClassesResponse {
  classes: TeacherClass[];
  summary: {
    total: number;
    active: number;
    archived: number;
  };
  cache: CacheMetadata;
}

// ============================================================================
// Class Dashboard Types
// ============================================================================

export interface ClassOverviewResponse {
  class: {
    id: string;
    name: string;
    classCode: string;
    schoolId?: string;
    schoolName?: string;
    createdAt: string;
  };
  summary: {
    totalStudents: number;
    activeStudents7d: number;
    activeStudents30d: number;
    averageLevel: number;
    totalXpEarned: number;
    assignmentsActive: number;
    assignmentsCompleted: number;
  };
  performance: {
    averageAccuracy: number;
    averageReadingTime: number; // minutes
    booksCompleted: number;
  };
  cache: CacheMetadata;
}

export interface ClassStudent {
  id: string;
  name: string;
  email: string;
  level: number;
  cefrLevel: string;
  xp: number;
  lastActive?: string;
  assignmentsCompleted: number;
  assignmentsPending: number;
  readingSessions: number;
  averageAccuracy: number;
  joinedAt: string;
}

export interface ClassStudentsResponse {
  students: ClassStudent[];
  summary: {
    total: number;
    active7d: number;
    active30d: number;
    averageLevel: number;
  };
  cache: CacheMetadata;
}

// ============================================================================
// Student Dashboard Types
// ============================================================================

export interface StudentMeResponse {
  student: {
    id: string;
    name: string;
    email: string;
    level: number;
    cefrLevel: string;
    xp: number;
    schoolId?: string;
    schoolName?: string;
  };
  progress: {
    booksRead: number;
    totalReadingTime: number; // minutes
    streak: number; // days
    lastActive?: string;
  };
  assignments: {
    pending: number;
    completed: number;
    overdue: number;
  };
  performance: {
    averageAccuracy: number;
    vocabularyMastered: number;
    xpThisWeek: number;
    xpThisMonth: number;
  };
  cache: CacheMetadata;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface VelocityDataPoint {
  date: string;
  articlesRead: number;
  wordsRead: number;
  timeSpent: number; // minutes
  averageLevel: number;
}

export interface MetricsVelocityResponse {
  timeframe: string; // '7d', '30d', '90d', 'custom'
  dataPoints: VelocityDataPoint[];
  summary: {
    totalArticles: number;
    totalWords: number;
    totalTime: number;
    averagePerDay: number;
    trend: 'up' | 'down' | 'stable';
  };
  cache: CacheMetadata;
}

export interface AssignmentMetrics {
  assignmentId: string;
  articleId: string;
  title: string;
  dueDate?: string;
  assigned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  averageScore: number;
  completionRate: number;
}

export interface MetricsAssignmentsResponse {
  timeframe: string;
  assignments: AssignmentMetrics[];
  summary: {
    totalAssignments: number;
    averageCompletionRate: number;
    averageScore: number;
  };
  cache: CacheMetadata;
}

// ============================================================================
// Assignment Funnel Analytics Types (Phase 2.2)
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

export interface ClassAssignmentFunnelMetrics {
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

export interface SchoolAssignmentFunnelMetrics {
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

export interface AssignmentFunnelResponse {
  scope: 'assignment' | 'class' | 'school';
  timeframe: string;
  
  // Individual assignment data (when scope=assignment)
  assignment?: AssignmentFunnelMetrics;
  
  // Class-level data (when scope=class)
  classMetrics?: ClassAssignmentFunnelMetrics;
  
  // School-level data (when scope=school)
  schoolMetrics?: SchoolAssignmentFunnelMetrics;
  
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
  
  cache: CacheMetadata;
}

export interface AlignmentBuckets {
  below: number;
  aligned: number;
  above: number;
  unknown: number;
}

export interface AlignmentSample {
  articleId: string;
  title: string;
  articleRaLevel: number;
  articleCefrLevel?: string;
  studentRaLevel?: number;
  levelDiff?: number;
  readAt: string;
  assignmentId?: string;
  genre?: string;
}

export interface AlignmentData {
  // Legacy support
  levelDistribution: Record<string, number>; // level -> student count
  cefrDistribution: Record<string, number>; // CEFR level -> student count
  recommendations: {
    studentsAboveLevel: number;
    studentsBelowLevel: number;
    studentsOnLevel: number;
  };
  
  // Enhanced alignment metrics
  buckets: {
    counts: AlignmentBuckets;
    percentages: AlignmentBuckets;
  };
  samples?: {
    below?: AlignmentSample[];
    aligned?: AlignmentSample[];
    above?: AlignmentSample[];
  };
  misalignmentIndicators: {
    highRiskStudents: number; // Students with >70% misaligned content
    assignmentOverrides: number; // Count of assignments with overrides
    contentGaps: {
      belowThreshold: number; // Articles significantly below student level
      aboveThreshold: number; // Articles significantly above student level
    };
  };
}

export interface MetricsAlignmentResponse {
  alignment: AlignmentData;
  summary: {
    totalStudents: number;
    averageLevel: number;
    modalLevel: number; // most common level
    totalReadings: number;
    alignmentScore: number; // Overall alignment health score (0-100)
  };
  cache: CacheMetadata;
}

export interface SRSMetrics {
  vocabularyDue: number;
  vocabularyMastered: number;
  vocabularyLearning: number;
  nextReviewDate?: string;
  dailyReviewStats: {
    date: string;
    reviewed: number;
    correct: number;
    accuracy: number;
  }[];
}

export interface MetricsSRSResponse {
  timeframe: string;
  srs: SRSMetrics;
  summary: {
    totalVocabulary: number;
    masteryRate: number;
    averageAccuracy: number;
  };
  cache: CacheMetadata;
}

export interface ActivityDataPoint {
  date: string;
  activeUsers: number;
  newUsers: number;
  readingSessions: number;
  averageSessionLength: number; // minutes
}

export interface MetricsActivityResponse {
  timeframe: string;
  dataPoints: ActivityDataPoint[];
  summary: {
    totalActiveUsers: number;
    totalSessions: number;
    averageSessionLength: number;
    peakDay: string;
  };
  cache: CacheMetadata;
}

export interface GenreMetrics {
  genre: string;
  count: number;
  percentage: number;
  averageLevel: number;
  totalXp: number;
}

export interface MetricsGenresResponse {
  timeframe: string;
  genres: GenreMetrics[];
  summary: {
    totalGenres: number;
    mostPopular: string;
    diversity: number; // 0-1 scale
  };
  cache: CacheMetadata;
}

// ============================================================================
// Class Accuracy Metrics Types
// ============================================================================

export interface StudentAccuracy {
  studentId: string;
  studentName: string;
  level: number;
  cefrLevel: string;
  mcqAccuracy: number;
  mcqAttempts: number;
  openEndedAccuracy: number;
  openEndedAttempts: number;
  overallAccuracy: number;
  totalAttempts: number;
}

export interface ClassAccuracyResponse {
  students: StudentAccuracy[];
  classAverages: {
    mcqAccuracy: number;
    openEndedAccuracy: number;
    overallAccuracy: number;
    totalAttempts: number;
    activeStudents: number;
  };
  timeframe: string;
}

// ============================================================================
// AI Summary Types
// ============================================================================

export interface AIInsight {
  id: string;
  type: 'trend' | 'alert' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high';
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface AISummaryResponse {
  insights: AIInsight[];
  summary: {
    totalInsights: number;
    highPriority: number;
    lastGenerated: string;
  };
  status: 'ready' | 'generating' | 'stale';
  cache: CacheMetadata;
}

// ============================================================================
// Export Formats
// ============================================================================

export interface CSVExportOptions {
  format: 'csv';
  fields?: string[];
  includeHeaders?: boolean;
}

export type ExportableResponse = 
  | TeacherClassesResponse 
  | ClassStudentsResponse;
