import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import StudentDashboardContent from "@/components/dashboard/student-dashboard-content";
import {
  getStudentActiveGoals,
  getStudentDashboardMetrics,
} from "@/server/services/metrics/student-dashboard-service";
import {
  activeGoalsPropSchema,
  studentDashboardMetricsSchema,
} from "@/components/dashboard/student-dashboard-contract";

/**
 * Shared server view for the student dashboard and reports pages. Fetches
 * metrics and goals on the server and passes them as props.
 * @param heading The resolved page heading.
 * @returns The dashboard view for one student.
 */
export default async function StudentDashboardView({
  heading,
}: {
  heading: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  return (
    <>
      <Header heading={heading} />
      <div className="space-y-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardData
            userId={user.id}
            userRole={user.role}
            user={{
              id: user.id,
              name: user.display_name,
              email: user.email || "",
              level: user.level ?? 0,
              cefr_level: user.cefr_level,
              xp: user.xp ?? 0,
            }}
          />
        </Suspense>
      </div>
    </>
  );
}

/**
 * Loads the dashboard data and renders the client content. Suspends until
 * the data resolves so the skeleton above covers real loading time.
 * @param userId The student user id.
 * @param userRole The viewing user's role.
 * @param user The serializable user summary.
 * @returns The dashboard content with server-fetched props.
 */
async function DashboardData({
  userId,
  userRole,
  user,
}: {
  userId: string;
  userRole: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    level: number;
    cefr_level: string;
    xp: number;
  };
}) {
  const [metrics, activeGoals] = await Promise.all([
    getStudentDashboardMetrics(userId, userRole),
    getStudentActiveGoals(userId),
  ]);

  const validatedMetrics = studentDashboardMetricsSchema.parse(metrics);
  const validatedGoals = activeGoalsPropSchema.parse(activeGoals);

  return (
    <StudentDashboardContent
      userId={userId}
      user={user}
      metrics={validatedMetrics}
      goals={validatedGoals}
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
      <div className="col-span-2 space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}
