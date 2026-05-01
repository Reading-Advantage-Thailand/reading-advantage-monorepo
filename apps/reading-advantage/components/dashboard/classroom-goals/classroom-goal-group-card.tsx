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
  Users,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useScopedI18n } from "@/locales/client";

interface StudentProgress {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  studentImage: string | null;
  goalId: string;
  currentValue: number;
  status: string;
  completedAt: Date | null;
}

interface GroupedGoal {
  goalInfo: {
    id: string;
    goalType: string;
    title: string;
    description: string | null;
    targetValue: number;
    unit: string;
    targetDate: Date | string;
    priority: string;
    createdAt: Date | string;
  };
  students: StudentProgress[];
  totalStudents: number;
  completedCount: number;
  activeCount: number;
  averageProgress: number;
}

interface ClassroomGoalGroupCardProps {
  goal: GroupedGoal;
  classroomId: string;
  onViewDetails: () => void;
  onDelete: () => void;
}

export function ClassroomGoalGroupCard({
  goal,
  classroomId,
  onViewDetails,
  onDelete,
}: ClassroomGoalGroupCardProps) {
  const t = useScopedI18n("pages.teacher.dashboardPage.classDetail.goals.card") as any;
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const targetDate = new Date(goal.goalInfo.targetDate);
  const daysRemaining = Math.ceil(
    (targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      
      // Delete all goals for all students
      const results = await Promise.all(
        goal.students.map((student) =>
          fetch(`/api/v1/teacher/classroom/${classroomId}/goals/${student.goalId}`, {
            method: "DELETE",
          })
        )
      );

      // Check if all deletions were successful
      const allSuccess = results.every((res) => res.ok);

      if (allSuccess) {
        toast({
          title: t("toast.deleteSuccess"),
          description: t("toast.deleteSuccessDescription", { count: goal.totalStudents }),
        });
        
        // Close the confirm dialog first
        setShowDeleteConfirm(false);
        
        // Then trigger refresh
        onDelete();
      } else {
        throw new Error("Some deletions failed");
      }
    } catch (error) {
      console.error("Error deleting goals:", error);
      toast({
        title: t("toast.deleteError"),
        description: t("toast.deleteErrorDescription"),
        variant: "destructive",
      });
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
    if (goal.completedCount === goal.totalStudents) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (daysRemaining < 0) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    return <Clock className="h-5 w-5 text-blue-600" />;
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return t("priorityHigh");
      case "MEDIUM":
        return t("priorityMedium");
      case "LOW":
        return t("priorityLow");
      default:
        return priority;
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon()}
                <CardTitle className="text-base">{goal.goalInfo.title}</CardTitle>
              </div>
              <CardDescription className="text-xs line-clamp-2">
                {goal.goalInfo.description || t("noDescription")}
              </CardDescription>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t("viewDetails")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("deleteAll")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-2 mt-2">
            <Badge className={getPriorityColor(goal.goalInfo.priority)}>
              {getPriorityLabel(goal.goalInfo.priority)}
            </Badge>
            <Badge variant="outline">
              <Target className="mr-1 h-3 w-3" />
              {goal.goalInfo.targetValue} {goal.goalInfo.unit}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("stats.completed", { completed: goal.completedCount })}</span>
              <span>{goal.averageProgress.toFixed(0)}%</span>
            </div>
            <Progress value={goal.averageProgress} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{t("stats.students", { total: goal.totalStudents })}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{t("stats.active", { active: goal.activeCount })}</span>
            </div>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {daysRemaining > 0
                ? t("stats.dueIn", { days: daysRemaining })
                : daysRemaining === 0
                ? t("stats.dueToday")
                : t("stats.overdue", { days: Math.abs(daysRemaining) })}
            </span>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteAll}
        title={t("confirmDelete.title")}
        description={t("confirmDelete.description", { count: goal.totalStudents })}
        confirmText={t("confirmDelete.confirm")}
        cancelText={t("confirmDelete.cancel")}
        variant="destructive"
      />
    </>
  );
}
