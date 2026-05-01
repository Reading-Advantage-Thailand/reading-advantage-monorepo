"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp } from "lucide-react";
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

interface SidebarGoalsWidgetProps {
  userId: string;
}

export function SidebarGoalsWidget({ userId }: SidebarGoalsWidgetProps) {
  const tc = useScopedI18n("components.activeGoalsWidget") as any;
  const router = useRouter();
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetch("/api/v1/goals?status=ACTIVE", {
          cache: 'no-store',
        });
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
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            {tc("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">{tc("loading")}</div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return null; // Don't show widget if no goals
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          {tc("title")}
        </CardTitle>
        <CardDescription className="text-xs">{tc("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
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
                className="p-2 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => router.push("/student/goals")}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h4 className="font-medium text-xs line-clamp-1">{goal.title}</h4>
                  {goal.priority === "HIGH" && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1">
                      {tc("highPriority")}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-1.5" />

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">
                      {daysRemaining > 0
                        ? tc("daysLeft", { count: daysRemaining })
                        : daysRemaining === 0
                        ? tc("dueToday")
                        : tc("overdue")}
                    </span>
                    {progressPercentage >= 50 && (
                      <span className="flex items-center text-green-600">
                        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
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
