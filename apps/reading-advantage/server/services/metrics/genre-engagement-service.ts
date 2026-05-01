/**
 * Genre Engagement & Recommendation Service
 * 
 * This service provides genre engagement analytics and generates personalized
 * genre recommendations based on student reading patterns, CEFR level alignment,
 * and genre adjacency mappings.
 */

import { prisma } from '@/lib/prisma';
import { 
  getLocalizedRationale,
  getLocalizedGenreName,
  getUserLocale,
  localizeGenreRecommendation,
  SupportedLocale
} from '@/server/services/localization/genre-localization-service';

// Types for genre engagement data
export interface GenreEngagementData {
  genre: string;
  cefrBucket: string;
  totalReads: number;
  recentReads30d: number;
  recentReads7d: number;
  totalQuizCompletions: number;
  recentQuizCompletions30d: number;
  totalXpEarned: number;
  recentXp30d: number;
  weightedEngagementScore: number;
  lastActivityDate: Date;
  firstActivityDate: Date;
  activeDays: number;
  totalActivities: number;
  dailyActivityRate: number;
}

export interface GenreRecommendation {
  genre: string;
  rationale: string;
  confidenceScore: number;
  cefrAppropriate: boolean;
  adjacencyWeight: number;
  recommendationType: 'high_engagement_similar' | 'underexplored_adjacent' | 'level_appropriate_new';
}

export interface GenreMetricsResponse {
  scope: 'student' | 'class' | 'school';
  scopeId: string;
  timeframe: string;
  topGenres: GenreEngagementData[];
  recommendations: GenreRecommendation[];
  cefrDistribution: Record<string, number>;
  totalEngagementScore: number;
  calculatedAt: Date;
}

// Configuration for recommendation engine
const RECOMMENDATION_CONFIG = {
  // Minimum engagement score to consider a genre "engaging"
  MIN_ENGAGEMENT_THRESHOLD: 10.0,
  
  // Maximum CEFR level difference for recommendations
  MAX_CEFR_DISTANCE: 1,
  
  // Weights for different recommendation types
  RECOMMENDATION_WEIGHTS: {
    high_engagement_similar: 1.0,
    underexplored_adjacent: 0.8,
    level_appropriate_new: 0.6,
  },
  
  // Maximum recommendations to return
  MAX_RECOMMENDATIONS: 5,
  
  // Minimum adjacency weight to consider genres related
  MIN_ADJACENCY_WEIGHT: 0.5,
};

// CEFR level mappings for recommendation filtering
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CEFR_LEVEL_INDEX = Object.fromEntries(CEFR_LEVELS.map((level, idx) => [level, idx]));

/**
 * Get CEFR level distance between two levels
 */
function getCefrDistance(level1: string, level2: string): number {
  const idx1 = CEFR_LEVEL_INDEX[level1] ?? CEFR_LEVEL_INDEX['A1'];
  const idx2 = CEFR_LEVEL_INDEX[level2] ?? CEFR_LEVEL_INDEX['A1'];
  return Math.abs(idx1 - idx2);
}

/**
 * Check if a genre recommendation is CEFR appropriate
 */
function isCefrAppropriate(studentCefr: string, targetCefr: string): boolean {
  const distance = getCefrDistance(studentCefr, targetCefr);
  return distance <= RECOMMENDATION_CONFIG.MAX_CEFR_DISTANCE;
}

/**
 * Get genre engagement metrics for a specific student
 */
export async function getStudentGenreEngagement(
  userId: string,
  timeframe: '7d' | '30d' | '90d' | '6m' = '30d'
): Promise<GenreEngagementData[]> {
  const timeframeFilter = getTimeframeFilter(timeframe);
  
  const engagement = await prisma.$queryRaw<any[]>`
    SELECT 
      genre,
      cefr_bucket as "cefrBucket",
      SUM(total_reads) as "totalReads",
      SUM(recent_reads_30d) as "recentReads30d",
      SUM(recent_reads_7d) as "recentReads7d",
      SUM(total_quiz_completions) as "totalQuizCompletions", 
      SUM(recent_quiz_completions_30d) as "recentQuizCompletions30d",
      SUM(total_xp_earned) as "totalXpEarned",
      SUM(recent_xp_30d) as "recentXp30d",
      SUM(weighted_engagement_score) as "weightedEngagementScore",
      MAX(last_activity_date) as "lastActivityDate",
      MIN(first_activity_date) as "firstActivityDate",
      SUM(active_days) as "activeDays",
      SUM(total_activities) as "totalActivities",
      AVG(daily_activity_rate) as "dailyActivityRate"
    FROM mv_genre_engagement_metrics
    WHERE user_id = ${userId}
      AND last_activity_date >= ${timeframeFilter}
    GROUP BY genre, cefr_bucket
    ORDER BY "weightedEngagementScore" DESC
  `;
  
  return engagement.map(formatEngagementData);
}

