"use client";

import { useEffect, useCallback } from "react";

interface TelemetryEvent {
  event: string;
  category: 'dashboard' | 'heatmap' | 'timeline' | 'navigation';
  userId?: string;
  sessionId: string;
  timestamp: number;
  properties: Record<string, any>;
}

class TelemetryTracker {
  private events: TelemetryEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private timer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startBatchFlush();
    this.setupPageUnloadHandler();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  track(
    event: string,
    category: TelemetryEvent['category'],
    properties: Record<string, any> = {}
  ) {
    const telemetryEvent: TelemetryEvent = {
      event,
      category,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      properties: {
        ...properties,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    };

    this.events.push(telemetryEvent);

    // Flush immediately if batch is full
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      const response = await fetch('/api/v1/telemetry/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventsToSend),
      });

      if (!response.ok) {
        console.warn('Failed to send telemetry events:', response.statusText);
        // Re-add events to the queue for retry
        this.events.unshift(...eventsToSend);
      }
    } catch (error) {
      console.warn('Error sending telemetry events:', error);
      // Re-add events to the queue for retry
      this.events.unshift(...eventsToSend);
    }
  }

  private startBatchFlush() {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private setupPageUnloadHandler() {
    // Flush events when the page is about to unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Handle visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

// Global tracker instance
let trackerInstance: TelemetryTracker | null = null;

export function useTelemetry() {
  useEffect(() => {
    if (!trackerInstance) {
      trackerInstance = new TelemetryTracker();
    }

    return () => {
      // Clean up on unmount (though this should rarely happen for dashboard)
      if (trackerInstance) {
        trackerInstance.destroy();
        trackerInstance = null;
      }
    };
  }, []);

  const track = useCallback((
    event: string,
    category: TelemetryEvent['category'],
    properties?: Record<string, any>
  ) => {
    if (trackerInstance) {
      trackerInstance.track(event, category, properties);
    }
  }, []);

  const setUserId = useCallback((userId: string) => {
    if (trackerInstance) {
      trackerInstance.setUserId(userId);
    }
  }, []);

  return { track, setUserId };
}

// Dashboard-specific tracking hooks
export function useDashboardTelemetry() {
  const { track, setUserId } = useTelemetry();

  const trackComponentLoad = useCallback((component: string, loadTime: number) => {
    track('dashboard.component_load_time', 'dashboard', {
      component,
      loadTime,
    });
  }, [track]);

  const trackComponentInteraction = useCallback((component: string, action: string, details?: Record<string, any>) => {
    track('dashboard.component_interaction', 'dashboard', {
      component,
      action,
      ...details,
    });
  }, [track]);

  const trackNavigation = useCallback((from: string, to: string) => {
    track('dashboard.navigation', 'navigation', {
      from,
      to,
    });
  }, [track]);

  const trackError = useCallback((error: string, component?: string) => {
    track('dashboard.error', 'dashboard', {
      error,
      component,
    });
  }, [track]);

  const trackPerformance = useCallback((metric: string, value: number, unit: string) => {
    track('dashboard.performance', 'dashboard', {
      metric,
      value,
      unit,
    });
  }, [track]);

  return {
    setUserId,
    trackComponentLoad,
    trackComponentInteraction,
    trackNavigation,
    trackError,
    trackPerformance,
  };
}

// Activity Heatmap specific tracking
export function useActivityHeatmapTelemetry() {
  const { track } = useTelemetry();

  const trackHeatmapView = useCallback((filters?: Record<string, any>) => {
    track('activity_heatmap.view', 'heatmap', {
      filters,
    });
  }, [track]);

  const trackBucketHovered = useCallback((date: string, value: number) => {
    track('activity_heatmap.bucket_hovered', 'heatmap', {
      date,
      value,
    });
  }, [track]);

  const trackBucketClicked = useCallback((date: string, value: number) => {
    track('activity_heatmap.bucket_clicked', 'heatmap', {
      date,
      value,
    });
  }, [track]);

  const trackFilterChanged = useCallback((filterType: string, filterValue: any) => {
    track('activity_heatmap.filter_changed', 'heatmap', {
      filterType,
      filterValue,
    });
  }, [track]);

  return {
    trackHeatmapView,
    trackBucketHovered,
    trackBucketClicked,
    trackFilterChanged,
  };
}

// Timeline specific tracking
export function useTimelineTelemetry() {
  const { track } = useTelemetry();

  const trackTimelineView = useCallback((filters?: Record<string, any>) => {
    track('activity_timeline.view', 'timeline', {
      filters,
    });
  }, [track]);

  const trackEventClicked = useCallback((eventId: string, eventType: string) => {
    track('activity_timeline.event_clicked', 'timeline', {
      eventId,
      eventType,
    });
  }, [track]);

  const trackFilterChanged = useCallback((filterType: string, filterValue: any) => {
    track('activity_timeline.filter_changed', 'timeline', {
      filterType,
      filterValue,
    });
  }, [track]);

  const trackScrolled = useCallback((scrollPosition: number, totalHeight: number) => {
    track('activity_timeline.scrolled', 'timeline', {
      scrollPosition,
      totalHeight,
      scrollPercentage: (scrollPosition / totalHeight) * 100,
    });
  }, [track]);

  return {
    trackTimelineView,
    trackEventClicked,
    trackFilterChanged,
    trackScrolled,
  };
}