/**
 * React hooks for real-time metrics updates via SSE
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export interface MetricsUpdateEvent {
  views: string[];
  timestamp: string;
  success: number;
  failed: number;
}

export interface CacheStats {
  size: number;
  pendingRefreshes: number;
  totalHits: number;
  totalMisses: number;
  totalStaleHits: number;
  totalInvalidations: number;
  totalErrors: number;
  hitRate: number;
}

export interface UseMetricsStreamOptions {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 5000) */
  reconnectDelay?: number;
  /** Callback when metrics are updated */
  onUpdate?: (event: MetricsUpdateEvent) => void;
  /** Callback when connected */
  onConnected?: (stats: CacheStats) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook to listen to real-time metrics updates
 * 
 * @example
 * ```tsx
 * const { connected, stats, lastUpdate } = useMetricsStream({
 *   onUpdate: (event) => {
 *     console.log('Metrics updated:', event.views);
 *     // Invalidate your queries/cache here
 *   }
 * });
 * ```
 */
export function useMetricsStream(options: UseMetricsStreamOptions = {}) {
  const {
    autoReconnect = true,
    reconnectDelay = 5000,
    onUpdate,
    onConnected,
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<MetricsUpdateEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const eventSource = new EventSource('/api/v1/metrics/stream');
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        setConnected(true);
        setStats(data.stats);
        setError(null);
        onConnected?.(data.stats);
        console.log('[METRICS-STREAM] Connected');
      });

      eventSource.addEventListener('metrics:update', (event) => {
        const data: MetricsUpdateEvent = JSON.parse(event.data);
        setLastUpdate(data);
        onUpdate?.(data);
        console.log('[METRICS-STREAM] Metrics updated:', data.views);
      });

      eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        setStats(data.stats);
      });

      eventSource.onerror = (err) => {
        const errorObj = new Error('EventSource connection error');
        setError(errorObj);
        setConnected(false);
        onError?.(errorObj);
        console.error('[METRICS-STREAM] Connection error');

        // Reconnect if enabled
        if (autoReconnect && !reconnectTimeoutRef.current) {
          console.log(`[METRICS-STREAM] Reconnecting in ${reconnectDelay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectDelay);
        }
      };
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      onError?.(errorObj);
    }
  }, [autoReconnect, reconnectDelay, onUpdate, onConnected, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnected(false);
    console.log('[METRICS-STREAM] Disconnected');
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    stats,
    lastUpdate,
    error,
    reconnect: connect,
    disconnect,
  };
}

/**
 * Hook to automatically invalidate queries when metrics are updated
 * 
 * @example
 * ```tsx
 * const { mutate } = useSWR('/api/v1/metrics/...');
 * 
 * useMetricsInvalidation(['mv_student_velocity'], () => {
 *   mutate(); // Revalidate SWR cache
 * });
 * ```
 */
export function useMetricsInvalidation(
  watchViews: string[],
  onInvalidate: () => void
) {
  useMetricsStream({
    onUpdate: (event) => {
      // Check if any watched views were updated
      const shouldInvalidate = event.views.some((view) =>
        watchViews.includes(view)
      );

      if (shouldInvalidate) {
        console.log('[METRICS-INVALIDATION] Invalidating cache for:', watchViews);
        onInvalidate();
      }
    },
  });
}
