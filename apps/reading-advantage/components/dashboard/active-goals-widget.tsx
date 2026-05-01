"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, ChevronRight, Plus } from "lucide-react";
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";

interface Goal {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  targetDate: Date;
  status: string;
  priority: string;
}

interface ActiveGoalsWidgetProps {
  userId: string;
}

export function ActiveGoalsWidget({ userId }: ActiveGoalsWidgetProps) {
  const t = useScopedI18n("pages.student.dashboard.activeGoals");
  const tc = useScopedI18n("components.activeGoalsWidget") as any;
  const router = useRouter();
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetch("/api/v1/goals?status=ACTIVE");
        if (res.ok) {
          const data = await res.json();
          // Show top 3 active goals
          setGoals(data.goals?.slice(0, 3) || []);
        }
      } catch (error) {
        console.error("Error fetching goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {tc("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{tc("loading")}</div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {tc("title")}
          </CardTitle>
          <CardDescription>{tc("emptyDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => router.push("/student/goals")}
            className="w-full"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            {tc("createFirst")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {tc("title")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/student/goals")}
          >
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
          <CardDescription>{tc("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.map((goal) => {
            const progressPercentage = Math.min(
              (goal.currentValue / goal.targetValue) * 100,
              100
            );

            const daysRemaining = Math.ceil(
              (new Date(goal.targetDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={goal.id}
                className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => router.push("/student/goals")}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm">{goal.title}</h4>
                  {goal.priority === "HIGH" && (
                    <Badge variant="destructive" className="text-xs">
                      {tc("highPriority")}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {daysRemaining > 0
                        ? tc("daysLeft", { count: daysRemaining })
                        : daysRemaining === 0
                        ? tc("dueToday")
                        : tc("overdue")}
                    </span>
                    {progressPercentage >= 50 && (
                      <span className="flex items-center text-green-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {tc("onTrack")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
