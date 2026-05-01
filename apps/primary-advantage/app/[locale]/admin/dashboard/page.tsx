import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  WeeklyActivityChart,
  ClassEngagementChart,
  ActivityMetricsChart,
  ActivitySummaryCards,
} from "@/components/dashboard/class-activity-chart";
import {
  BookOpen,
  Clock,
  GraduationCapIcon,
  TrendingUp,
  UserPenIcon,
  Users,
} from "lucide-react";
import React from "react";

export default function DashboardPage() {
  return (
    <div>
      <Header heading="Admin Dashboard" text="Admin Dashboard Description" />
      <Separator className="my-4" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <GraduationCapIcon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100</div>
            <p className="text-muted-foreground text-xs">All students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Teachers
            </CardTitle>
            <UserPenIcon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-muted-foreground text-xs">All teachers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active This Week
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-muted-foreground text-xs">
              All active this week
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 space-y-6">
        <ActivitySummaryCards />
        <WeeklyActivityChart />
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityMetricsChart />
          <ClassEngagementChart />
        </div>
      </div>
    </div>
  );
}
