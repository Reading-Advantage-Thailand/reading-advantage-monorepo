"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { GoalCard } from "./goal-card";
import { CreateGoalDialog } from "./create-goal-dialog";
import { GoalRecommendations } from "./goal-recommendations";

interface Goal {
  id: string;
  goalType: string;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: Date;
  status: string;
  priority: string;
}

interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  onTrackGoals: number;
  behindScheduleGoals: number;
  completionRate: number;
}

interface GoalsPageContentProps {
  userId: string;
  initialGoals: Goal[];
  initialSummary: GoalSummary | null;
}

export default function GoalsPageContent({
  userId,
  initialGoals,
  initialSummary,
}: GoalsPageContentProps) {
  const t = useScopedI18n("pages.student.goalsPage");
  const [goals, setGoals] = React.useState<Goal[]>(initialGoals);
  const [summary, setSummary] = React.useState<GoalSummary | null>(initialSummary);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "active" | "completed">("all");

  // Refetches goals after a mutation without a full-page loading state.
  const refreshGoals = React.useCallback(async () => {
    try {
      const [goalsRes, summaryRes] = await Promise.all([
        fetch("/api/v1/goals?includeProgress=true"),
        fetch("/api/v1/goals/summary"),
      ]);

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData.goals || []);
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData.summary);
      }
    } catch (error) {
      console.error("Error refetching goals:", error);
    }
  }, []);

  const filteredGoals = React.useMemo(() => {
    if (filter === "all") return goals;
    if (filter === "active") return goals.filter((g) => g.status === "ACTIVE");
    if (filter === "completed") return goals.filter((g) => g.status === "COMPLETED");
    return goals;
  }, [goals, filter]);

  const handleGoalCreated = () => {
    setShowCreateDialog(false);
    refreshGoals();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("totalGoals")}
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalGoals}</div>
              <p className="text-xs text-muted-foreground">
                {t("activeCount", { count: summary.activeGoals })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("onTrack")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.onTrackGoals}</div>
              <p className="text-xs text-muted-foreground">
                {t("behindSchedule", { count: summary.behindScheduleGoals })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("completionRate")}
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.completionRate.toFixed(0)}%
              </div>
              <Progress value={summary.completionRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            {t("all")}
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            {t("active")}
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            {t("completed")}
          </Button>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("newGoal")}
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("noGoalsYet")}</h3>
              <p className="text-muted-foreground text-center mb-4">
                {t("emptyStateDescription")}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createFirstGoal")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={refreshGoals}
              onDelete={refreshGoals}
            />
          ))
        )}
      </div>

      {/* Recommendations Section */}
      {goals.length > 0 && (
        <GoalRecommendations userId={userId} onCreateGoal={handleGoalCreated} />
      )}

      {/* Create Goal Dialog */}
      <CreateGoalDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleGoalCreated}
        userId={userId}
      />
    </div>
  );
}
