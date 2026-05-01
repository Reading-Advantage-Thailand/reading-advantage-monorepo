"use client";

import React, { useEffect, useState } from "react";
import { WidgetShell } from "./widget-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Users, GraduationCap } from "lucide-react";
import { useScopedI18n } from "@/locales/client";

interface AdoptionByLevel {
  level: string;
  cefrLevel: string;
  studentCount: number;
  activeCount: number;
  activeRate: number;
  averageXp: number;
}

interface AdoptionData {
  byGrade: AdoptionByLevel[];
  byCEFR: AdoptionByLevel[];
  summary: {
    totalStudents: number;
    activeStudents: number;
    overallActiveRate: number;
  };
}

interface AdoptionWidgetProps {
  licenseId?: string;
  timeframe?: string;
  onDrillDown?: (level: string, type: 'grade' | 'cefr') => void;
  className?: string;
}

export function AdoptionWidget({
  licenseId,
  timeframe = "30d",
  onDrillDown,
  className,
}: AdoptionWidgetProps) {
  const [data, setData] = useState<AdoptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grade' | 'cefr'>('cefr');
  const t = useScopedI18n("components.adoptionWidget") as any;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ timeframe });
      if (licenseId) params.append('licenseId', licenseId);

      // Fetch dashboard data to get actual user distribution
      const response = await fetch(`/api/v1/admin/dashboard?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch adoption data');
      }

      const result = await response.json();
      const userData = result.data.userData || [];
      
      // Get activity log to determine active users
      const activityLog = result.data.filteredActivityLog || [];
      
      // Calculate date range based on timeframe
      const daysAgo = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      // Get set of active user IDs
      const activeUserIds = new Set(
        activityLog
          .filter((log: any) => new Date(log.timestamp) >= startDate)
          .map((log: any) => log.userId)
      );
      
      // Group students by CEFR level
      const cefrGroups = new Map<string, { students: any[], active: number }>();
      const cefrLevels = ['A0-', 'A0', 'A0+', 'A1', 'A1+', 'A2-', 'A2', 'A2+', 'B1-', 'B1', 'B1+', 'B2-', 'B2', 'B2+', 'C1-', 'C1', 'C1+', 'C2-', 'C2'];
      
      // Initialize groups
      cefrLevels.forEach(level => {
        cefrGroups.set(level, { students: [], active: 0 });
      });
      
      // Filter students only and group by CEFR level
      const students = userData.filter((user: any) => user.role === 'STUDENT');
      
      students.forEach((student: any) => {
        const cefrLevel = student.cefr_level || 'A1';
        if (!cefrGroups.has(cefrLevel)) {
          cefrGroups.set(cefrLevel, { students: [], active: 0 });
        }
        
        const group = cefrGroups.get(cefrLevel)!;
        group.students.push(student);
        
        if (activeUserIds.has(student.id)) {
          group.active++;
        }
      });
      
      // Calculate XP averages per level
      const levelXpMap = new Map<string, number>();
      cefrGroups.forEach((group, level) => {
        if (group.students.length > 0) {
          const avgXp = group.students.reduce((sum, s) => sum + (s.xp || 0), 0) / group.students.length;
          levelXpMap.set(level, Math.round(avgXp));
        }
      });
      
      // Create CEFR adoption data (group similar levels together)
      const cefrMainLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const byCEFR: AdoptionByLevel[] = cefrMainLevels.map(mainLevel => {
        // Include variations like A1-, A1, A1+
        const relatedLevels = cefrLevels.filter(l => l.startsWith(mainLevel.charAt(0)) && l.includes(mainLevel.charAt(1)));
        
        let totalStudents = 0;
        let totalActive = 0;
        let totalXp = 0;
        let studentCount = 0;
        
        relatedLevels.forEach(level => {
          const group = cefrGroups.get(level);
          if (group) {
            totalStudents += group.students.length;
            totalActive += group.active;
            group.students.forEach(s => {
              totalXp += s.xp || 0;
              studentCount++;
            });
          }
        });
        
        const averageXp = studentCount > 0 ? Math.round(totalXp / studentCount) : 0;
        const activeRate = totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100) : 0;
        
        return {
          level: mainLevel,
          cefrLevel: mainLevel,
          studentCount: totalStudents,
          activeCount: totalActive,
          activeRate,
          averageXp,
        };
      }).filter(level => level.studentCount > 0); // Only show levels with students
      
      // Create grade-based distribution (estimate based on level)
      const gradeLevels = [
        { name: 'Grade 1-3', cefrRange: ['A0-', 'A0', 'A0+', 'A1'] },
        { name: 'Grade 4-6', cefrRange: ['A1+', 'A2-', 'A2'] },
        { name: 'Grade 7-9', cefrRange: ['A2+', 'B1-', 'B1'] },
        { name: 'Grade 10-12', cefrRange: ['B1+', 'B2-', 'B2', 'B2+', 'C1-', 'C1', 'C1+', 'C2-', 'C2'] },
      ];
      
      const byGrade: AdoptionByLevel[] = gradeLevels.map(grade => {
        let totalStudents = 0;
        let totalActive = 0;
        let totalXp = 0;
        let studentCount = 0;
        
        grade.cefrRange.forEach(level => {
          const group = cefrGroups.get(level);
          if (group) {
            totalStudents += group.students.length;
            totalActive += group.active;
            group.students.forEach(s => {
              totalXp += s.xp || 0;
              studentCount++;
            });
          }
        });
        
        const averageXp = studentCount > 0 ? Math.round(totalXp / studentCount) : 0;
        const activeRate = totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100) : 0;
        const mainCefr = grade.cefrRange[Math.floor(grade.cefrRange.length / 2)] || 'A1';
        
        return {
          level: grade.name,
          cefrLevel: mainCefr,
          studentCount: totalStudents,
          activeCount: totalActive,
          activeRate,
          averageXp,
        };
      }).filter(level => level.studentCount > 0); // Only show grades with students

      const adoptionData: AdoptionData = {
        byGrade,
        byCEFR,
        summary: {
          totalStudents: students.length,
          activeStudents: activeUserIds.size,
          overallActiveRate: students.length > 0 ? Math.round((activeUserIds.size / students.length) * 100) : 0,
        },
      };

      setData(adoptionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load adoption data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [licenseId, timeframe]);

  const currentData = viewMode === 'grade' ? data?.byGrade : data?.byCEFR;

  // Get timeframe label (localized)
  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case "7d":
        return t("timeframe.7d");
      case "90d":
        return t("timeframe.90d");
      case "30d":
      default:
        return t("timeframe.30d");
    }
  };

  return (
    <WidgetShell
      title={t("title")}
      description={t("description", { mode: t(`modes.${viewMode}`) })}
      icon={GraduationCap}
      loading={loading}
      error={error}
      isEmpty={!currentData || currentData.length === 0}
      emptyMessage={t("empty")}
      onRefresh={fetchData}
      className={className}
      headerAction={
        <div className="flex gap-1 border rounded-md p-1">
          <button
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              viewMode === 'cefr' && "bg-primary text-primary-foreground"
            )}
            onClick={() => setViewMode('cefr')}
          >
            {t("view.cefr")}
          </button>
          <button
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              viewMode === 'grade' && "bg-primary text-primary-foreground"
            )}
            onClick={() => setViewMode('grade')}
          >
            {t("view.grade")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {currentData?.map((level) => (
          <div
            key={level.level}
            className="space-y-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onDrillDown?.(level.level, viewMode)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{level.level}</span>
                <Badge variant="outline" className="text-xs">
                  {level.cefrLevel}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {level.activeCount}/{level.studentCount}
                </span>
                <span className={cn(
                  "font-semibold",
                  level.activeRate >= 80 ? "text-green-600 dark:text-green-400" :
                  level.activeRate >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400"
                )}>
                  {level.activeRate}%
                </span>
              </div>
            </div>
            <Progress value={level.activeRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("item.activeStudents", { count: level.activeCount })}</span>
              <span>{t("item.avgXp", { xp: level.averageXp.toLocaleString() })}</span>
            </div>
          </div>
        ))}
        
        {data && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("summary.title")}</span>
              <span className="text-lg font-bold text-primary">
                {data.summary.overallActiveRate}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("summary.activeInTimeframe", {
                active: data.summary.activeStudents,
                total: data.summary.totalStudents,
                timeframe: getTimeframeLabel(timeframe),
              })}
            </p>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