/**
 * Get genre engagement metrics for a classroom
 */
export async function getClassGenreEngagement(
  classroomId: string,
  timeframe: '7d' | '30d' | '90d' | '6m' = '30d'
): Promise<GenreEngagementData[]> {
  const timeframeFilter = getTimeframeFilter(timeframe);
  
  const engagement = await prisma.$queryRaw<any[]>`
    SELECT 
      genre,
      cefr_bucket as "cefrBucket",
      AVG(weighted_engagement_score) as "weightedEngagementScore",
      SUM(class_total_reads) as "totalReads",
      SUM(class_total_quiz_completions) as "totalQuizCompletions",
      SUM(class_total_xp) as "totalXpEarned",
      MAX(class_last_activity) as "lastActivityDate",
      AVG(avg_daily_activity_rate) as "dailyActivityRate",
      COUNT(DISTINCT user_id) as "activeStudents"
    FROM mv_class_genre_engagement cge
    JOIN mv_genre_engagement_metrics gem ON cge.classroom_id = gem.classroom_id AND cge.genre = gem.genre
    WHERE cge.classroom_id = ${classroomId}
      AND cge.class_last_activity >= ${timeframeFilter}
    GROUP BY genre, cefr_bucket
    ORDER BY "weightedEngagementScore" DESC
  `;
  
  return engagement.map(formatEngagementData);
}

/**
 * Get genre engagement metrics for a school
 */
export async function getSchoolGenreEngagement(
  schoolId: string,
  timeframe: '7d' | '30d' | '90d' | '6m' = '30d'
): Promise<GenreEngagementData[]> {
  const timeframeFilter = getTimeframeFilter(timeframe);
  
  const engagement = await prisma.$queryRaw<any[]>`
    SELECT 
      genre,
      cefr_bucket as "cefrBucket", 
      AVG(avg_engagement_score) as "weightedEngagementScore",
      SUM(school_total_reads) as "totalReads",
      SUM(school_total_quiz_completions) as "totalQuizCompletions",
      SUM(school_total_xp) as "totalXpEarned",
      MAX(school_last_activity) as "lastActivityDate",
      AVG(avg_daily_activity_rate) as "dailyActivityRate",
      COUNT(DISTINCT classroom_id) as "activeClassrooms",
      SUM(active_students) as "activeStudents"
    FROM mv_school_genre_engagement
    WHERE school_id = ${schoolId}
      AND school_last_activity >= ${timeframeFilter}
    GROUP BY genre, cefr_bucket
    ORDER BY "weightedEngagementScore" DESC
  `;
  
  return engagement.map(formatEngagementData);
}

/**
 * Generate genre recommendations for a student with localization
 */
