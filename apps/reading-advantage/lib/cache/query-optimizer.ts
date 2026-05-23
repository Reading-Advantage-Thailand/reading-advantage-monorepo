/**
 * Query Optimizer for Dashboard Metrics
 * 
 * Provides optimized queries that minimize connection pool usage
 * by batching queries and using transactions efficiently.
 */

import { db, sql } from "@reading-advantage/db";

/**
 * Batch multiple queries by awaiting them together
 * (Drizzle does not expose Prisma's interactive $transaction over a list of
 * pre-built promises; callers should pass already-issued query promises.)
 */
export async function executeBatchQuery<T extends Record<string, any>>(
  queries: Array<Promise<any>>
): Promise<T[]> {
  try {
    const results = await Promise.all(queries);
    return results as T[];
  } catch (error) {
    console.error('[QueryOptimizer] Batch query failed:', error);
    throw error;
  }
}

/**
 * Execute a raw SQL query with connection pooling optimization
 * Note: parameters are interpolated positionally via sql.raw placeholders;
 * callers must pre-sanitize inputs (this is a port-as-is helper).
 */
export async function executeOptimizedRaw<T = any>(
  query: string,
  ...params: any[]
): Promise<T[]> {
  try {
    let i = 0;
    const interpolated = query.replace(/\$\d+/g, () => {
      const v = params[i++];
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    const result = (await db.execute(sql.raw(interpolated))) as unknown as T[];
    return result;
  } catch (error) {
    console.error('[QueryOptimizer] Raw query failed:', query, error);
    throw error;
  }
}

/**
 * Execute multiple raw queries in parallel (no interactive transaction here;
 * Drizzle's transaction API uses a callback receiving a tx handle).
 */
export async function executeBatchRawQueries<T extends Record<string, any>>(
  queries: Record<keyof T, { query: string; params: any[] }>
): Promise<T> {
  const queryKeys = Object.keys(queries) as Array<keyof T>;

  try {
    const queryPromises = queryKeys.map(key =>
      executeOptimizedRaw(queries[key].query, ...queries[key].params)
    );

    const results = await Promise.all(queryPromises);

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
    await db.execute(sql`SELECT 1`);

    // Note: Drizzle/postgres-js does not expose pool stats directly here
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
