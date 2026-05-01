"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
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

export default function GoalsPageContent({ userId }: { userId: string }) {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [summary, setSummary] = React.useState<GoalSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "active" | "completed">("all");

  const fetchGoals = React.useCallback(async () => {
    try {
      setLoading(true);
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
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const filteredGoals = React.useMemo(() => {
    if (filter === "all") return goals;
    if (filter === "active") return goals.filter((g) => g.status === "ACTIVE");
    if (filter === "completed") return goals.filter((g) => g.status === "COMPLETED");
    return goals;
  }, [goals, filter]);

  const handleGoalCreated = () => {
    setShowCreateDialog(false);
    fetchGoals();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalGoals}</div>
              <p className="text-xs text-muted-foreground">
                {summary.activeGoals} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On Track</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.onTrackGoals}</div>
              <p className="text-xs text-muted-foreground">
                {summary.behindScheduleGoals} behind schedule
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
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
            All
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Active
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Completed
          </Button>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first learning goal to start tracking your progress
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdate={fetchGoals}
              onDelete={fetchGoals}
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