export async function generateStudentGenreRecommendations(
  userId: string,
  currentEngagement: GenreEngagementData[]
): Promise<GenreRecommendation[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cefrLevel: true }
  });
  
  if (!user) return [];
  
  // Get user's preferred locale
  const userLocale = await getUserLocale(userId);
  
  const studentCefrBucket = user.cefrLevel.substring(0, 2); // Extract base level (A1, B2, etc.)
  const currentGenres = new Set(currentEngagement.map(e => e.genre));
  const recommendations: GenreRecommendation[] = [];
  
  // Get genre adjacencies for recommendation logic
  const adjacencies = await prisma.genreAdjacency.findMany({
    where: {
      weight: { gte: RECOMMENDATION_CONFIG.MIN_ADJACENCY_WEIGHT }
    }
  });
  
  // Type 1: High engagement similar genres
  const highEngagementGenres = currentEngagement
    .filter(e => e.weightedEngagementScore >= RECOMMENDATION_CONFIG.MIN_ENGAGEMENT_THRESHOLD)
    .slice(0, 2); // Top 2 most engaging genres
  
  for (const engagedGenre of highEngagementGenres) {
    const similarGenres = adjacencies
      .filter(adj => adj.primaryGenre === engagedGenre.genre)
      .filter(adj => !currentGenres.has(adj.adjacentGenre))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2);
    
    for (const similar of similarGenres) {
      const cefrAppropriate = await checkGenreCefrAlignment(similar.adjacentGenre, studentCefrBucket);
      const rationale = await generateRationale('high_engagement_similar', engagedGenre.genre, similar.adjacentGenre, userLocale);
      
      recommendations.push({
        genre: similar.adjacentGenre,
        rationale,
        confidenceScore: similar.weight * RECOMMENDATION_CONFIG.RECOMMENDATION_WEIGHTS.high_engagement_similar,
        cefrAppropriate,
        adjacencyWeight: similar.weight,
        recommendationType: 'high_engagement_similar'
      });
    }
  }
  
  // Type 2: Underexplored adjacent genres  
  const exploredGenres = currentEngagement.map(e => e.genre);
  const underexploredAdjacent = adjacencies
    .filter(adj => exploredGenres.includes(adj.primaryGenre))
    .filter(adj => !currentGenres.has(adj.adjacentGenre))
    .filter(adj => !recommendations.some(r => r.genre === adj.adjacentGenre))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);
  
  for (const underexplored of underexploredAdjacent) {
    const cefrAppropriate = await checkGenreCefrAlignment(underexplored.adjacentGenre, studentCefrBucket);
    const rationale = await generateRationale('underexplored_adjacent', underexplored.primaryGenre, underexplored.adjacentGenre, userLocale);
    
    recommendations.push({
      genre: underexplored.adjacentGenre,
      rationale,
      confidenceScore: underexplored.weight * RECOMMENDATION_CONFIG.RECOMMENDATION_WEIGHTS.underexplored_adjacent,
      cefrAppropriate,
      adjacencyWeight: underexplored.weight,
      recommendationType: 'underexplored_adjacent'
    });
  }
  
  // Type 3: Level-appropriate new genres
  const allGenres = await getAllAvailableGenres();
  const newGenres = allGenres
    .filter(genre => !currentGenres.has(genre))
    .filter(genre => !recommendations.some(r => r.genre === genre));
  
  for (const newGenre of newGenres.slice(0, 1)) {
    const cefrAppropriate = await checkGenreCefrAlignment(newGenre, studentCefrBucket);
    
    if (cefrAppropriate) {
      const rationale = await generateRationale('level_appropriate_new', '', newGenre, userLocale);
      
      recommendations.push({
        genre: newGenre,
        rationale,
        confidenceScore: RECOMMENDATION_CONFIG.RECOMMENDATION_WEIGHTS.level_appropriate_new,
        cefrAppropriate: true,
        adjacencyWeight: 0,
        recommendationType: 'level_appropriate_new'
      });
    }
  }
  
  // Sort by confidence score and return top recommendations
  return recommendations
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS);
}

/**
 * Generate human-readable rationale for recommendations with localization
 */
async function generateRationale(
  type: GenreRecommendation['recommendationType'],
  sourceGenre: string,
  targetGenre: string,
  locale: SupportedLocale = 'en'
): Promise<string> {
  try {
    return await getLocalizedRationale(type, sourceGenre, targetGenre, locale);
  } catch (error) {
    console.warn('Failed to get localized rationale, using fallback:', error);
    
    // Fallback templates
    const templates = {
      high_engagement_similar: `Strong ${sourceGenre} engagement suggests you might enjoy ${targetGenre}`,
      underexplored_adjacent: `Based on your ${sourceGenre} reading, explore ${targetGenre} for variety`,
      level_appropriate_new: `${targetGenre} matches your reading level - discover something new!`
    };
    
    return templates[type];
  }
}

/**
 * Check if a genre has content appropriate for the student's CEFR level
 */
