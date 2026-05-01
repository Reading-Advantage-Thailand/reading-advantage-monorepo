#!/usr/bin/env tsx

/**
 * Refresh Genre Engagement Materialized Views
 * 
 * This script refreshes the genre engagement materialized views to ensure
 * up-to-date metrics for the recommendation engine.
 * 
 * Usage:
 *   npm run refresh-genre-metrics
 *   npx tsx scripts/refresh-genre-metrics.ts
 *   npx tsx scripts/refresh-genre-metrics.ts --rebuild  # Force rebuild from scratch
 */

import { prisma } from '../lib/prisma';

async function refreshGenreMetrics(rebuild: boolean = false) {
  console.log('🔄 Starting genre engagement metrics refresh...');
  
  const startTime = Date.now();
  
  try {
    if (rebuild) {
      console.log('🔨 Rebuilding views from scratch...\n');
      
      // Import the fix script logic
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      await execPromise('npx tsx scripts/fix-genre-engagement-xp.ts');
      console.log('✅ Views rebuilt successfully');
    } else {
      // Refresh main genre engagement metrics view (without CONCURRENTLY since we don't have unique index)
      console.log('📊 Refreshing mv_genre_engagement_metrics...');
      await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_genre_engagement_metrics');
      
      // Refresh class-level aggregations
      console.log('🎓 Refreshing mv_class_genre_engagement...');
      await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_class_genre_engagement');
      
      // Refresh school-level aggregations
      console.log('🏫 Refreshing mv_school_genre_engagement...');
      await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_school_genre_engagement');
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Genre engagement metrics refreshed successfully in ${duration}ms`);
    
    // Get some basic stats
    const studentMetrics = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM mv_genre_engagement_metrics
    `;
    
    const classMetrics = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM mv_class_genre_engagement
    `;
    
    const schoolMetrics = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM mv_school_genre_engagement
    `;
    
    console.log(`\n📈 Metrics generated:`);
    console.log(`   - Student-genre combinations: ${studentMetrics[0]?.count || 0}`);
    console.log(`   - Class-genre combinations: ${classMetrics[0]?.count || 0}`);
    console.log(`   - School-genre combinations: ${schoolMetrics[0]?.count || 0}`);
    
  } catch (error) {
    console.error('❌ Failed to refresh genre engagement metrics:', error);
    throw error;
  }
}

async function validateMetricsIntegrity() {
  console.log('🔍 Validating metrics integrity...');
  
  try {
    // Check for any negative scores (shouldn't happen)
    const negativeScores = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count 
      FROM mv_genre_engagement_metrics 
      WHERE weighted_engagement_score < 0
    `;
    
    if (Number(negativeScores[0]?.count) > 0) {
      console.warn(`⚠️  Found ${negativeScores[0].count} records with negative engagement scores`);
    }
    
    // Check for reasonable engagement score ranges
    const scoreStats = await prisma.$queryRaw<Array<{ 
      min_score: number, 
      max_score: number, 
      avg_score: number 
    }>>`
      SELECT 
        MIN(weighted_engagement_score) as min_score,
        MAX(weighted_engagement_score) as max_score,
        AVG(weighted_engagement_score) as avg_score
      FROM mv_genre_engagement_metrics
    `;
    
    const stats = scoreStats[0];
    if (stats) {
      console.log(`📊 Engagement score statistics:`);
      console.log(`   - Min: ${stats.min_score?.toFixed(2) || 0}`);
      console.log(`   - Max: ${stats.max_score?.toFixed(2) || 0}`);
      console.log(`   - Avg: ${stats.avg_score?.toFixed(2) || 0}`);
      
      // Warn if max score seems unreasonably high
      if (Number(stats.max_score) > 1000) {
        console.warn(`⚠️  Maximum engagement score (${stats.max_score}) seems unusually high`);
      }
    }
    
    // Check for genre coverage
    const genreCoverage = await prisma.$queryRaw<Array<{ 
      genre: string, 
      student_count: number 
    }>>`
      SELECT 
        genre,
        COUNT(DISTINCT user_id) as student_count
      FROM mv_genre_engagement_metrics
      GROUP BY genre
      ORDER BY student_count DESC
    `;
    
    console.log(`📚 Genre coverage (top 10):`);
    genreCoverage.slice(0, 10).forEach(({ genre, student_count }) => {
      console.log(`   - ${genre}: ${student_count} students`);
    });
    
    // Check CEFR distribution
    const cefrDistribution = await prisma.$queryRaw<Array<{ 
      cefr_bucket: string, 
      student_count: number 
    }>>`
      SELECT 
        cefr_bucket,
        COUNT(DISTINCT user_id) as student_count
      FROM mv_genre_engagement_metrics
      GROUP BY cefr_bucket
      ORDER BY 
        CASE cefr_bucket
          WHEN 'A1' THEN 1
          WHEN 'A2' THEN 2
          WHEN 'B1' THEN 3
          WHEN 'B2' THEN 4
          WHEN 'C1' THEN 5
          WHEN 'C2' THEN 6
          ELSE 7
        END
    `;
    
    console.log(`🎯 CEFR level distribution:`);
    cefrDistribution.forEach(({ cefr_bucket, student_count }) => {
      console.log(`   - ${cefr_bucket}: ${student_count} students`);
    });
    
    console.log('✅ Metrics integrity validation completed');
    
  } catch (error) {
    console.error('❌ Failed to validate metrics integrity:', error);
    throw error;
  }
}

async function checkGenreAdjacencies() {
  console.log('🔗 Checking genre adjacency mappings...');
  
  try {
    const adjacencies = await prisma.genreAdjacency.findMany({
      orderBy: [
        { primaryGenre: 'asc' },
        { weight: 'desc' }
      ]
    });
    
    console.log(`📊 Found ${adjacencies.length} genre adjacency mappings`);
    
    // Group by primary genre
    const adjacencyMap = adjacencies.reduce((acc, adj) => {
      if (!acc[adj.primaryGenre]) {
        acc[adj.primaryGenre] = [];
      }
      acc[adj.primaryGenre].push({
        adjacent: adj.adjacentGenre,
        weight: adj.weight
      });
      return acc;
    }, {} as Record<string, Array<{ adjacent: string, weight: number }>>);
    
    console.log(`🎭 Genre adjacency summary:`);
    Object.entries(adjacencyMap).forEach(([primary, adjacents]) => {
      console.log(`   - ${primary}: ${adjacents.length} adjacent genres`);
      adjacents.slice(0, 3).forEach(({ adjacent, weight }) => {
        console.log(`     → ${adjacent} (${weight})`);
      });
    });
    
    // Check for orphaned genres (no adjacencies)
    const allGenresInMetrics = await prisma.$queryRaw<Array<{ genre: string }>>`
      SELECT DISTINCT genre FROM mv_genre_engagement_metrics
    `;
    
    const genresWithAdjacencies = new Set([
      ...adjacencies.map(a => a.primaryGenre),
      ...adjacencies.map(a => a.adjacentGenre)
    ]);
    
    const orphanedGenres = allGenresInMetrics
      .map(g => g.genre)
      .filter(genre => !genresWithAdjacencies.has(genre));
    
    if (orphanedGenres.length > 0) {
      console.warn(`⚠️  Found ${orphanedGenres.length} genres without adjacency mappings:`);
      orphanedGenres.forEach(genre => {
        console.warn(`     - ${genre}`);
      });
      console.warn(`   Consider adding adjacency mappings for these genres.`);
    }
    
  } catch (error) {
    console.error('❌ Failed to check genre adjacencies:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Genre Engagement Metrics Refresh Script');
  console.log('============================================\n');
  
  // Check for rebuild flag
  const rebuild = process.argv.includes('--rebuild');
  
  try {
    // Refresh materialized views
    await refreshGenreMetrics(rebuild);
    console.log('');
    
    // Validate data integrity
    await validateMetricsIntegrity();
    console.log('');
    
    // Check genre adjacencies
    await checkGenreAdjacencies();
    console.log('');
    
    console.log('🎉 All operations completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { refreshGenreMetrics, validateMetricsIntegrity, checkGenreAdjacencies };