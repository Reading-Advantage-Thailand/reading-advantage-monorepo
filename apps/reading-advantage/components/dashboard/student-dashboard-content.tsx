"use client";

import React from "react";
import { useScopedI18n } from "@/locales/client";
import { XPVelocityWidget } from "./student-xp-velocity";
import { ETACard } from "./student-eta-card";
import { GenreEngagementWidget } from "./student-genre-engagement";
import { SRSHealthCard } from "./student-srs-health";
import { AICoachCard } from "./student-ai-coach";
import CEFRLevels from "./user-level-indicator";
import { CompactActivityHeatmap } from "./compact-activity-heatmap";
import ActivityTimeline from "./activity-timeline";
import { ActiveGoalsWidget } from "./active-goals-widget";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDashboardTelemetry } from "@/lib/telemetry/dashboard-telemetry";
import { useDashboardMetrice } from "@/hooks/student/useDashboardMetrice"

interface StudentDashboardContentProps {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    level: number;
    cefr_level: string;
    xp: number;
  };
}

export default function StudentDashboardContent({
  userId,
  user,
}: StudentDashboardContentProps) {
  const t = useScopedI18n("pages.student.dashboard") as any;
  const router = useRouter();
  const { trackEvent } = useDashboardTelemetry();
  const { data, loading, refresh } = useDashboardMetrice(userId);

  // Track dashboard view
  React.useEffect(() => {
    trackEvent("student_dashboard.view", {
      cefrLevel: user.cefr_level,
      currentLevel: user.level,
      xp: user.xp,
    });
  }, [trackEvent, user]);

  const handlePracticeFlashcards = () => {
    router.push("/student/vocabulary");
  };

  const handleSetGoal = () => {
    router.push("/student/goals");
  };

  const handleGenreClick = (genre: string) => {
    router.push(`/student/articles?genre=${encodeURIComponent(genre)}`);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 mt-6">
      {/* Left Column - Main Widgets */}
      <div className="flex flex-col gap-4 col-span-2">
        {/* XP Velocity */}
        <XPVelocityWidget
          data={data.velocity}
          loading={loading}
          onRefresh={refresh}
        />

        {/* ETA Card - conditionally rendered */}
        <ETACard
          data={data.velocity}
          loading={loading}
          onRefresh={refresh}
        />

        {/* Genre Engagement */}
        <GenreEngagementWidget
          data={data.genres}
          loading={loading}
          onRefresh={refresh}
          onGenreClick={handleGenreClick}
        />

        {/* Activity Timeline */}
        <ActivityTimeline
          entityId={userId}
          defaultTimeframe="30d"
          showFilters
          showStats
        />
      </div>

      {/* Right Column - Side Widgets */}
      <div className="flex flex-col gap-4">
        {/* CEFR Level Indicator */}
        <CEFRLevels currentLevel={user.cefr_level} />

        {/* Active Goals Widget */}
        <ActiveGoalsWidget userId={userId} />

        {/* SRS Health Card */}
        <SRSHealthCard
          data={
            data.srsHealth?.student
              ? {
                userId: data.srsHealth.student.userId,
                healthStatus:
                  data.srsHealth.student.isOverloaded ||
                    data.srsHealth.student.hasCriticalBacklog
                    ? "critical"
                    : data.srsHealth.student.totalDueForReview > 20
                      ? "moderate"
                      : "healthy",
                metrics: {
                  totalCards: data.srsHealth.student.totalCards,
                  dueToday: data.srsHealth.student.totalDueForReview,
                  overdue: data.srsHealth.student.totalOverdue,
                  newCardsToday:
                    data.srsHealth.student.vocabulary.new +
                    data.srsHealth.student.sentences.new,
                  reviewedToday: 0,
                  avgRetentionRate:
                    data.srsHealth.student.overallMasteryPct / 100,
                },
                recommendations:
                  data.srsHealth.student.suggestedActions
                    ?.slice(0, 3)
                    .map((action: any) => ({
                      action: action.title,
                      priority: action.priority,
                      reason: action.description,
                    })) || [],
                quickActions:
                  data.srsHealth.quickActions?.map((action: any) => ({
                    label: action.title,
                    count: action.targetCount || 0,
                    action: action.type,
                  })) || [],
              }
              : null
          }
          loading={loading}
          onRefresh={refresh}
          onPracticeClick={handlePracticeFlashcards}
        />

        {/* Activity Heatmap */}
        <CompactActivityHeatmap
          entityId={userId}
          scope="student"
          timeframe="90d"
        />
      </div>
      <div className="flex flex-col gap-4 col-span-3">
        {/* AI Coach Card */}
        <AICoachCard
          insights={data.aiInsights?.insights || null}
          metrics={
            data.velocity
              ? {
                currentXp: data.velocity.currentXp,
                velocity: data.velocity.emaVelocity,
                genresRead: data.genres?.topGenres?.length || 0,
                retentionRate: data.srsHealth?.metrics?.avgRetentionRate || 0,
              }
              : undefined
          }
          loading={loading}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
