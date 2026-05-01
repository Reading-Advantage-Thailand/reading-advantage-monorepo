import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAlignmentData() {
  console.log('🔍 Checking alignment data...\n');

  try {
    // Check mv_alignment_metrics
    const alignmentMetrics = await prisma.$queryRaw<Array<{
      scope_id: string;
      scope_type: string;
      total_readings: number;
      aligned_count: number;
      below_count: number;
      above_count: number;
      unknown_count: number;
      alignment_percentage: number;
    }>>`
      SELECT * FROM mv_alignment_metrics
      WHERE scope_type = 'student'
      LIMIT 10
    `;

    console.log('📊 Alignment Metrics (first 10 students):');
    console.log(alignmentMetrics);
    console.log(`\nTotal records: ${alignmentMetrics.length}\n`);

    // Check aggregated alignment for all students
    const aggregatedAlignment = await prisma.$queryRaw<Array<{
      total_readings: bigint;
      aligned_count: bigint;
    }>>`
      SELECT 
        SUM(total_readings)::int as total_readings,
        SUM(aligned_count)::int as aligned_count
      FROM mv_alignment_metrics
      WHERE scope_type = 'student'
    `;

    console.log('📈 Aggregated Alignment Data:');
    console.log(aggregatedAlignment);
    
    if (aggregatedAlignment[0]) {
      const { total_readings, aligned_count } = aggregatedAlignment[0];
      const alignmentScore = Number(total_readings) > 0
        ? Math.round((Number(aligned_count) / Number(total_readings)) * 100)
        : 0;
      
      console.log(`\n✨ Alignment Score: ${alignmentScore}%`);
      console.log(`   Total Readings: ${total_readings}`);
      console.log(`   Aligned Count: ${aligned_count}`);
    }

    // Check UserActivity with article data
    const activityWithArticles = await prisma.$queryRaw<Array<{
      count: bigint;
    }>>`
      SELECT COUNT(*)::int as count
      FROM "UserActivity"
      WHERE article_id IS NOT NULL
    `;

    console.log(`\n📚 UserActivity records with articles: ${activityWithArticles[0]?.count || 0}`);

    // Check Articles with levels
    const articlesWithLevels = await prisma.$queryRaw<Array<{
      count: bigint;
    }>>`
      SELECT COUNT(*)::int as count
      FROM "Article"
      WHERE level IS NOT NULL
    `;

    console.log(`📖 Articles with levels: ${articlesWithLevels[0]?.count || 0}`);

    // Check Users with levels
    const usersWithLevels = await prisma.$queryRaw<Array<{
      count: bigint;
    }>>`
      SELECT COUNT(*)::int as count
      FROM "User"
      WHERE level IS NOT NULL
    `;

    console.log(`👥 Users with levels: ${usersWithLevels[0]?.count || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlignmentData();