async function checkGenreCefrAlignment(genre: string, studentCefrBucket: string): Promise<boolean> {
  const genreContent = await prisma.article.findFirst({
    where: {
      genre,
      cefrLevel: {
        startsWith: studentCefrBucket
      }
    }
  });
  
  // Also check chapters
  if (!genreContent) {
    const chapterContent = await prisma.chapter.findFirst({
      where: {
        genre,
        cefrLevel: {
          startsWith: studentCefrBucket
        }
      }
    });
    return !!chapterContent;
  }
  
  return !!genreContent;
}

/**
 * Get all available genres in the system
 */
async function getAllAvailableGenres(): Promise<string[]> {
  const articleGenres = await prisma.article.findMany({
    select: { genre: true },
    distinct: ['genre'],
    where: { 
      genre: { not: null },
      isPublic: true
    }
  });
  
  const chapterGenres = await prisma.chapter.findMany({
    select: { genre: true },
    distinct: ['genre'],
    where: { 
      genre: { not: null },
      isPublic: true
    }
  });
  
  const allGenres = new Set([
    ...articleGenres.map(a => a.genre).filter(Boolean),
    ...chapterGenres.map(c => c.genre).filter(Boolean)
  ]);
  
  return Array.from(allGenres) as string[];
}

/**
 * Helper function to convert timeframe to SQL date filter
 */
function getTimeframeFilter(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '6m':
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Format raw engagement data from database
 */
function formatEngagementData(raw: any): GenreEngagementData {
  return {
    genre: raw.genre,
    cefrBucket: raw.cefrBucket,
    totalReads: parseInt(raw.totalReads) || 0,
    recentReads30d: parseInt(raw.recentReads30d) || 0,
    recentReads7d: parseInt(raw.recentReads7d) || 0,
    totalQuizCompletions: parseInt(raw.totalQuizCompletions) || 0,
    recentQuizCompletions30d: parseInt(raw.recentQuizCompletions30d) || 0,
    totalXpEarned: parseInt(raw.totalXpEarned) || 0,
    recentXp30d: parseInt(raw.recentXp30d) || 0,
    weightedEngagementScore: parseFloat(raw.weightedEngagementScore) || 0,
    lastActivityDate: new Date(raw.lastActivityDate),
    firstActivityDate: new Date(raw.firstActivityDate || raw.lastActivityDate),
    activeDays: parseInt(raw.activeDays) || 0,
    totalActivities: parseInt(raw.totalActivities) || 0,
    dailyActivityRate: parseFloat(raw.dailyActivityRate) || 0,
  };
}

/**
 * Refresh genre engagement materialized views
 */
export async function refreshGenreEngagementMetrics(): Promise<void> {
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_genre_engagement_metrics');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_class_genre_engagement');
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_school_genre_engagement');
}

/**
 * Generate complete genre metrics response for any scope
 */
export async function getGenreMetrics(
  scope: 'student' | 'class' | 'school',
  scopeId: string,
  timeframe: '7d' | '30d' | '90d' | '6m' = '30d'
): Promise<GenreMetricsResponse> {
  let topGenres: GenreEngagementData[];
  let recommendations: GenreRecommendation[] = [];
  
  // Get engagement data based on scope
  switch (scope) {
    case 'student':
      topGenres = await getStudentGenreEngagement(scopeId, timeframe);
      recommendations = await generateStudentGenreRecommendations(scopeId, topGenres);
      break;
    case 'class':
      topGenres = await getClassGenreEngagement(scopeId, timeframe);
      break;
    case 'school':
      topGenres = await getSchoolGenreEngagement(scopeId, timeframe);
      break;
    default:
      topGenres = [];
  }
  
  // Calculate CEFR distribution
  const cefrDistribution = topGenres.reduce((acc, genre) => {
    acc[genre.cefrBucket] = (acc[genre.cefrBucket] || 0) + genre.weightedEngagementScore;
    return acc;
  }, {} as Record<string, number>);
  
  const totalEngagementScore = topGenres.reduce((sum, genre) => sum + genre.weightedEngagementScore, 0);
  
  return {
    scope,
    scopeId,
    timeframe,
    topGenres,
    recommendations,
    cefrDistribution,
    totalEngagementScore,
    calculatedAt: new Date()
  };
}