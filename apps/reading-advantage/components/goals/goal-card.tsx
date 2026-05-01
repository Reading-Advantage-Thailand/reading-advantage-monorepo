"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Calendar,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface GoalCardProps {
  goal: Goal;
  onUpdate: () => void;
  onDelete: () => void;
}

export function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const [loading, setLoading] = React.useState(false);

  const progressPercentage = Math.min(
    (goal.currentValue / goal.targetValue) * 100,
    100
  );

  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/v1/goals/${goal.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onDelete();
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "PAUSED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>{goal.title}</CardTitle>
            </div>
            {goal.description && (
              <CardDescription>{goal.description}</CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(goal.priority)}>
              {goal.priority}
            </Badge>
            <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={loading}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {goal.status === "ACTIVE" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("PAUSED")}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause Goal
                  </DropdownMenuItem>
                )}
                {goal.status === "PAUSED" && (
                  <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume Goal
                  </DropdownMenuItem>
                )}
                {goal.status === "ACTIVE" && goal.currentValue >= goal.targetValue && (
                  <DropdownMenuItem onClick={() => handleStatusChange("COMPLETED")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Complete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {goal.currentValue} / {goal.targetValue} {goal.unit}
              </span>
              <span className="text-sm text-muted-foreground">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} />
          </div>

          {/* Time Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {daysRemaining > 0
                  ? `${daysRemaining} days remaining`
                  : daysRemaining === 0
                  ? "Due today"
                  : "Overdue"}
              </span>
            </div>

            {goal.status === "COMPLETED" && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
