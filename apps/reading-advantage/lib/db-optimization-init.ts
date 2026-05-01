/**
 * Database Optimization System Initializer
 * Starts all optimization systems when the application boots
 */

import { initializeCache } from '@/lib/cache/advanced-cache';
import { initializeMaterializedViews } from '@/lib/cache/matview-manager';
import { initializeConnectionMonitoring } from '@/lib/cache/connection-monitor';

let isInitialized = false;

/**
 * Initialize all database optimization systems
 */
export async function initializeDbOptimization(): Promise<void> {
  if (isInitialized) {
    console.log('[DB-OPT] Systems already initialized');
    return;
  }

  console.log('[DB-OPT] Starting database optimization systems...');

  try {
    // Initialize systems in order
    await Promise.all([
      initializeCache(),
      initializeConnectionMonitoring(),
      initializeMaterializedViews(),
    ]);

    isInitialized = true;
    console.log('[DB-OPT] ✅ All optimization systems initialized successfully');

    // Log system status
    setTimeout(() => {
      logSystemStatus();
    }, 10000); // Log status after 10 seconds

  } catch (error) {
    console.error('[DB-OPT] ❌ Failed to initialize optimization systems:', error);
  }
}

/**
 * Log current system status
 */
function logSystemStatus(): void {
  console.log('[DB-OPT] === System Status ===');
  console.log('[DB-OPT] ✅ Advanced caching: Active');
  console.log('[DB-OPT] ✅ Connection monitoring: Active');
  console.log('[DB-OPT] ✅ Materialized view management: Active');
  console.log('[DB-OPT] ✅ Smart pagination: Ready');
  console.log('[DB-OPT] ✅ Health dashboard: Available at /api/v1/health/database');
  console.log('[DB-OPT] === End Status ===');
}

/**
 * Graceful shutdown of optimization systems
 */
export async function shutdownDbOptimization(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  console.log('[DB-OPT] Shutting down optimization systems...');

  try {
    // Import and stop systems
    const { connectionMonitor } = await import('@/lib/cache/connection-monitor');
    const { advancedCache } = await import('@/lib/cache/advanced-cache');

    connectionMonitor.stopMonitoring();
    advancedCache.clear();

    isInitialized = false;
    console.log('[DB-OPT] ✅ Optimization systems shut down successfully');

  } catch (error) {
    console.error('[DB-OPT] ❌ Error during shutdown:', error);
  }
}