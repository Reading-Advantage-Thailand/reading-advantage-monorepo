import { clearMetricsCache, getMetricsCacheStats } from '@/lib/cache/metrics';

async function clearCache() {
  console.log('🗑️  Clearing metrics cache...\n');

  try {
    // Get cache stats before clearing
    const statsBefore = getMetricsCacheStats();
    console.log('📊 Cache stats before clearing:');
    console.log(JSON.stringify(statsBefore, null, 2));
    console.log();

    // Clear the cache
    clearMetricsCache();
    console.log('✅ Metrics cache cleared!\n');

    // Get cache stats after clearing
    const statsAfter = getMetricsCacheStats();
    console.log('📊 Cache stats after clearing:');
    console.log(JSON.stringify(statsAfter, null, 2));
    console.log();

    console.log('✨ Done! Please refresh your browser to see the updated Alignment Score.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearCache();
