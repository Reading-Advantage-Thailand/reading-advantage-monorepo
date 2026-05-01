"use client";

import React, { Suspense, useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useScopedI18n } from "@/locales/client";
import { cn } from "@/lib/utils";
import { useDashboardTelemetry } from "@/lib/telemetry/dashboard-telemetry";
import {
  BookOpen,
  Brain,
  ClipboardCheck,
  Target,
  Clock,
  Calendar,
  TrendingUp,
  CheckCircle,
  Circle,
  AlertCircle,
} from "lucide-react";

// Types
interface TimelineEvent {
  id: string;
  type: 'assignment' | 'srs' | 'reading' | 'practice';
  title: string;
  description?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface TimelineData {
  scope: 'student';
  entityId: string;
  timeframe: string;
  timezone: string;
  events: TimelineEvent[];
  metadata: {
    totalEvents: number;
    eventTypes: Record<string, number>;
    dateRange: {
      start: string;
      end: string;
    };
  };
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

interface ActivityTimelineProps {
  entityId?: string;
  defaultTimeframe?: '7d' | '30d' | '90d';
  showFilters?: boolean;
  showStats?: boolean;
  className?: string;
  onEventClick?: (event: TimelineEvent) => void;
}

// Hook for fetching timeline data
function useActivityTimeline(
  entityId?: string,
  timeframe: string = '30d'
) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        format: 'timeline',
        scope: 'student',
        timeframe,
      });

      if (entityId) {
        params.append('entityId', entityId);
      }

      const response = await fetch(`/api/v1/metrics/activity?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activity timeline: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching activity timeline:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [entityId, timeframe]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Event type configuration
const EVENT_CONFIG = {
  assignment: {
    icon: ClipboardCheck,
    color: 'bg-blue-500 dark:bg-blue-600',
    lightColor: 'bg-blue-100 dark:bg-blue-950/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    label: 'assignment',
  },
  srs: {
    icon: Brain,
    color: 'bg-purple-500 dark:bg-purple-600',
    lightColor: 'bg-purple-100 dark:bg-purple-950/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    label: 'srs',
  },
  reading: {
    icon: BookOpen,
    color: 'bg-green-500 dark:bg-green-600',
    lightColor: 'bg-green-100 dark:bg-green-950/30',
    textColor: 'text-green-700 dark:text-green-400',
    label: 'reading',
  },
  practice: {
    icon: Target,
    color: 'bg-orange-500 dark:bg-orange-600',
    lightColor: 'bg-orange-100 dark:bg-orange-950/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    label: 'practice',
  },
};

// Timeline event component
function TimelineEventCard({ 
  event, 
  onClick,
  isLast = false,
  tc,
}: { 
  event: TimelineEvent; 
  onClick?: (event: TimelineEvent) => void;
  isLast?: boolean;
  tc?: any;
}) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const eventDate = new Date(event.timestamp);
  
  // Format duration if available
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600 * 10) / 10}h`;
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
      )}
      
      <div 
        className={cn(
          "flex gap-4 p-4 rounded-lg border transition-colors",
          onClick && "cursor-pointer hover:bg-accent/50",
          config.lightColor,
          "dark:bg-card"
        )}
        onClick={() => onClick?.(event)}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(event);
          }
        }}
      >
        {/* Icon */}
        <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center", config.color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn("font-medium text-sm", config.textColor)}>
                {event.title}
              </h4>
              {event.description && (
                <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <time>
                {eventDate.toLocaleDateString()} {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
              {event.duration && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDuration(event.duration)}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Metadata badges */}
          {event.metadata && (
            <div className="flex flex-wrap gap-1 mt-2">
              {event.type === 'assignment' && event.metadata.status && (
                <Badge 
                  variant={event.metadata.status === 'COMPLETED' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {event.metadata.status === 'COMPLETED' ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : event.metadata.status === 'IN_PROGRESS' ? (
                    <Circle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {tc?.(`status.${(event.metadata.status || '').toLowerCase().replace(/[^a-z0-9]+/g,'_')}`) || event.metadata.status}
                </Badge>
              )}
              
              {event.type === 'reading' && event.metadata.completed && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {tc?.("labels.completed")}
                </Badge>
              )}
              
              {event.metadata.cefrLevel && (
                <Badge variant="outline" className="text-xs">
                  {event.metadata.cefrLevel}
                </Badge>
              )}
              
              {event.metadata.genre && (
                <Badge variant="outline" className="text-xs">
                  {event.metadata.genre}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component
export default function ActivityTimeline({
  entityId,
  defaultTimeframe = '30d',
  showFilters = true,
  showStats = true,
  className,
  onEventClick,
}: ActivityTimelineProps) {
  const t = useScopedI18n("pages.student.reportpage");
  const tc = useScopedI18n("components.activityTimeline") as any;
  const telemetry = useDashboardTelemetry();
  
  // State for filters
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  
  // Refs for tracking
  const componentLoadTime = useRef<number>(Date.now());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const { data, loading, error } = useActivityTimeline(entityId, timeframe);

  // Track component view and load time
  useEffect(() => {
    if (data && !loading) {
      const loadTime = Date.now() - componentLoadTime.current;
      
      telemetry.timelineView({
        entityId: entityId || 'current-user',
        timeframe,
        totalEvents: data.metadata.totalEvents,
      });
      
      telemetry.componentLoadTime('activity-timeline', loadTime, {
        entityId,
        totalEvents: data.metadata.totalEvents,
        eventTypes: Object.keys(data.metadata.eventTypes),
      });
    }
  }, [data, loading, entityId, timeframe, telemetry]);

  // Track errors
  useEffect(() => {
    if (error) {
      telemetry.trackError(new Error(error), {
        component: 'activity-timeline',
        entityId,
        timeframe,
      });
    }
  }, [error, telemetry, entityId, timeframe]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!data) return [];
    
    return data.events.filter(event => 
      selectedEventTypes.length === 0 || selectedEventTypes.includes(event.type)
    );
  }, [data, selectedEventTypes]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(event);
    });
    
    // Sort groups by date (newest first)
    return Array.from(groups.entries())
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredEvents]);

  // Event type filter handler
  const toggleEventType = useCallback((eventType: string) => {
    const newTypes = selectedEventTypes.includes(eventType) 
      ? selectedEventTypes.filter(t => t !== eventType)
      : [...selectedEventTypes, eventType];
      
    setSelectedEventTypes(newTypes);
    
    // Track filter change
    telemetry.timelineFilterChange({
      entityId: entityId || 'current-user',
      timeframe,
      eventType,
    });
  }, [selectedEventTypes, telemetry, entityId, timeframe]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe as typeof timeframe);
    
    telemetry.timelineFilterChange({
      entityId: entityId || 'current-user',
      timeframe: newTimeframe,
    });
  }, [telemetry, entityId]);

  // Handle event click with telemetry
  const handleEventClick = useCallback((event: TimelineEvent) => {
    telemetry.timelineEventClick({
      entityId: entityId || 'current-user',
      timeframe,
      eventType: event.type,
      eventId: event.id,
    });
    
    onEventClick?.(event);
  }, [telemetry, entityId, timeframe, onEventClick]);

  // Handle scroll with throttled telemetry
  const handleScroll = useCallback((scrollTop: number) => {
    // Throttle scroll events to avoid spam
    const now = Date.now();
    if (now - (handleScroll as any).lastCall < 1000) return;
    (handleScroll as any).lastCall = now;
    
    telemetry.timelineScroll({
      entityId: entityId || 'current-user',
      timeframe,
      totalEvents: data?.metadata.totalEvents,
    });
  }, [telemetry, entityId, timeframe, data]);

  // Loading state
  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive py-8">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{tc("errorLoading")}</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.events.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="w-8 h-8 mx-auto mb-2" />
            <p>{tc("emptyTitle")}</p>
            <p className="text-sm">{tc("emptyDescription")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t("activityTimeline.title")}
              </CardTitle>
            <CardDescription>
              {tc("summary", { total: data.metadata.totalEvents, start: data.metadata.dateRange.start, end: data.metadata.dateRange.end })}
            </CardDescription>
          </div>
          
          {showFilters && (
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">{tc("timeframe.7d")}</SelectItem>
                    <SelectItem value="30d">{tc("timeframe.30d")}</SelectItem>
                    <SelectItem value="90d">{tc("timeframe.90d")}</SelectItem>
                  </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Event type filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(data.metadata.eventTypes).map(([eventType, count]) => {
              const config = EVENT_CONFIG[eventType as keyof typeof EVENT_CONFIG];
              if (!config) return null;
              
              return (
                <Badge
                  key={eventType}
                  variant={selectedEventTypes.includes(eventType) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-xs",
                    selectedEventTypes.includes(eventType) && config.color
                  )}
                  onClick={() => toggleEventType(eventType)}
                >
                  {(tc as any)(`labels.${config.label}`) || eventType} ({count})
                </Badge>
              );
            })}
            {selectedEventTypes.length > 0 && (
                <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedEventTypes([])}
              >
                {tc("clearFilters")}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            {Object.entries(data.metadata.eventTypes).map(([eventType, count]) => {
              const config = EVENT_CONFIG[eventType as keyof typeof EVENT_CONFIG];
              if (!config) return null;
              
              const Icon = config.icon;
              
              return (
                <div key={eventType} className="text-center">
                  <div className={cn("w-8 h-8 mx-auto mb-1 rounded-full flex items-center justify-center", config.color)}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="font-medium text-sm">{count}</div>
                  <div className="text-xs text-muted-foreground">{(tc as any)(`labels.${config.label}`) || eventType}</div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Timeline */}
        <ScrollArea 
          className="h-96"
          ref={scrollAreaRef}
          onScrollCapture={(e) => {
            const target = e.target as HTMLElement;
            handleScroll(target.scrollTop);
          }}
        >
          <div className="space-y-6">
            {groupedEvents.map(([date, events]) => (
              <div key={date}>
                <div className="sticky top-0 bg-background py-2 mb-4 z-10">
                  <h3 className="font-medium text-sm text-foreground border-b pb-1">
                    {new Date(date).toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>
                
                <div className="space-y-3 ml-2">
                  {events.map((event, index) => (
                    <TimelineEventCard
                      key={event.id}
                      event={event}
                      onClick={handleEventClick}
                      isLast={index === events.length - 1}
                      tc={tc}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Screen reader summary */}
        <div className="sr-only">
          {tc('srSummaryStart')} {data.metadata.totalEvents} {tc('srSummaryMid')} {data.metadata.dateRange.start} {tc('srSummaryTo')} {data.metadata.dateRange.end}. {Object.entries(data.metadata.eventTypes).map(([type, count]) => `${count} ${tc(`types.${type}`) || type} ${tc('srEventSuffix') || 'events'}`).join(', ')}.
        </div>
      </CardContent>
    </Card>
  );
}