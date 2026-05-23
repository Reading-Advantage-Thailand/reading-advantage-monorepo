import { db, sql } from "@reading-advantage/db";

type AlignmentMetricRow = {
  scope_id: string;
  scope_type: string;
  total_readings: number | bigint | string;
  aligned_count: number | bigint | string;
  below_count: number | bigint | string;
  above_count: number | bigint | string;
  unknown_count: number | bigint | string;
  alignment_percentage: number | string;
};

async function checkAlignmentData() {
  console.log('🔍 Checking alignment data...\n');

  try {
    // Check mv_alignment_metrics
    const alignmentMetrics = (await db.execute(sql`
      SELECT * FROM mv_alignment_metrics
      WHERE scope_type = 'student'
      LIMIT 10
    `)) as unknown as AlignmentMetricRow[];

    console.log('📊 Alignment Metrics (first 10 students):');
    console.log(alignmentMetrics);
    console.log(`\nTotal records: ${alignmentMetrics.length}\n`);

    // Check aggregated alignment for all students
    const aggregatedAlignment = (await db.execute(sql`
      SELECT 
        SUM(total_readings)::int as total_readings,
        SUM(aligned_count)::int as aligned_count
      FROM mv_alignment_metrics
      WHERE scope_type = 'student'
    `)) as unknown as Array<{
      total_readings: bigint | number | string | null;
      aligned_count: bigint | number | string | null;
    }>;

    console.log('📈 Aggregated Alignment Data:');
    console.log(aggregatedAlignment);
    
    if (aggregatedAlignment[0]) {
      const { total_readings, aligned_count } = aggregatedAlignment[0];
      const totalReadings = Number(total_readings ?? 0);
      const alignedCount = Number(aligned_count ?? 0);
      const alignmentScore = totalReadings > 0
        ? Math.round((alignedCount / totalReadings) * 100)
        : 0;
      
      console.log(`\n✨ Alignment Score: ${alignmentScore}%`);
      console.log(`   Total Readings: ${total_readings}`);
      console.log(`   Aligned Count: ${aligned_count}`);
    }

    // Check UserActivity with article data
    const activityWithArticles = (await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM user_activity
      WHERE target_id IS NOT NULL
    `)) as unknown as Array<{ count: number | bigint | string }>;

    console.log(`\n📚 UserActivity records with articles: ${activityWithArticles[0]?.count || 0}`);

    // Check Articles with levels
    const articlesWithLevels = (await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM articles
      WHERE level IS NOT NULL
    `)) as unknown as Array<{ count: number | bigint | string }>;

    console.log(`📖 Articles with levels: ${articlesWithLevels[0]?.count || 0}`);

    // Check Users with levels
    const usersWithLevels = (await db.execute(sql`
      SELECT COUNT(*)::int as count
      FROM users
      WHERE level IS NOT NULL
    `)) as unknown as Array<{ count: number | bigint | string }>;

    console.log(`👥 Users with levels: ${usersWithLevels[0]?.count || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAlignmentData();
