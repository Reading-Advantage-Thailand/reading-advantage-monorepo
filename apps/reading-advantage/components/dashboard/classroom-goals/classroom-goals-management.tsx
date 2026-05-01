"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScopedI18n } from "@/locales/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Target } from "lucide-react";
import { ClassroomGoalGroupCard } from "./classroom-goal-group-card";
import { CreateClassroomGoalDialog } from "./create-classroom-goal-dialog";
import { StudentProgressDialog } from "./student-progress-dialog";

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

interface ClassroomGoalsManagementProps {
  classroomId: string;
  className: string;
}

export function ClassroomGoalsManagement({
  classroomId,
  className,
}: ClassroomGoalsManagementProps) {
  const tGoals = useScopedI18n(
    "pages.teacher.dashboardPage.classDetail.goals.management"
  ) as any;
  const [data, setData] = React.useState<GroupedGoal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showProgressDialog, setShowProgressDialog] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<GroupedGoal | null>(
    null
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [studentCount, setStudentCount] = React.useState(0);

  const fetchGoals = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/v1/teacher/classroom/${classroomId}/goals`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (res.ok) {
        const result = await res.json();
        setData(result.data || []);
        // Calculate total unique students
        if (result.data.length > 0) {
          setStudentCount(result.data[0].totalStudents || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching classroom goals:", error);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  React.useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleGoalCreated = () => {
    setShowCreateDialog(false);
    fetchGoals();
  };

  const handleGoalDeleted = () => {
    fetchGoals();
  };

  const handleViewDetails = (goal: GroupedGoal) => {
    setSelectedGoal(goal);
    setShowProgressDialog(true);
  };

  // Filter logic
  const filteredData = React.useMemo(() => {
    let filtered = [...data];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (goal) =>
          goal.goalInfo.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          goal.goalInfo.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      if (filterStatus === "COMPLETED") {
        filtered = filtered.filter(
          (goal) => goal.completedCount === goal.totalStudents
        );
      } else if (filterStatus === "ACTIVE") {
        filtered = filtered.filter((goal) => goal.activeCount > 0);
      }
    }

    return filtered;
  }, [data, searchQuery, filterStatus]);

  const totalGoals = data.length;
  const fullyCompletedGoals = data.filter(
    (g) => g.completedCount === g.totalStudents
  ).length;
  const activeGoals = data.filter((g) => g.activeCount > 0).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading goals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {tGoals("totalGoals")}
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGoals}</div>
              <p className="text-xs text-muted-foreground">
                For {studentCount} students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {tGoals("activeGoals")}
              </CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeGoals}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {tGoals("fullyCompleted")}
              </CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fullyCompletedGoals}</div>
              <p className="text-xs text-muted-foreground">
                {tGoals("allStudentsFinished")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tGoals("title")}</CardTitle>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {tGoals("addGoalButton")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={tGoals("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={tGoals("filterAllStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {tGoals("filterAllGoals")}
                  </SelectItem>
                  <SelectItem value="ACTIVE">
                    {tGoals("filterActive")}
                  </SelectItem>
                  <SelectItem value="COMPLETED">
                    {tGoals("filterFullyCompleted")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Goals List */}
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  {tGoals("noGoalsFound")}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {totalGoals === 0
                    ? tGoals("noGoalsDescription")
                    : tGoals("noMatchingGoals")}
                </p>
                {totalGoals === 0 && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {tGoals("createFirstGoal")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredData.map((goal) => (
                  <ClassroomGoalGroupCard
                    key={goal.goalInfo.id}
                    goal={goal}
                    classroomId={classroomId}
                    onViewDetails={() => handleViewDetails(goal)}
                    onDelete={handleGoalDeleted}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Goal Dialog */}
      <CreateClassroomGoalDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleGoalCreated}
        classroomId={classroomId}
        className={className}
      />

      {/* Student Progress Dialog */}
      <StudentProgressDialog
        open={showProgressDialog}
        onClose={() => {
          setShowProgressDialog(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
      />
    </>
  );
}
