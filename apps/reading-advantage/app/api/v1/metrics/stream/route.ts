/**
 * Server-Sent Events (SSE) endpoint for real-time metrics updates
 * 
 * This endpoint streams metrics:update events to connected clients
 * for real-time cache invalidation and UI updates.
 */

import { NextRequest } from 'next/server';
import { getMetricsCacheStats } from '@/lib/cache/metrics';

// Simple in-memory event emitter for metrics updates
interface MetricsUpdatePayload {
  views: string[];
  timestamp: string;
  success: number;
  failed: number;
}

class SimpleMetricsEmitter {
  private listeners: ((data: MetricsUpdatePayload) => void)[] = [];

  on(event: string, listener: (data: MetricsUpdatePayload) => void) {
    if (event === 'metrics:update') {
      this.listeners.push(listener);
    }
  }

  off(event: string, listener: (data: MetricsUpdatePayload) => void) {
    if (event === 'metrics:update') {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: MetricsUpdatePayload) {
    if (event === 'metrics:update') {
      this.listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('[SSE] Listener error:', error);
        }
      });
    }
  }
}

const metricsEmitter = new SimpleMetricsEmitter();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint for metrics updates
 * 
 * Usage:
 * ```ts
 * const eventSource = new EventSource('/api/v1/metrics/stream');
 * eventSource.addEventListener('metrics:update', (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Metrics updated:', data);
 * });
 * ```
 */
export async function GET(req: NextRequest) {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const send = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      send('connected', {
        timestamp: new Date().toISOString(),
        stats: getMetricsCacheStats(),
      });

      // Handle metrics updates
      const onMetricsUpdate = (payload: MetricsUpdatePayload) => {
        send('metrics:update', payload);
      };

      metricsEmitter.on('metrics:update', onMetricsUpdate);

      // Send periodic heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          send('heartbeat', {
            timestamp: new Date().toISOString(),
            stats: getMetricsCacheStats(),
          });
        } catch (error) {
          console.error('[SSE] Heartbeat error:', error);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on connection close
      req.signal.addEventListener('abort', () => {
        metricsEmitter.off('metrics:update', onMetricsUpdate);
        clearInterval(heartbeat);
        controller.close();
      });

    },
  });

  return new Response(stream, { headers });
}
