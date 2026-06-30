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
  Clock,
  GraduationCapIcon,
  UserPenIcon,
  Users,
} from "lucide-react";
import React from "react";

/**
 * Admin dashboard.
 *
 * Phase 1 of wave1_high_risk_product_failures replaces the hard-coded
 * literal metric cards with explicit "data unavailable" placeholders.
 * The cards list the metric the dashboard would eventually surface and
 * display a not-yet-wired label instead of fabricated counts. Live data
 * wiring is owned by a follow-up track that proves the multi-tenant
 * scoping on the underlying queries; do NOT reintroduce literal
 * numbers here without that proof.
 */
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
            <div
              className="text-2xl font-bold text-muted-foreground"
              data-testid="metric-total-students"
            >
              Data unavailable
            </div>
            <p className="text-muted-foreground text-xs">
              Live count wiring pending the multi-tenant scoping track.
            </p>
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
            <div
              className="text-2xl font-bold text-muted-foreground"
              data-testid="metric-total-teachers"
            >
              Data unavailable
            </div>
            <p className="text-muted-foreground text-xs">
              Live count wiring pending the multi-tenant scoping track.
            </p>
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
            <div
              className="text-2xl font-bold text-muted-foreground"
              data-testid="metric-active-this-week"
            >
              Data unavailable
            </div>
            <p className="text-muted-foreground text-xs">
              Live activity wiring pending the activity-log track.
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