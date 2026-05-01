"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  MoreVertical,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
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
  targetDate: Date | string;
  status: string;
  priority: string;
}

interface ClassroomGoalCardProps {
  goal: Goal;
  studentName: string;
  onUpdate: () => void;
  onDelete: () => void;
}

export function ClassroomGoalCard({
  goal,
  studentName,
  onUpdate,
  onDelete,
}: ClassroomGoalCardProps) {
  const [loading, setLoading] = React.useState(false);

  const progressPercentage = Math.min(
    (goal.currentValue / goal.targetValue) * 100,
    100
  );

  const targetDate = new Date(goal.targetDate);
  const daysRemaining = Math.ceil(
    (targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this goal for ${studentName}?`))
      return;

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
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = () => {
    if (goal.status === "COMPLETED") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (daysRemaining < 0) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    if (daysRemaining < 7) {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    }
    return <Target className="h-4 w-4 text-blue-600" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle className="text-base">{goal.title}</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Student: {studentName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(goal.priority)}>
              {goal.priority}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {goal.currentValue.toFixed(0)} / {goal.targetValue.toFixed(0)}{" "}
              {goal.unit}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {progressPercentage.toFixed(0)}% complete
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {daysRemaining >= 0
                ? `${daysRemaining} days left`
                : `${Math.abs(daysRemaining)} days overdue`}
            </span>
          </div>
          <Badge
            variant="outline"
            className={
              goal.status === "COMPLETED"
                ? "bg-green-50 text-green-700 border-green-200"
                : goal.status === "PAUSED"
                ? "bg-gray-50 text-gray-700 border-gray-200"
                : ""
            }
          >
            {goal.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
