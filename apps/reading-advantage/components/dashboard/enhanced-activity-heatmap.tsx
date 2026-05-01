"use client";

import React, { Suspense, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useScopedI18n } from "@/locales/client";
import { cn } from "@/lib/utils";
import { useDashboardTelemetry } from "@/lib/telemetry/dashboard-telemetry";

// Types
interface ActivityHeatmapBucket {
  date: string;
  hour: number;
  dayOfWeek: number;
  activityType: string;
  activityCount: number;
  completedCount: number;
  uniqueStudents: number;
  totalDurationMinutes: number;
  avgDurationMinutes: number;
}

interface ActivityHeatmapData {
  scope: 'student' | 'class' | 'school';
  entityId: string;
  timeframe: string;
  granularity: 'hour' | 'day';
  timezone: string;
  activityTypes: string[];
  buckets: ActivityHeatmapBucket[];
  metadata: {
    totalActivities: number;
    uniqueStudents: number;
    dateRange: {
      start: string;
      end: string;
    };
    availableActivityTypes: string[];
  };
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

interface EnhancedActivityHeatMapProps {
  scope?: 'student' | 'class' | 'school';
  entityId?: string;
  defaultTimeframe?: '7d' | '30d' | '90d' | '6m';
  defaultGranularity?: 'hour' | 'day';
  showFilters?: boolean;
  showStats?: boolean;
  className?: string;
  onBucketHover?: (bucket: ActivityHeatmapBucket | null) => void;
  onBucketClick?: (bucket: ActivityHeatmapBucket) => void;
}

// Hook for fetching activity heatmap data
function useActivityHeatmap(
  scope: 'student' | 'class' | 'school',
  entityId?: string,
  timeframe: string = '30d',
  granularity: 'hour' | 'day' = 'day',
  activityTypes: string[] = []
) {
  const [data, setData] = useState<ActivityHeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        format: 'heatmap',
        scope,
        timeframe,
        granularity,
      });

      if (entityId) {
        params.append('entityId', entityId);
      }

      if (activityTypes.length > 0) {
        params.append('activityTypes', activityTypes.join(','));
      }

      const response = await fetch(`/api/v1/metrics/activity?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activity heatmap: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching activity heatmap:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [scope, entityId, timeframe, granularity, activityTypes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Activity type color mapping
const ACTIVITY_TYPE_COLORS = {
  READING: 'bg-blue-500 hover:bg-blue-600',
  QUESTIONS: 'bg-green-500 hover:bg-green-600', 
  FLASHCARDS: 'bg-purple-500 hover:bg-purple-600',
  PRACTICE: 'bg-orange-500 hover:bg-orange-600',
  ASSESSMENT: 'bg-red-500 hover:bg-red-600',
  RATING: 'bg-yellow-500 hover:bg-yellow-600',
  OTHER: 'bg-gray-500 hover:bg-gray-600',
};

// Activity type labels will be provided by i18n (mapped below inside component)

// Main component
export default function EnhancedActivityHeatMap({
  scope = 'student',
  entityId,
  defaultTimeframe = '30d',
  defaultGranularity = 'day',
  showFilters = true,
  showStats = true,
  className,
  onBucketHover,
  onBucketClick,
}: EnhancedActivityHeatMapProps) {
  const t = useScopedI18n("pages.student.reportpage");
  const telemetry = useDashboardTelemetry();
  
  // State for filters
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [granularity, setGranularity] = useState(defaultGranularity);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([]);
  const [hoveredBucket, setHoveredBucket] = useState<ActivityHeatmapBucket | null>(null);

  // Refs for accessibility
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [focusedDateIndex, setFocusedDateIndex] = useState(0);
  const componentLoadTime = useRef<number>(Date.now());

  // Fetch data
  const { data, loading, error } = useActivityHeatmap(
    scope,
    entityId,
    timeframe,
    granularity,
    selectedActivityTypes
  );

  // Track component view and load time
  useEffect(() => {
    if (data && !loading) {
      const loadTime = Date.now() - componentLoadTime.current;
      
      telemetry.heatmapView({
        scope,
        entityId: entityId || 'current-user',
        timeframe,
        granularity,
        activityTypes: selectedActivityTypes,
      });
      
      telemetry.componentLoadTime('enhanced-activity-heatmap', loadTime, {
        scope,
        entityId,
        bucketCount: data.buckets.length,
        totalActivities: data.metadata.totalActivities,
      });
    }
  }, [data, loading, scope, entityId, timeframe, granularity, selectedActivityTypes, telemetry]);

  // Track errors
  useEffect(() => {
    if (error) {
      telemetry.trackError(new Error(error), {
        component: 'enhanced-activity-heatmap',
        scope,
        entityId,
        timeframe,
        granularity,
      });
    }
  }, [error, telemetry, scope, entityId, timeframe, granularity]);

  // Process data for calendar heatmap
  const processedData = useMemo(() => {
    if (!data) return { datesPerVariant: [[], [], [], []], maxActivity: 0 };

    // Group by date and sum activities
    const dateActivityMap = new Map<string, number>();
    
    data.buckets.forEach(bucket => {
      const currentCount = dateActivityMap.get(bucket.date) || 0;
      dateActivityMap.set(bucket.date, currentCount + bucket.activityCount);
    });

    const activities = Array.from(dateActivityMap.entries()).map(([date, count]) => ({
      date: new Date(date),
      weight: count,
    }));

    const maxActivity = Math.max(...activities.map(a => a.weight), 1);
    
    // Categorize into 4 intensity levels
    const datesPerVariant: Date[][] = [[], [], [], []];
    
    activities.forEach(({ date, weight }) => {
      const intensity = Math.min(Math.floor((weight / maxActivity) * 4), 3);
      datesPerVariant[intensity].push(date);
    });

    return { datesPerVariant, maxActivity, dateActivityMap };
  }, [data]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!data || !processedData.dateActivityMap) return;

    const dates = Array.from(processedData.dateActivityMap.keys()).sort();
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        setFocusedDateIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        setFocusedDateIndex(prev => Math.min(dates.length - 1, prev + 1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (dates[focusedDateIndex] && onBucketClick) {
          const bucket = data.buckets.find(b => b.date === dates[focusedDateIndex]);
          if (bucket) onBucketClick(bucket);
        }
        break;
    }
  }, [data, processedData.dateActivityMap, focusedDateIndex, onBucketClick]);

  // Handle bucket hover
  const handleBucketHover = useCallback((date: Date | null) => {
    if (!data || !date) {
      setHoveredBucket(null);
      onBucketHover?.(null);
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    const bucket = data.buckets.find(b => b.date === dateStr);
    
    if (bucket) {
      // Track bucket hover
      telemetry.heatmapBucketHover({
        scope,
        entityId: entityId || 'current-user',
        timeframe,
        granularity,
        activityTypes: selectedActivityTypes,
        bucketDate: bucket.date,
        bucketActivityCount: bucket.activityCount,
      });
    }
    
    setHoveredBucket(bucket || null);
    onBucketHover?.(bucket || null);
  }, [data, onBucketHover, telemetry, scope, entityId, timeframe, granularity, selectedActivityTypes]);

  // Activity type filter handler
  const toggleActivityType = useCallback((activityType: string) => {
    const newTypes = selectedActivityTypes.includes(activityType) 
      ? selectedActivityTypes.filter(t => t !== activityType)
      : [...selectedActivityTypes, activityType];
      
    setSelectedActivityTypes(newTypes);
    
    // Track filter change
    telemetry.heatmapFilterChange({
      scope,
      entityId: entityId || 'current-user',
      timeframe,
      granularity,
      activityTypes: newTypes,
    });
  }, [selectedActivityTypes, telemetry, scope, entityId, timeframe, granularity]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe as typeof timeframe);
    
    telemetry.heatmapFilterChange({
      scope,
      entityId: entityId || 'current-user',
      timeframe: newTimeframe,
      granularity,
      activityTypes: selectedActivityTypes,
    });
  }, [telemetry, scope, entityId, granularity, selectedActivityTypes]);

  // Handle granularity change
  const handleGranularityChange = useCallback((newGranularity: 'hour' | 'day') => {
    setGranularity(newGranularity);
    
    telemetry.heatmapFilterChange({
      scope,
      entityId: entityId || 'current-user',
      timeframe,
      granularity: newGranularity,
      activityTypes: selectedActivityTypes,
    });
  }, [telemetry, scope, entityId, timeframe, selectedActivityTypes]);

  // Loading state
  if (loading) {
    return (
      <Card className={cn("md:col-span-1", className)}>
        <CardHeader>
          <CardTitle>{t("activityheatmap")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("md:col-span-1", className)}>
        <CardHeader>
          <CardTitle>{t("activityheatmap")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-red-500">
            <p>{t("errorLoading")}</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("md:col-span-1", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("activityheatmap")}</CardTitle>
            {data && (
              <CardDescription>
                {data.metadata.totalActivities} {t("labels.activities")} {t("labels.across")} {data.metadata.uniqueStudents} {scope === 'student' ? t("labels.sessions") : t("labels.students")}
              </CardDescription>
            )}
          </div>
          
          {showFilters && (
            <div className="flex gap-2">
              <Select value={timeframe} onValueChange={handleTimeframeChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{t("timeframes.7d")}</SelectItem>
                  <SelectItem value="30d">{t("timeframes.30d")}</SelectItem>
                  <SelectItem value="90d">{t("timeframes.90d")}</SelectItem>
                  <SelectItem value="6m">{t("timeframes.6m")}</SelectItem>
                </SelectContent>
              </Select>
              
              {scope !== 'student' && (
                <Select value={granularity} onValueChange={handleGranularityChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">{t("granularity.day")}</SelectItem>
                      <SelectItem value="hour">{t("granularity.hour")}</SelectItem>
                    </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
        
        {/* Activity type filters */}
        {showFilters && data && data.metadata.availableActivityTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.metadata.availableActivityTypes.map(activityType => (
              <Badge
                key={activityType}
                variant={selectedActivityTypes.includes(activityType) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-xs",
                  selectedActivityTypes.includes(activityType) && 
                  ACTIVITY_TYPE_COLORS[activityType as keyof typeof ACTIVITY_TYPE_COLORS]
                )}
                onClick={() => toggleActivityType(activityType)}
              >
                {(
                  {
                    READING: t("activityTypes.reading"),
                    QUESTIONS: t("activityTypes.questions"),
                    FLASHCARDS: t("activityTypes.flashcards"),
                    PRACTICE: t("activityTypes.practice"),
                    ASSESSMENT: t("activityTypes.assessment"),
                    RATING: t("activityTypes.rating"),
                    OTHER: t("activityTypes.other"),
                  }[activityType as keyof typeof ACTIVITY_TYPE_COLORS] || activityType
                )}
              </Badge>
            ))}
            {selectedActivityTypes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedActivityTypes([])}
              >
                {t("clear")}
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="py-2">
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded"></div>}>
          <div
            ref={heatmapRef}
            className="flex items-center justify-center"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="application"
            aria-label={t("ariaLabel")}
          >
            <CalendarHeatmap
              variantClassnames={[
                "text-gray-400 hover:text-gray-500 bg-gray-100 hover:bg-gray-200",
                "text-white hover:text-white bg-green-300 hover:bg-green-400",
                "text-white hover:text-white bg-green-500 hover:bg-green-600",
                "text-white hover:text-white bg-green-700 hover:bg-green-800",
              ]}
              datesPerVariant={processedData.datesPerVariant}
              onDayMouseEnter={handleBucketHover}
              onDayMouseLeave={() => handleBucketHover(null)}
              onDayClick={(date) => {
                if (onBucketClick && data) {
                  const dateStr = date.toISOString().split('T')[0];
                  const bucket = data.buckets.find(b => b.date === dateStr);
                  if (bucket) {
                    // Track bucket click
                    telemetry.heatmapBucketClick({
                      scope,
                      entityId: entityId || 'current-user',
                      timeframe,
                      granularity,
                      activityTypes: selectedActivityTypes,
                      bucketDate: bucket.date,
                      bucketActivityCount: bucket.activityCount,
                    });
                    
                    onBucketClick(bucket);
                  }
                }
              }}
            />
          </div>
        </Suspense>
        
        {/* Hovered bucket info */}
        {hoveredBucket && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div className="font-medium">{new Date(hoveredBucket.date).toLocaleDateString()}</div>
            <div className="text-gray-600">
              {hoveredBucket.activityCount} {t("labels.activities")} • {hoveredBucket.completedCount} {t("labels.completed")}
              {hoveredBucket.totalDurationMinutes > 0 && (
                <> • {Math.round(hoveredBucket.totalDurationMinutes)} {t("labels.minutes")}</>
              )}
            </div>
          </div>
        )}
        
        {/* Stats */}
        {showStats && data && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900">{data.metadata.totalActivities}</div>
              <div className="text-gray-500">{t("stats.totalActivities")}</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">{processedData.maxActivity}</div>
              <div className="text-gray-500">{t("stats.peakDaily")}</div>
            </div>
          </div>
        )}
        
        {/* Intensity legend */}
        <div className="mt-4 flex items-center justify-center gap-1">
          <span className="text-xs text-gray-500 mr-2">{t("legend.less")}</span>
          {[0, 1, 2, 3].map(level => (
            <div
              key={level}
              className={cn(
                "w-3 h-3 rounded-sm",
                level === 0 && "bg-gray-100",
                level === 1 && "bg-green-300",
                level === 2 && "bg-green-500", 
                level === 3 && "bg-green-700"
              )}
            />
          ))}
          <span className="text-xs text-gray-500 ml-2">{t("legend.more")}</span>
        </div>
        
        {/* Screen reader summary */}
        <div className="sr-only">
          {t("srSummary", {
            total: data?.metadata.totalActivities,
            start: data?.metadata.dateRange.start,
            end: data?.metadata.dateRange.end,
            students: data?.metadata.uniqueStudents,
            peak: processedData.maxActivity,
          })}
        </div>
      </CardContent>
    </Card>
  );
}