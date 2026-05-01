/**
 * Query Optimizer for Dashboard Metrics
 * 
 * Provides optimized queries that minimize connection pool usage
 * by batching queries and using transactions efficiently.
 */

import { prisma } from "@/lib/prisma";

/**
 * Batch multiple queries into a single transaction
 * This reduces connection pool usage significantly
 */
export async function executeBatchQuery<T extends Record<string, any>>(
  queries: Array<Promise<any>>
): Promise<T[]> {
  try {
    // Execute all queries in a single transaction
    const results = await prisma.$transaction(queries as any);
    return results;
  } catch (error) {
    console.error('[QueryOptimizer] Batch query failed:', error);
    throw error;
  }
}

/**
 * Execute a raw SQL query with connection pooling optimization
 */
export async function executeOptimizedRaw<T = any>(
  query: string,
  ...params: any[]
): Promise<T[]> {
  try {
    return await prisma.$queryRawUnsafe<T[]>(query, ...params);
  } catch (error) {
    console.error('[QueryOptimizer] Raw query failed:', query, error);
    throw error;
  }
}

/**
 * Execute multiple raw queries in a single transaction
 */
export async function executeBatchRawQueries<T extends Record<string, any>>(
  queries: Record<keyof T, { query: string; params: any[] }>
): Promise<T> {
  const queryKeys = Object.keys(queries) as Array<keyof T>;
  
  try {
    // Create query promises
    const queryPromises = queryKeys.map(key => 
      prisma.$queryRawUnsafe(queries[key].query, ...queries[key].params)
    );

    // Execute all queries in a single transaction
    const results = await prisma.$transaction(queryPromises as any);
    
    // Map results back to their keys
    const mappedResults = {} as T;
    queryKeys.forEach((key, index) => {
      (mappedResults as any)[key] = results[index];
    });

    return mappedResults;
  } catch (error) {
    console.error('[QueryOptimizer] Batch raw queries failed:', error);
    throw error;
  }
}

/**
 * Debounce query execution to prevent excessive database calls
 */
const queryDebounceMap = new Map<string, {
  timer: NodeJS.Timeout;
  promise: Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}>();

export function debounceQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  delayMs: number = 100
): Promise<T> {
  // If there's an existing pending query, return it
  const existing = queryDebounceMap.get(key);
  if (existing) {
    return existing.promise;
  }

  // Create a new debounced promise
  let resolve: (value: T) => void;
  let reject: (error: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const timer = setTimeout(async () => {
    try {
      const result = await queryFn();
      resolve!(result);
    } catch (error) {
      reject!(error);
    } finally {
      queryDebounceMap.delete(key);
    }
  }, delayMs);

  queryDebounceMap.set(key, {
    timer,
    promise,
    resolve: resolve!,
    reject: reject!,
  });

  return promise;
}

/**
 * Connection pool health check
 */
export async function checkConnectionHealth(): Promise<{
  healthy: boolean;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
}> {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Note: Prisma doesn't expose pool stats directly
    // This is a placeholder for monitoring
    return {
      healthy: true,
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
    };
  } catch (error) {
    console.error('[QueryOptimizer] Connection health check failed:', error);
    return {
      healthy: false,
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
    };
  }
}
