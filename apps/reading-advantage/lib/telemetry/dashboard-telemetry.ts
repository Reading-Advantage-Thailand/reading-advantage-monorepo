/**
 * Dashboard Telemetry Service
 * 
 * Tracks user interactions with dashboard components for analytics
 * and performance monitoring.
 */

// Types
export interface TelemetryEvent {
  event: string;
  category: 'dashboard' | 'heatmap' | 'timeline' | 'navigation';
  userId?: string;
  sessionId?: string;
  timestamp: number;
  properties: Record<string, any>;
}

export interface HeatmapInteraction extends TelemetryEvent {
  category: 'heatmap';
  properties: {
    scope: 'student' | 'class' | 'school';
    entityId: string;
    timeframe: string;
    granularity: 'hour' | 'day';
    activityTypes?: string[];
    bucketDate?: string;
    bucketActivityCount?: number;
    interactionType: 'hover' | 'click' | 'filter_change' | 'view_load';
    duration?: number;
  };
}

export interface TimelineInteraction extends TelemetryEvent {
  category: 'timeline';
  properties: {
    entityId: string;
    timeframe: string;
    eventType?: string;
    eventId?: string;
    interactionType: 'event_click' | 'filter_change' | 'scroll' | 'view_load';
    totalEvents?: number;
  };
}

export interface DashboardNavigation extends TelemetryEvent {
  category: 'navigation';
  properties: {
    from: string;
    to: string;
    navigationMethod: 'click' | 'keyboard' | 'programmatic';
    loadTime?: number;
  };
}

// Telemetry service
class DashboardTelemetryService {
  private sessionId: string;
  private userId?: string;
  private queue: TelemetryEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushInterval();
    
    // Respect user privacy preferences
    if (typeof window !== 'undefined') {
      // Check for Do Not Track
      if (navigator.doNotTrack === '1' || window.localStorage.getItem('analytics-disabled') === 'true') {
        this.isEnabled = false;
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushInterval(): void {
    if (typeof window === 'undefined') return;
    
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000); // Flush every 10 seconds

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public disable(): void {
    this.isEnabled = false;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('analytics-disabled', 'true');
    }
  }

  public enable(): void {
    this.isEnabled = true;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('analytics-disabled');
    }
  }

  private track(event: Omit<TelemetryEvent, 'timestamp' | 'sessionId' | 'userId'>): void {
    if (!this.isEnabled) return;

    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.queue.push(telemetryEvent);

    // If queue is full, flush immediately
    if (this.queue.length >= 50) {
      this.flush();
    }
  }

  private async flush(synchronous: boolean = false): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      const method = synchronous ? 'sendBeacon' : 'fetch';
      
      if (synchronous && navigator.sendBeacon) {
        navigator.sendBeacon('/api/v1/telemetry/dashboard', JSON.stringify(events));
      } else {
        await fetch('/api/v1/telemetry/dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(events),
          keepalive: synchronous,
        });
      }
    } catch (error) {
      console.warn('[TELEMETRY] Failed to send events:', error);
      // Re-queue events on failure (but limit retries)
      if (events.length < 100) {
        this.queue = [...events, ...this.queue];
      }
    }
  }

  // Heatmap interactions
  public heatmapView = (properties: Omit<HeatmapInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_heatmap.view',
      category: 'heatmap',
      properties: {
        ...properties,
        interactionType: 'view_load',
      },
    });
  }

  public heatmapBucketHover = (properties: Omit<HeatmapInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_heatmap.bucket_hovered',
      category: 'heatmap',
      properties: {
        ...properties,
        interactionType: 'hover',
      },
    });
  }

  public heatmapBucketClick = (properties: Omit<HeatmapInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_heatmap.bucket_clicked',
      category: 'heatmap',
      properties: {
        ...properties,
        interactionType: 'click',
      },
    });
  }

  public heatmapFilterChange = (properties: Omit<HeatmapInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_heatmap.filter_changed',
      category: 'heatmap',
      properties: {
        ...properties,
        interactionType: 'filter_change',
      },
    });
  }

  // Timeline interactions
  public timelineView = (properties: Omit<TimelineInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_timeline.view',
      category: 'timeline',
      properties: {
        ...properties,
        interactionType: 'view_load',
      },
    });
  }

  public timelineEventClick = (properties: Omit<TimelineInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_timeline.event_clicked',
      category: 'timeline',
      properties: {
        ...properties,
        interactionType: 'event_click',
      },
    });
  }

  public timelineFilterChange = (properties: Omit<TimelineInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_timeline.filter_changed',
      category: 'timeline',
      properties: {
        ...properties,
        interactionType: 'filter_change',
      },
    });
  }

  public timelineScroll = (properties: Omit<TimelineInteraction['properties'], 'interactionType'>): void => {
    this.track({
      event: 'activity_timeline.scrolled',
      category: 'timeline',
      properties: {
        ...properties,
        interactionType: 'scroll',
      },
    });
  }

  // Navigation tracking
  public dashboardNavigation = (properties: DashboardNavigation['properties']): void => {
    this.track({
      event: 'dashboard.navigation',
      category: 'navigation',
      properties,
    });
  }

  // Performance tracking
  public componentLoadTime = (component: string, loadTime: number, properties: Record<string, any> = {}): void => {
    this.track({
      event: 'dashboard.component_load_time',
      category: 'dashboard',
      properties: {
        component,
        loadTime,
        ...properties,
      },
    });
  }

  // Error tracking
  public trackError = (error: Error, context: Record<string, any> = {}): void => {
    this.track({
      event: 'dashboard.error',
      category: 'dashboard',
      properties: {
        error: error.message,
        stack: error.stack,
        context,
      },
    });
  }

  // Generic event tracking
  public trackEvent = (event: string, properties: Record<string, any> = {}): void => {
    this.track({
      event,
      category: 'dashboard',
      properties,
    });
  }

  // Cleanup
  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(true);
  }
}

// Singleton instance
export const dashboardTelemetry = new DashboardTelemetryService();

// React hook for easier usage
export function useDashboardTelemetry() {
  return dashboardTelemetry;
}